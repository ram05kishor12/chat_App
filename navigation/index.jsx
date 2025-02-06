import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BiometricAuth from '../screens/boimetric';
import LoginFirebase from '../screens/loginfirebase';
import SignupFirebase from '../screens/signupfirebase';
import TabNavigator from './tab';
import ChatScreen from '../screens/chatscreen';
import GroupChatScreen from '../screens/groupchatscreen';
import chatlist from '../screens/chatlist';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userLoggedIn = await AsyncStorage.getItem('userLoggedIn');
        if (userLoggedIn === 'true') {
          setInitialRoute('Tabs');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        setInitialRoute('Login');
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <BiometricAuth>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={LoginFirebase}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="SignUp" component={SignupFirebase} />
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }}/>
        <Stack.Screen name="chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="chatlist" component={chatlist} options={{ headerShown: false }} />
        <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ headerShown: false }}/>
      </Stack.Navigator>
    </BiometricAuth>
  );
}