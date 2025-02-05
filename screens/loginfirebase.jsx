import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  I18nManager,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';

const LoginFirebase = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();
  const { i18n} = useTranslation();
  const isRTL = I18nManager.isRTL || ['ar'].includes(i18n.language);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Toast.show({
          type: 'error',
          position: 'top',
          text1: 'Error',
          text2: 'Email and password are required',
          visibilityTime: 4000,
          autoHide: true,
        });
        return;
      }

      const userCredential = await auth().signInWithEmailAndPassword(email.trim(), password);

      if (userCredential.user) {
        Toast.show({
          type: 'success',
          position: 'top',
          text1: 'Success',
          text2: 'Logged in successfully',
          visibilityTime: 4000,
          autoHide: true,
        });
        navigation.replace('Tabs');
      }
    } catch (error) {
      console.error('Login failed:', error.message);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6">
            <View className="items-center mb-8">
              <View className="bg-purple-100 w-20 h-20 rounded-2xl items-center justify-center mb-4">
                <Icon name="chatbubbles" size={40} color="#6b46c1" />
              </View>
              <Text className="text-3xl font-bold text-gray-900">{t('welcome')}</Text>
              <Text className="text-base text-gray-600 mt-2 text-center">
                {t('sigintocontinuechattingwithyourteam')}
              </Text>
            </View>

            {/* Login Form */}
            <View className="">
              {/* Email Input */}
              <View>
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
                    writingDirection={isRTL ? 'rtl' : 'ltr'}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className='mt-4'>
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
                    writingDirection={isRTL ? 'rtl' : 'ltr'}
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

              {/* Forgot Password */}
              <View className="flex justify-end">
              <TouchableOpacity className="mt-2 self-end" onPress={()=> {}}>
                <Text className="text-purple-600 text-base font-semibold">{t('forgotpassword')}</Text>
              </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                className="bg-purple-600 rounded-xl py-4 shadow-sm active:bg-purple-700 mt-5"
                onPress={handleLogin}
              >
                <View className="flex-row justify-center items-center gap-4">
                  <Icon name="log-in-outline" size={20} color="white" />
                  <Text className="text-white font-semibold text-base">{t('login')}</Text>
                </View>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View className="mt-6">
                <Text className="text-center text-gray-600">
                   {t('alreadyhaveaccount')}{' '}
                  <Text className="text-purple-600 font-semibold" onPress={() => navigation.navigate('SignUp')}>
                    {t('sigin')}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginFirebase;
