// MessagingScreen.js
import React, { useEffect, useState, useCallback, memo } from 'react';
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

// Chat/Group List Item Component
const ListItem = memo(({ item, chatInfo, onPress, isGroup }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    try {
      return timestamp.toDate().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return '2m ago';
    }
  };

  const unreadCount = chatInfo?.unreadCount || (item.unreadCount || 0);
  const lastMessage = isGroup ? item.lastMessage : (chatInfo?.lastMessage || 'Start a conversation');
  const timestamp = isGroup ? item.lastMessageTime : chatInfo?.timestamp;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-3"
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
          {lastMessage}
        </Text>
      </View>
      <Text className="text-xs text-gray-400">
        {formatTime(timestamp)}
      </Text>
    </TouchableOpacity>
  );
});

export default function MessagingScreen({ navigation }) {
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

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let usersUnsubscribe;
    let chatsUnsubscribe;
    let groupsUnsubscribe;

    const setupSubscriptions = async () => {
      try {
        // Fetch users
        usersUnsubscribe = firestore()
          .collection('users')
          .where('userId', '!=', currentUser.uid)
          .onSnapshot((querySnapshot) => {
            const usersList = querySnapshot.docs.map(doc => {
              const userData = doc.data();
              return {
                id: userData.userId,
                name: userData.name,
                email: userData.email,
              };
            });
            setUsers(usersList);
            updateFilteredItems(usersList, groups, searchTerm);
          });

        // Fetch chats
        chatsUnsubscribe = firestore()
          .collection('chats')
          .where('users', 'array-contains', currentUser.uid)
          .onSnapshot((chatSnapshot) => {
            const chatUpdates = {};
            
            chatSnapshot.docChanges().forEach(async change => {
              const chatDoc = change.doc;
              const chatData = chatDoc.data();
              const otherUserId = chatData.users.find(id => id !== currentUser.uid);

              if (change.type === 'removed') {
                delete chatUpdates[otherUserId];
                return;
              }

              const lastMessageQuery = await firestore()
                .collection('chats')
                .doc(chatDoc.id)
                .collection('messages')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

              if (!lastMessageQuery.empty) {
                const lastMessage = lastMessageQuery.docs[0].data();
                chatUpdates[otherUserId] = {
                  chatId: chatDoc.id,
                  lastMessage: lastMessage.text,
                  timestamp: lastMessage.createdAt,
                  unreadCount: chatData.unreadCount?.[currentUser.uid] || 0
                };
              }

              setChatData(prev => ({
                ...prev,
                ...chatUpdates
              }));
            });
          });

        // Fetch groups
        groupsUnsubscribe = firestore()
          .collection('groups')
          .where('participants', 'array-contains', currentUser.uid)
          .onSnapshot(async (querySnapshot) => {
            const groupsList = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              lastMessage: 'No messages yet'
            }));

            const updatedGroups = await Promise.all(groupsList.map(async (group) => {
              const lastMessageSnap = await firestore()
                .collection('groups')
                .doc(group.id)
                .collection('messages')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

              const lastMessage = lastMessageSnap.docs[0]?.data();
              return {
                ...group,
                lastMessage: lastMessage?.text || 'No messages yet',
                lastMessageTime: lastMessage?.createdAt || null,
                unreadCount: group.unreadCount?.[currentUser.uid] || 0
              };
            }));

            setGroups(updatedGroups);
            updateFilteredItems(users, updatedGroups, searchTerm);
          });

      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        Alert.alert('Error', 'Failed to load messages.');
      }
    };

    setupSubscriptions();

    return () => {
      if (usersUnsubscribe) usersUnsubscribe();
      if (chatsUnsubscribe) chatsUnsubscribe();
      if (groupsUnsubscribe) groupsUnsubscribe();
    };
  }, [currentUser]);

  const updateFilteredItems = useCallback((usersList, groupsList, search) => {
    const items = activeTab === 'messages' ? usersList : groupsList;
    if (!search) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter((item) =>
        item.name?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [activeTab]);

  useEffect(() => {
    updateFilteredItems(users, groups, searchTerm);
  }, [activeTab, searchTerm, updateFilteredItems]);

  const handleSearch = (text) => {
    setSearchTerm(text);
  };

  const handleItemPress = useCallback((item) => {
    if (activeTab === 'messages') {
      navigation.navigate('chat', {
        user: {
          id: item.id,
          name: item.name,
        },
        chatId: chatData[item.id]?.chatId,
      });
    } else {
      navigation.navigate('GroupChat', {
        groupId: item.id,
        groupName: item.name,
      });
    }
  }, [activeTab, chatData, navigation]);

  const generateGroupId = () => {
    const timestamp = Date.now().toString(36);
    const randomNum = Math.random().toString(36).substring(2, 8);
    return `group-${timestamp}-${randomNum}`;
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedUsers.length === 0) {
      Alert.alert('Error', 'Please enter group name and select members');
      return;
    }

    try {
      const groupId = generateGroupId();
      await AsyncStorage.setItem('lastGroupId', groupId);

      const groupData = {
        id: groupId,
        name: newGroupName.trim(),
        createdBy: currentUser.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        participants: [...selectedUsers.map(user => user.id), currentUser.uid],
        admins: [currentUser.uid],
      };

      await firestore()
        .collection('groups')
        .doc(groupId)
        .set(groupData);

      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedUsers([]);

      navigation.navigate('GroupChat', {
        groupId: groupId,
        groupName: newGroupName.trim()
      });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const renderGroupModal = () => (
    <Modal
      visible={showCreateGroup}
      animationType="slide"
      transparent={true}
    >
      <View className="flex-1 bg-black/50 justify-center">
        <View className="bg-white m-5 p-5 rounded-lg">
          <Text className="text-xl font-bold mb-4">Create New Group</Text>
          <TextInput
            placeholder="Group Name"
            value={newGroupName}
            onChangeText={setNewGroupName}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
          />
          <Text className="font-bold mb-2">Select Members:</Text>
          <ScrollView className="max-h-60 mb-4">
            {users.map(user => (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUserSelection(user)}
                className={`flex-row items-center p-2 border-b border-gray-200 ${
                  selectedUsers.find(u => u.id === user.id) ? 'bg-purple-100' : ''
                }`}
              >
                <Text>{user.name}</Text>
                {selectedUsers.find(u => u.id === user.id) && (
                  <Icon name="checkmark" size={20} color="purple" className="ml-auto" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View className="flex-row justify-end">
            <TouchableOpacity
              onPress={() => {
                setShowCreateGroup(false);
                setNewGroupName('');
                setSelectedUsers([]);
              }}
              className="px-4 py-2 mr-2"
            >
              <Text className="text-gray-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={createGroup}
              className="bg-purple-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white">Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-lg text-gray-600">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="bg-purple-600">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-6">
          <Text className="text-2xl font-bold text-white">Messages</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Icon name="ellipsis-vertical" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-4 pb-3 py-1">
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-1">
            <Icon name="search" size={20} color="#666" />
            <TextInput
              placeholder="Search..."
              value={searchTerm}
              onChangeText={handleSearch}
              className="flex-1 ml-2 text-base"
              placeholderTextColor={'#666'}
            />
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row px-4">
          <TouchableOpacity
            onPress={() => setActiveTab('messages')}
            className={`flex-1 items-center py-2 border-b-2 ${
              activeTab === 'messages' ? 'border-white' : 'border-transparent'
            }`}
          >
            <Text className={`text-white ${
              activeTab === 'messages' ? 'font-bold' : ''
            }`}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('groups')}
            className={`flex-1 items-center py-2 border-b-2 ${
              activeTab === 'groups' ? 'border-white' : 'border-transparent'
            }`}
          >
            <Text className={`text-white ${
              activeTab === 'groups' ? 'font-bold' : ''
            }`}>Story</Text>
          </TouchableOpacity>
        </View>
      </View>

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
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center pt-10">
            <Text className="text-gray-500 text-lg">
              {activeTab === 'messages'
                ? 'No messages yet'
                : 'No groups yet'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
              onPress={() => setShowCreateGroup(true)}
              className="absolute bottom-6 right-6 bg-purple-600 w-14 h-14 rounded-full justify-center items-center shadow-lg"
            >
              <Icon name="add" size={30} color="white" />
            </TouchableOpacity>

      {renderGroupModal()}
    </SafeAreaView>
  );
}

// Create a separate styles file: styles.js
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  shadowLight: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});