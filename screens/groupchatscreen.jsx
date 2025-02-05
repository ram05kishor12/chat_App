import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const formatMessageTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatMessageDate = (date) => {
  if (!date) return '';
  const now = new Date();
  const messageDate = date;

  if (messageDate.toDateString() === now.toDateString()) return 'Today';
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.toDateString() === date2.toDateString();
};

const GroupChatScreen = ({ navigation, route }) => {
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const flatListRef = useRef(null);

  // Authentication Effect
  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigation.replace('Login');
      }
    });

    return unsubscribeAuth;
  }, []);

  // Group and Messages Effect
  useEffect(() => {
    if (!currentUser || !groupId) return;

    const unsubscribeGroup = firestore()
      .collection('groups')
      .doc(groupId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          setGroupData(data);
          setParticipants(data.participants || []);
          setIsAdmin(data.admins?.includes(currentUser.uid) || false);
          // Simulate online users (you can implement real online status tracking)
          setOnlineUsers(Math.floor(Math.random() * (data.participants?.length || 0)));
          setLoading(false);
        } else {
          Alert.alert('Error', 'Group not found');
          navigation.goBack();
        }
      });

    const unsubscribeMessages = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (querySnapshot) => {
          const messageList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }));
          setMessages(messageList.reverse());
        },
        (error) => {
          console.error('Messages listener error:', error);
          Alert.alert('Error', 'Failed to load messages');
        }
      );

    return () => {
      unsubscribeGroup();
      unsubscribeMessages();
    };
  }, [currentUser, groupId]);

  const sendMessage = async () => {
    if (!text.trim() || !groupId) return;

    try {
      const messageData = {
        text: text.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0],
        createdAt: firestore.FieldValue.serverTimestamp(),
        readBy: [currentUser.uid],
      };

      await firestore()
        .collection('groups')
        .doc(groupId)
        .collection('messages')
        .add(messageData);

      await firestore()
        .collection('groups')
        .doc(groupId)
        .update({
          lastMessage: text.trim(),
          lastMessageTime: firestore.FieldValue.serverTimestamp(),
        });

      setText('');
      scrollToBottom();
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };

  const renderMessage = ({ item, index }) => {
    const isCurrentUser = item.senderId === currentUser?.uid;
    const showDateHeader = index === 0 || !isSameDay(messages[index - 1]?.createdAt, item.createdAt);
  
    return (
      <View>
        {showDateHeader && (
          <View className="items-center my-2">
            <Text className="text-xs text-gray-400">
              {formatMessageDate(item.createdAt)}
            </Text>
          </View>
        )}
        <View className={`flex-row mb-3 px-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
          {!isCurrentUser && (
            <View className="mr-2">
              <View className="w-8 h-8 rounded-full bg-gray-300 justify-center items-center">
                <Text className="text-white font-bold">
                  {item.senderName?.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          <View className={`max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
            {/* {!isCurrentUser && (
              <Text className="text-xs text-gray-500 mb-1 ml-1">
                {item.senderName}
              </Text>
            )} */}
            <View
              className={`px-4 py-2 rounded-3xl ${
                isCurrentUser
                  ? 'bg-purple-600 rounded-br-sm'
                  : 'bg-gray-100 rounded-bl-sm'
              }`}
            >
              <Text
                className={`text-[15px] ${
                  isCurrentUser ? 'text-white' : 'text-gray-800'
                }`}
              >
                {item.text}
              </Text>
            </View>
            <Text className="text-xs text-gray-400 mt-1">
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Icon name="chevron-back" size={24} color="#666" />
        </TouchableOpacity>
        
        <View className="flex-row items-center flex-1">
          <View className="relative">
            <View className="w-10 h-10 rounded-full bg-purple-600 justify-center items-center">
              <Text className="text-white text-lg font-bold">
                {groupName.charAt(0)}
              </Text>
            </View>
            <View className="absolute right-0 bottom-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold">{groupName}</Text>
            <Text className="text-sm text-gray-500">
              {participants.length} members, {onlineUsers} online
            </Text>
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity 
            onPress={() => {}}
            className="ml-2"
          >
            <Icon name="settings-outline" size={22} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 10 }}
        onContentSizeChange={() => scrollToBottom(true)}
        onLayout={() => scrollToBottom(false)}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-10">
            <Text className="text-gray-400 text-base">No messages yet</Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="px-4 py-2 border-t border-gray-100 bg-white">
          <View className="flex-row items-end bg-gray-100 rounded-full px-4 py-2">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              multiline
              className="flex-1 max-h-32 text-base pb-1 pt-1"
              style={{ lineHeight: 20 }}
            />
            
            {text.trim().length > 0 ? (
              <TouchableOpacity onPress={sendMessage} className="ml-2">
                <Icon name="send" size={24} color="#7c3aed" />
              </TouchableOpacity>
            ) : (
              <View className="flex-row">
                <TouchableOpacity className="ml-2">
                  <Icon name="mic" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity className="ml-2">
                  <Icon name="happy" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GroupChatScreen;