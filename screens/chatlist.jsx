import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

// ListItem component
const ListItem = memo(({ item, chatInfo, onPress, isGroup }) => {
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    try {
      return timestamp.toDate().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return '2m ago';
    }
  }, []);

  const messageText = useMemo(() => {
    if (isGroup) {
      if (item.lastMessageType === 'image') return '📷 Image';
      return item.lastMessage || 'No messages yet';
    } else {
      if (chatInfo?.messageType === 'image') return '📷 Image';
      return chatInfo?.lastMessage || 'Start a conversation';
    }
  }, [isGroup, item.lastMessageType, item.lastMessage, chatInfo]);

  const unreadCount = chatInfo?.unreadCount || (item.unreadCount || 0);
  const timestamp = isGroup ? item.lastMessageTime : chatInfo?.timestamp;
  const formattedTime = useMemo(() => formatTime(timestamp), [formatTime, timestamp]);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white"
    >
      <View className="relative">
        {isGroup ? (
          <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center">
            <Text className="text-lg font-bold text-indigo-600">
              {item.name.charAt(0)}
            </Text>
          </View>
        ) : (
          <Image
            source={require('../assests/jj.png')}
            className="w-12 h-12 rounded-full bg-indigo-100"
          />
        )}
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-purple-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
            <Text className="text-xs text-white">{unreadCount}</Text>
          </View>
        )}
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-base font-semibold">{item.name}</Text>
        <Text className="text-sm text-gray-500" numberOfLines={1}>
          {messageText}
        </Text>
      </View>
      <Text className="text-xs text-gray-400">{formattedTime}</Text>
    </TouchableOpacity>
  );
});

const ChatScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('messages');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [chatData, setChatData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [profileImage, setProfileImage] = useState(null);

  // Authentication effect
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setIsLoading(false);
      } else {
        navigation.replace('Login');
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const userDocRef = firestore().collection('users').doc(currentUser.uid);

    const unsubscribe = userDocRef.collection('images')
      .limit(1)
      .onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const imageData = snapshot.docs[0].data();
          setProfileImage(imageData.file);
        } else {
          setProfileImage(null);
        }
      });
  
    return () => unsubscribe();
  }, [currentUser?.uid]);
  // Users subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    const usersUnsubscribe = firestore()
      .collection('users')
      .where('userId', '!=', currentUser.uid)
      .onSnapshot({
        next: (snapshot) => {
          const usersList = snapshot.docs.map(doc => ({
            id: doc.data().userId,
            name: doc.data().name,
            email: doc.data().email,
          }));
          setUsers(usersList);
        },
        error: (error) => {
          console.error('Users subscription error:', error);
          Alert.alert('Error', 'Failed to load users');
        }
      });

    return () => usersUnsubscribe();
  }, [currentUser?.uid]);

  // Chats subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    const chatsUnsubscribe = firestore()
      .collection('chats')
      .where('users', 'array-contains', currentUser.uid)
      .onSnapshot({
        next: async (chatSnapshot) => {
          const updates = {};
          const promises = chatSnapshot.docs.map(async (doc) => {
            const chatData = doc.data();
            const otherUserId = chatData.users.find(id => id !== currentUser.uid);

            const lastMessageQuery = await firestore()
              .collection('chats')
              .doc(doc.id)
              .collection('messages')
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get();

            if (!lastMessageQuery.empty) {
              const lastMessage = lastMessageQuery.docs[0].data();
              updates[otherUserId] = {
                chatId: doc.id,
                lastMessage: lastMessage.text,
                messageType: lastMessage.type || 'text',
                timestamp: lastMessage.createdAt,
                unreadCount: chatData.unreadCount?.[currentUser.uid] || 0
              };
            }
          });

          await Promise.all(promises);
          setChatData(prev => ({ ...prev, ...updates }));
        },
        error: (error) => {
          console.error('Chats subscription error:', error);
          Alert.alert('Error', 'Failed to load chats');
        }
      });

    return () => chatsUnsubscribe();
  }, [currentUser?.uid]);

  // Groups subscription
  useEffect(() => {
    if (!currentUser?.uid) return;

    const groupsUnsubscribe = firestore()
      .collection('groups')
      .where('participants', 'array-contains', currentUser.uid)
      .onSnapshot({
        next: async (querySnapshot) => {
          const groupsPromises = querySnapshot.docs.map(async (doc) => {
            const groupData = doc.data();
            
            const lastMessageSnap = await firestore()
              .collection('groups')
              .doc(doc.id)
              .collection('messages')
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get();

            const lastMessage = lastMessageSnap.docs[0]?.data();
            return {
              id: doc.id,
              ...groupData,
              lastMessage: lastMessage?.text || 'No messages yet',
              lastMessageType: lastMessage?.type || 'text',
              lastMessageTime: lastMessage?.createdAt || groupData.createdAt,
              unreadCount: groupData.unreadCount?.[currentUser.uid] || 0
            };
          });

          const groupsList = await Promise.all(groupsPromises);
          setGroups(groupsList);
        },
        error: (error) => {
          console.error('Groups subscription error:', error);
          Alert.alert('Error', 'Failed to load groups');
        }
      });

    return () => groupsUnsubscribe();
  }, [currentUser?.uid]);

  // Filtering effect
  useEffect(() => {
    const items = activeTab === 'messages' ? users : groups;
    if (!searchTerm.trim()) {
      setFilteredItems(items);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchLower)
      );
      setFilteredItems(filtered);
    }
  }, [activeTab, users, groups, searchTerm]);

  const handleSearch = useCallback((text) => {
    setSearchTerm(text);
  }, []);

  const handleItemPress = useCallback((item) => {
    if (activeTab === 'messages') {
      navigation.navigate('chat', {
        user: {
          id: item.id,
          name: item.name,
        },
        chatId: chatData[item.id]?.chatId
      });
    } else {
      navigation.navigate('GroupChat', {
        groupId: item.id,
        groupName: item.name,
      });
    }
  }, [activeTab, chatData, navigation]);

  const createGroup = useCallback(async () => {
    if (!newGroupName.trim() || selectedUsers.length === 0) {
      Alert.alert('Error', 'Please enter group name and select members');
      return;
    }

    try {
      const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const groupData = {
        id: groupId,
        name: newGroupName.trim(),
        createdBy: currentUser.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        participants: [...selectedUsers.map(user => user.id), currentUser.uid],
        admins: [currentUser.uid],
        lastMessage: 'Group created',
        lastMessageType: 'text',
        lastMessageTime: firestore.FieldValue.serverTimestamp()
      };

      await firestore().collection('groups').doc(groupId).set(groupData);

      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedUsers([]);

      navigation.navigate('GroupChat', {
        groupId,
        groupName: newGroupName.trim()
      });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    }
  }, [currentUser?.uid, navigation, newGroupName, selectedUsers]);

  const toggleUserSelection = useCallback((user) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  }, []);

  const renderCreateGroupModal = () => (
    <Modal
      visible={showCreateGroup}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateGroup(false)}
    >
      <View className="flex-1 bg-black/50 justify-center">
        <View className="bg-white mx-4 rounded-lg p-4">
          <Text className="text-xl font-bold mb-4">{t('Create New Group')}</Text>
          
          <TextInput
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder={t('Enter group name')}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
          />
          
          <ScrollView className="max-h-60 mb-4">
            {users.map(user => (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUserSelection(user)}
                className="flex-row items-center py-2"
              >
                <View className="w-6 h-6 border-2 border-purple-500 rounded-full mr-2 items-center justify-center">
                  {selectedUsers.find(u => u.id === user.id) && (
                    <View className="w-4 h-4 bg-purple-500 rounded-full" />
                  )}
                </View>
                <Text>{user.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View className="flex-row justify-end space-x-2">
            <TouchableOpacity
              onPress={() => setShowCreateGroup(false)}
              className="px-4 py-2 rounded-lg bg-gray-200"
            >
              <Text>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={createGroup}
              className="px-4 py-2 rounded-lg bg-purple-500"
            >
              <Text className="text-white">{t('Create')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>{t('Loading...')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-purple-600">
        <Text className="text-2xl font-bold text-white">{t('Chats')}</Text>
        {activeTab === 'groups' && (
          <TouchableOpacity
            onPress={() => setShowCreateGroup(true)}
            className="p-2"
          >
            <Icon name="add-circle-outline" size={24} color="#6B46C1" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View className="px-4 py-2 bg-purple-600">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Icon name="search-outline" size={20} color="#666" />
          <TextInput
            value={searchTerm}
            onChangeText={handleSearch}
            placeholder={t('Search')}
            className="flex-1 ml-2"
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 bg-purple-600">
        <TouchableOpacity
          onPress={() => setActiveTab('messages')}
          className={`flex-1 py-3 ${
            activeTab === 'messages' ? 'border-b-2 border-white' : ''
          }`}
        >
          <Text
            className={`text-center ${
              activeTab === 'messages' ? 'text-white font-bold' : 'text-gray-50'
            }`}
          >
            {t('Messages')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('groups')}
          className={`flex-1 py-3 ${
            activeTab === 'groups' ? 'border-b-2 border-white' : ''
          }`}
        >
          <Text
            className={`text-center ${
              activeTab === 'groups' ? 'text-white bold' : 'text-gray-50'
            }`}
          >
            {t('Groups')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ListItem
            item={item}
            chatInfo={activeTab === 'messages' ? chatData[item.id] : null}
            onPress={() => handleItemPress(item)}
            isGroup={activeTab === 'groups'}
          />
        )}
        ItemSeparatorComponent={() => (
          <View className="h-[1px] bg-gray-200" />
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center py-8">
            <Icon
              name={activeTab === 'messages' ? 'chatbubbles-outline' : 'people-outline'}
              size={48}
              color="#9CA3AF"
            />
            <Text className="text-gray-500 mt-2">
              {searchTerm
                ? t('No results found')
                : t(activeTab === 'messages' ? 'No messages yet' : 'No groups yet')}
            </Text>
          </View>
        )}
        refreshing={isLoading}
        onRefresh={() => {
          setIsLoading(true);
          // Refresh logic here - the subscriptions will automatically update
          setTimeout(() => setIsLoading(false), 1000);
        }}
      />

      {/* Create Group Modal */}
      {renderCreateGroupModal()}
    </SafeAreaView>
  );
};

export default ChatScreen;