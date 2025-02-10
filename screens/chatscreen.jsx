import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  ActivityIndicator,
  Share,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';
import Geolocation from 'react-native-geolocation-service';

// Date Formatting Utilities
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

const ChatScreen = ({ route, navigation }) => {
  // State Management
  const { user, chatId: existingChatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatId, setChatId] = useState(existingChatId);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const flatListRef = useRef(null);
  const [modalState, setModalState] = useState({
    visible: false,
    loading: false,
    content: null,
    error: null,
    imageInfo: null
  });

  // Check location permission on component mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Authentication Effect
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        if (!chatId) {
          setChatId([user.uid, route.params.user.id].sort().join('_'));
        }
      } else {
        navigation.replace('Login');
      }
    });

    return unsubscribe;
  }, []);

  // Chat Setup Effect
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const setupChat = async () => {
      try {
        setIsLoading(true);

        const chatData = {
          users: [currentUser.uid, user.id],
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        await firestore()
          .collection('chats')
          .doc(chatId)
          .set(chatData, { merge: true });

        const unsubscribe = firestore()
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .orderBy('createdAt', 'desc')
          .onSnapshot(
            (querySnapshot) => {
              const messageList = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
              }));
              setMessages(messageList.reverse());
              setIsLoading(false);
            },
            (error) => {
              console.error('Messages listener error:', error);
              Alert.alert('Error', 'Failed to load messages');
              setIsLoading(false);
            }
          );

        return () => unsubscribe();
      } catch (error) {
        console.error('Chat setup error:', error);
        Alert.alert('Error', 'Failed to setup chat');
        setIsLoading(false);
      }
    };

    setupChat();
  }, [chatId, currentUser]);

  const checkLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        setLocationPermissionGranted(status === 'granted');
        return;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        setLocationPermissionGranted(granted);
      }
    } catch (err) {
      console.warn('Error checking location permission:', err);
    }
  };

  // Location Permission Handler
  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        const granted = status === 'granted';
        setLocationPermissionGranted(granted);
        return granted;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to share it in chat.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermissionGranted(isGranted);
        return isGranted;
      }
      return false;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  };

  // Location Sharing Handler
  const handleLocationShare = async () => {
    if (!locationPermissionGranted) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to share your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }

    setIsLoading(true);
    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const locationData = {
            type: 'location',
            sender: currentUser.uid,
            latitude,
            longitude,
            createdAt: firestore.FieldValue.serverTimestamp(),
          };

          await firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .add(locationData);

          await firestore()
            .collection('chats')
            .doc(chatId)
            .update({
              lastMessage: '📍 Location shared',
              updatedAt: firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
          console.error('Error sending location:', error);
          Alert.alert('Error', 'Failed to send location');
        } finally {
          setIsLoading(false);
          scrollToBottom();
        }
      },
      (error) => {
        setIsLoading(false);
        console.error('Geolocation error:', error);
        Alert.alert('Error', 'Failed to get location: ' + error.message);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 10000,
        distanceFilter: 10
      }
    );
  };

  // Message Handlers
  const sendMessage = async () => {
    if (!text.trim() || !chatId) return;

    try {
      const messageData = {
        text: text.trim(),
        sender: currentUser.uid,
        type: 'text',
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(messageData);

      await firestore()
        .collection('chats')
        .doc(chatId)
        .update({
          lastMessage: text.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });

      setText('');
      Keyboard.dismiss();
      scrollToBottom();
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // File Upload Handler
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
      });

      const file = result[0];
      if (!file) return;

      setModalState(prev => ({ ...prev, loading: true }));

      const base64Content = await RNFS.readFile(file.uri, 'base64');
      const imageData = `data:${file.type};base64,${base64Content}`;

      const approximateSize = (base64Content.length * 3) / 4 / (1024 * 1024);
      if (approximateSize > 5) {
        Alert.alert('Error', 'Please select an image under 5MB');
        return;
      }

      await sendFileMessage({
        fileName: file.name,
        fileType: file.type,
        base64Data: imageData,
      });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to upload file');
      }
    } finally {
      setModalState(prev => ({ ...prev, loading: false }));
    }
  };

  // File Message Handler
  const sendFileMessage = async (fileInfo) => {
    if (!chatId) return;

    try {
      const messageData = {
        type: 'image',
        sender: currentUser.uid,
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        imageData: fileInfo.base64Data,
        createdAt: firestore.FieldValue.serverTimestamp()
      };

      await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(messageData);

      await firestore()
        .collection('chats')
        .doc(chatId)
        .update({
          lastMessage: '📷 Image',
          updatedAt: firestore.FieldValue.serverTimestamp()
        });

      scrollToBottom();
    } catch (error) {
      Alert.alert('Error', 'Failed to send image');
    }
  };

  // Image Handling Functions
  const handleShareImage = async () => {
    try {
      if (!modalState.content) return;

      await Share.share({
        url: modalState.content,
        message: 'Check out this image!',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share image');
    }
  };

  const handleSaveImage = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied');
          return;
        }
      }

      // Save image logic here
      Alert.alert('Success', 'Image saved to gallery');
    } catch (error) {
      Alert.alert('Error', 'Failed to save image');
    }
  };

  // UI Helpers
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };

  // Message Renderer
  const renderMessage = ({ item, index }) => {
    const isCurrentUser = item.sender === currentUser?.uid;
    const showDateHeader =
      index === 0 || !isSameDay(messages[index - 1]?.createdAt, item.createdAt);

    const handleLocationPress = (locationData) => {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${locationData.latitude},${locationData.longitude}`;
      const label = 'Shared Location';
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });

      Linking.openURL(url);
    };

    return (
      <View>
        {showDateHeader && (
          <View className="items-center my-2">
            <Text className="text-xs text-gray-400">
              {formatMessageDate(item.createdAt)}
            </Text>
          </View>
        )}

        <View className={`flex-row items-end mb-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
          <View className="max-w-[75%]">
            <View
              className={`p-3 rounded-2xl ${
                isCurrentUser
                  ? "bg-purple-600 rounded-br-sm ml-2"
                  : "bg-gray-100 rounded-bl-sm mr-2"
              }`}
            >
              {item.type === "location" ? (
                <TouchableOpacity
                  onPress={() => handleLocationPress(item)}
                  className="flex-row items-center"
                >
                  <Icon name="location" size={24} color={isCurrentUser ? "white" : "#666"} />
                  <Text
                    className={`ml-2 ${isCurrentUser ? "text-white" : "text-gray-800"}`}
                  >
                    View Location
                  </Text>
                </TouchableOpacity>
              ) : item.type === "image" ? (
                <TouchableOpacity
                  onPress={() =>
                    setModalState({
                      visible: true,
                      content: item.imageData,
                      loading: false,
                    })
                  }
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: item.imageData }}
                    className="w-48 h-48 rounded-xl"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <Text className={`text-[15px] ${isCurrentUser ? "text-white" : "text-gray-800"}`}>
                  {item.text}
                </Text>
              )}
            </View>

            <Text className="text-xs text-gray-400 mt-1 self-end">
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  // Main Render
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Icon name="chevron-back" size={24} color="#666" />
        </TouchableOpacity>

        <View className="flex-row items-center flex-1">
          <View className="relative">
            <Image
              source={require('../assests/jj.png')}
              className="w-10 h-10 rounded-full"
            />
            <View className="absolute right-0 bottom-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold">{user.name}</Text>
            <Text className="text-sm text-gray-500">online</Text>
          </View>
        </View>

        <TouchableOpacity className="mx-2">
          <Icon name="call" size={22} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity className="ml-2">
          <Icon name="videocam" size={22} color="#666" />
        </TouchableOpacity>
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

      {/* Image Modal */}
      <Modal
        visible={modalState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalState({ visible: false })}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <TouchableOpacity
            onPress={() => setModalState({ visible: false })}
            className="absolute top-10 right-5 z-10"
          >
            <Icon name="close" size={28} color="white" />
          </TouchableOpacity>

          {modalState.loading ? (
            <ActivityIndicator size="large" color="white" />
          ) : modalState.error ? (
            <Text className="text-white">{modalState.error}</Text>
          ) : (
            <View className="w-full items-center">
              <Image
                source={{ uri: modalState.content }}
                className="w-full h-2/3"
                resizeMode="contain"
              />
              <View className="flex-row mt-4">
                <TouchableOpacity
                  onPress={handleSaveImage}
                  className="mx-2 bg-white/20 px-4 py-2 rounded-full"
                >
                  <Text className="text-white">Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShareImage}
                  className="mx-2 bg-white/20 px-4 py-2 rounded-full"
                >
                  <Text className="text-white">Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="px-4 py-2 border-t border-gray-100 bg-white">
          <View className="flex-row items-end bg-gray-100 rounded-full px-4 py-2">
            <TouchableOpacity onPress={handleFileUpload} className="mr-3">
              <Icon name="image" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLocationShare} className="mr-3">
              <Icon name="location" size={24} color="#666" />
            </TouchableOpacity>
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

export default ChatScreen;