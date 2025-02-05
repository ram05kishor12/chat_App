import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth, db } from '../services/firebaseConfig';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';

const SignupFirebase = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const isRTL = I18nManager.isRTL || ['ar'].includes(i18n.language);


  const handleSignup = async () => {
    try {
      if (!name || !email || !password) {
        Toast.show({
          type: 'error',
          position: 'top',
          text1: 'Error',
          text2: 'All fields are required',
          visibilityTime: 4000,
          autoHide: true,
        });
        return;
      }

      const userCreds = await auth().createUserWithEmailAndPassword(email.trim(), password);
      const user = userCreds.user;

      // Store user data in Firestore
      await db.collection('users').doc(user.uid).set({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        userId: user.uid,
      });

      Toast.show({
        type: 'success',
        position: 'top',
        text1: 'Success',
        text2: 'Account created successfully',
        visibilityTime: 4000,
        autoHide: true,
      });

      navigation.replace('Tabs');
    } catch (error) {
      console.error('Signup failed:', error.message);
      Toast.show({
        type: 'error',
        position: 'top',
        text1: 'Error',
        text2: error.message,
        visibilityTime: 4000,
        autoHide: true,
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <View className="bg-purple-100 w-20 h-20 rounded-2xl items-center justify-center mb-4">
              <Icon name="person-add-outline" size={40} color="#6b46c1" />
            </View>
            <Text className="text-3xl font-bold text-gray-900">{t('createaccount')}</Text>
            <Text className="text-base text-gray-600 mt-2 text-center">
              {t('signuptostartchattingwithyourteam')}
            </Text>
          </View>

          {/* Input Fields */}
          <View className="">
            {/* Name Input */}
            <View>
              <Text className="text-lg font-bold text-gray-700">{t('name')}</Text>
              <View className="bg-gray-50 rounded-xl p-1 px-4 flex-row items-center border border-gray-200 mt-2">
                <Icon name="person-outline" size={20} color="#6b46c1" style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="John Doe"
                  className="flex-1 text-base text-gray-900"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Email Input */}
            <View className="mt-4">
              <Text className="text-lg font-bold text-gray-700">{t('email')}</Text>
              <View className="bg-gray-50 rounded-xl p-1 px-4 flex-row items-center border border-gray-200 mt-2">
                <Icon name="mail-outline" size={20} color="#6b46c1" style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="abcd@gmail.com"
                  keyboardType="email-address"
                  className="flex-1 text-base text-gray-900"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                  autoComplete="email"
                  style={{ textAlign: isRTL ? 'right' : 'left' , writingDirection: isRTL ? 'rtl' : 'ltr' }}
                  // 
                  
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mt-4">
              <Text className="text-lg font-bold text-gray-700">{t('password')}</Text>
              <View className="bg-gray-50 rounded-xl p-1 px-4 flex-row items-center border border-gray-200 mt-2">
                <Icon name="lock-closed-outline" size={20} color="#6b46c1" style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-base text-gray-900"
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#9CA3AF"
                  autoComplete="password"
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#6b46c1" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sign-Up Button */}
          <TouchableOpacity
            className="bg-purple-600 rounded-xl py-4 shadow-sm active:bg-purple-700 mt-5"
            onPress={handleSignup}
          >
            <View className="flex-row justify-center items-center gap-4">
              <Icon name="person-add-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base">{t('sigin')}</Text>
            </View>
          </TouchableOpacity>

          {/* Log In Section */}
          <View className="mt-6">
            <Text className="text-center text-gray-600">
               {t('alreadyhaveaccount')}{' '}
              <Text className="text-purple-600 font-semibold" onPress={() => navigation.navigate('Login')}>
                {t('login')}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignupFirebase;
