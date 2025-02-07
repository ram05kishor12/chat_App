import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DocumentPicker from 'react-native-document-picker';
import { logger } from 'react-native-logs';
import RNFS from 'react-native-fs';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const Profile = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    userId: '',
    phone: '',
    bio: '',
    location: '',
    joinDate: new Date().toISOString()
  });
  const [tempName, setTempName] = useState('');
  
  const { t } = useTranslation();
  const log = logger.createLogger();
  const user = auth().currentUser;
  const navigation = useNavigation();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      if (userDoc.exists) {
        const data = {
          name: userDoc.data().name,
          email: userDoc.data().email,
          userId: user.uid,
          phone: userDoc.data().phone || '',
          bio: userDoc.data().bio || '',
          location: userDoc.data().location || '',
          joinDate: userDoc.data().joinDate || new Date().toISOString()
        };
        setUserData(data);
        setTempName(data.name);
        
        // Fetch the most recent image from the images collection
        const imagesSnapshot = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('images')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (!imagesSnapshot.empty) {
          const mostRecentImage = imagesSnapshot.docs[0].data();
          setImage({ uri: mostRecentImage.file });
        } else if (userDoc.data().image) {
          // Fallback to legacy image field if it exists
          setImage({ uri: userDoc.data().image });
        }
      }
    } catch (error) {
      console.log('Error loading user data:', error);
      log.info('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  async function handleImage() {
    try {
      setLoading(true);
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
      });
      log.info('res', res);
      setImage(res[0]);
      const file = res[0];
      const base64 = await RNFS.readFile(file.uri, 'base64');
      const imagedata = `data:${file.type};base64,${base64}`;
      await sendFile({
        file: imagedata,
        filename: file.name,
        type: file.type,
      });
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.log('Error picking image:', error);
        log.info('Error picking image:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendFile(file) {
    try {
      const messageData = {
        type: 'image',
        file: file.file,
        filename: file.filename,
        contentType: file.type,
        timestamp: firestore.FieldValue.serverTimestamp()
      };
      
      // Add the new image to the images collection
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('images')
        .add(messageData);

      // Update the main user document with the latest image
      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({
          image: file.file
        });

      // Set the image in the UI
      setImage({ uri: file.file });
      
      log.info('Image sent and profile updated');
    } catch (error) {
      console.log('Error sending image', error);
      log.info('Error sending image', error);
      Alert.alert(
        t('error'),
        t('errorUploadingImage'),
        [{ text: t('ok') }]
      );
    }
  }

  const handleSaveName = async () => {
    try {
      if (tempName.trim() === '') return;
      setLoading(true);
      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({
          name: tempName.trim(),
        });
      setUserData(prev => ({ ...prev, name: tempName.trim() }));
      setIsEditingName(false);
    } catch (error) {
      console.log('Error updating name:', error);
      log.info('Error updating name:', error);
      Alert.alert(
        t('error'),
        t('errorUpdatingName'),
        [{ text: t('ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('logout'),
      t('areYouSureLogout'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }]
              });
            } catch (error) {
              console.log('Error logging out:', error);
              Alert.alert(
                t('error'),
                t('errorLoggingOut'),
                [{ text: t('ok') }]
              );
            }
          }
        }
      ]
    );
  };

  const handleEditField = async (field, value) => {
    try {
      if (!value.trim()) return;
      setLoading(true);
      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({
          [field]: value.trim(),
        });
      setUserData(prev => ({ ...prev, [field]: value.trim() }));
    } catch (error) {
      console.log(`Error updating ${field}:`, error);
      log.info(`Error updating ${field}:`, error);
      Alert.alert(
        t('error'),
        t('errorUpdatingField'),
        [{ text: t('ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const ProfileSection = ({ title, icon, children }) => (
    <View className="mb-2 bg-white">
      <View className="px-4 py-2">
        <View className="flex-row items-center">
          <Icon name={icon} size={18} color="#6b21a8" />
          <Text className="ml-2 text-sm font-medium text-purple-700">{title}</Text>
        </View>
      </View>
      {children}
    </View>
  );

  const ProfileItem = ({ icon, label, value, onPress, showEdit = false, editable = false }) => (
    <Pressable 
      onPress={editable ? onPress : null}
      className="flex-row items-center px-4 py-3 bg-white"
    >
      <Icon name={icon} size={24} color="#6b21a8" className="mr-4" />
      <View className="flex-1 ml-4 border-b border-gray-100 pb-2">
        <Text className="text-sm text-gray-500">{label}</Text>
        <View className="flex-row items-center justify-between">
          {isEditingName && label === t('name') ? (
            <TextInput
              value={tempName}
              onChangeText={setTempName}
              className="text-base text-gray-800 py-1 flex-1"
              autoFocus
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
            />
          ) : (
            <Text className="text-base text-gray-800">{value || t('notSpecified')}</Text>
          )}
          {showEdit && !isEditingName && (
            <Icon name="pencil-outline" size={20} color="#6b21a8" />
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-purple-600 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl ml-4">{t('profile')}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Icon name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="items-center py-6 bg-white mb-2">
        <TouchableOpacity onPress={handleImage} disabled={loading}>
          {loading ? (
            <View className="w-28 h-28 rounded-full bg-gray-100 items-center justify-center">
              <ActivityIndicator color="#6b21a8" />
            </View>
          ) : (
            <View className="relative">
              <Image 
                source={image ? { uri: image.uri } : require('../assests/jj.png')} 
                className="w-28 h-28 rounded-full"
              />
              <View className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full">
                <Icon name="camera-outline" size={20} color="white" />
              </View>
            </View>
          )}
        </TouchableOpacity>
        <Text className="mt-4 text-xl font-semibold text-gray-800">
          {userData.name || t('yourName')}
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          {userData.bio || t('hello')}
        </Text>
      </View>

      <ProfileSection title={t('personalInfo')} icon="person-circle-outline">
        <ProfileItem
          icon="person-outline"
          label={t('name')}
          value={userData.name}
          onPress={() => setIsEditingName(true)}
          showEdit
          editable
        />
        <ProfileItem
          icon="mail-outline"
          label={t('email')}
          value={userData.email}
        />
        <ProfileItem
          icon="call-outline"
          label={t('phone')}
          value={userData.phone}
          onPress={() => {/* Add phone edit logic */}}
        />
      </ProfileSection>

      <ProfileSection title={t('additionalInfo')} icon="information-circle-outline">
        <ProfileItem
          icon="location-outline"
          label={t('location')}
          value={userData.location}
          onPress={() => {/* Add location edit logic */}}
        />
        <ProfileItem
          icon="calendar-outline"
          label={t('joinDate')}
          value={new Date(userData.joinDate).toLocaleDateString()}
        />
      </ProfileSection>

      <ProfileSection title={t('preferences')} icon="settings-outline">
        <ProfileItem
          icon="notifications-outline"
          label={t('notifications')}
          value={t('enabled')}
        />
        <ProfileItem
          icon="language-outline"
          label={t('language')}
          value={t('english')}
        />
      </ProfileSection>

      <TouchableOpacity
        onPress={handleLogout}
        className="flex-row items-center px-4 py-3 bg-white mt-4 mb-8"
      >
        <Icon name="log-out-outline" size={24} color="#dc2626" className="mr-4" />
        <Text className="text-red-600 text-base ml-4">{t('logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Profile;