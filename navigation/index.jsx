import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import TabNavigator from './tab';

import Icon from 'react-native-vector-icons/Ionicons';
import Signupfirebase from '../screens/signupfirebase';
import Loginfirebase from '../screens/loginfirebase';
import Chatscreen from '../screens/chatscreen';
import chatlist from '../screens/chatlist';
import GroupChatScreen from '../screens/groupchatscreen';

const Stack = createNativeStackNavigator();



export default function Navigation() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userLoggedIn = await AsyncStorage.getItem('userLoggedIn');
        if (userLoggedIn === 'true') {
          setInitialRoute('Drawer');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute}>
      <Stack.Screen
        name="Login"
        component={Loginfirebase}
        options={{ headerShown: false }}
      />
      <Stack.Screen name ="chatlist" component={chatlist} options={{ headerShown : false }} />
      <Stack.Screen name="SignUp" component={Signupfirebase} />
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown : false }}/>
      <Stack.Screen name ="chat" component={Chatscreen} options={{ headerShown : false }} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options = {{ headerShown : false}}/>
    </Stack.Navigator>
  );
}


const styles = StyleSheet.create({
  logoutButton: {
    padding: 10,
    backgroundColor: 'red',
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});