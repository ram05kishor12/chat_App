import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

export default function GroupScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();

  const generateGroupId = () => {
    const timestamp = Date.now().toString(36);
    const randomNum = Math.random().toString(36).substring(2, 8);
    return `group-${timestamp}-${randomNum}`;
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUsersAndGroups = async () => {
      try {
        // Fetch users for group creation
        const usersUnsubscribe = firestore()
          .collection('users')
          .where('userId', '!=', currentUser.uid)
          .onSnapshot((querySnapshot) => {
            const usersList = [];
            querySnapshot.forEach((doc) => {
              const userData = doc.data();
              usersList.push({
                id: userData.userId,
                name: userData.name,
                email: userData.email,
              });
            });
            setUsers(usersList);
          });

        // Fetch groups and their last messages
        const groupsUnsubscribe = firestore()
          .collection('groups')
          .where('participants', 'array-contains', currentUser.uid)
          .onSnapshot((querySnapshot) => {
            const groupsList = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              lastMessage: 'No messages yet'
            }));

            Promise.all(groupsList.map(async (group) => {
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
                lastMessageTime: lastMessage?.createdAt || null
              };
            })).then(updatedGroups => {
              setGroups(updatedGroups);
            });
          });

        return () => {
          usersUnsubscribe();
          groupsUnsubscribe();
        };
      } catch (error) {
        console.error('Error fetching groups:', error);
        Alert.alert('Error', 'Failed to fetch groups.');
      }
    };

    fetchUsersAndGroups();
  }, [currentUser]);

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
          <Text className="text-xl font-bold mb-4">{t('create')}</Text>
          <TextInput
            placeholder="Group Name"
            value={newGroupName}
            onChangeText={setNewGroupName}
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
          />
          <Text className="font-bold mb-2">{t('select:')}</Text>
          <ScrollView className="max-h-60 mb-4">
            {users.map(user => (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUserSelection(user)}
                className={`flex-row items-center p-2 border-b border-gray-200 ${
                  selectedUsers.find(u => u.id === user.id) ? 'bg-blue-100' : ''
                }`}
              >
                <Text>{user.name}</Text>
                {selectedUsers.find(u => u.id === user.id) && (
                  <Icon name="checkmark" size={20} color="blue" className="ml-auto" />
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
              <Text className="text-gray-600">{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={createGroup}
              className="bg-blue-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white">{t('create')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-2">
        <TextInput
          placeholder="Search groups..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          className="border border-gray-300 rounded-lg px-4 py-2"
        />
      </View>

      <FlatList
        data={groups.filter(group => 
          group.name.toLowerCase().includes(searchTerm.toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('GroupChat', {
                groupId: item.id,
                groupName: item.name,
              })
            }
            className="flex-row items-center px-4 py-3 border-b border-gray-200"
          >
            <View className="w-10 h-10 rounded-full bg-gray-300 justify-center items-center">
              <Text className="text-lg font-bold text-white">
                {item.name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold">{item.name}</Text>
              <Text className="text-gray-500 text-sm">{item.lastMessage}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center pt-10">
            <Text className="text-gray-500 text-lg">{t('no')}</Text>
          </View>
        }
      />

      <TouchableOpacity
        onPress={() => setShowCreateGroup(true)}
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full justify-center items-center shadow-lg"
      >
        <Icon name="add" size={30} color="white" />
      </TouchableOpacity>

      {renderGroupModal()}
    </SafeAreaView>
  );
}