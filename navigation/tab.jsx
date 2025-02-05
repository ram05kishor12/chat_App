import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
// import { useTranslation } from 'react-i18next';

// Import screens
import ChatListScreen from '../screens/chatlist';
import CommunityScreen from '../screens/grouplist';
// import SettingsScreen from '../screens/settings';

const Tab = createBottomTabNavigator();

// function CustomHeader({ title, navigation }) {
//   return (
//     <View className="flex-row justify-between items-center px-4 py-3 bg-white shadow-md border-b border-gray-300">
//       {/* Title */}
//       <Text className="text-xl font-semibold text-purple-700">Settings</Text>

//       {/* Profile / Settings Icon */}
//       <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
//         <Icon name="person-circle" size={28} color="#8B3DFF" />
//       </TouchableOpacity>
//     </View>
//   );
// }

function TabNavigator() {
  // const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          elevation: 0,
          backgroundColor: 'white',
          height: 70,
          boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)',
        },
        tabBarBackground: () => (
          <View className="absolute inset-0 bg-white rounded-2xl shadow-lg" />
        ),
        tabBarActiveTintColor: '#8B3DFF',
        tabBarInactiveTintColor: '#757575',
        tabBarIconStyle: { marginTop: 6 },
      }}
    >
      <Tab.Screen 
        name='chat'
        component={ChatListScreen}
        options={({ navigation }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Icon 
              name={focused ? "chatbubble" : "chatbubble-outline"} 
              size={24} 
              color={color}
            />
          ),
          tabBarLabel: 'chat',
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        })}
      />
      
       <Tab.Screen
        name='community'
        component={CommunityScreen}
        options={({ navigation }) => ({
          headerShown: false,
          header: () => <CustomHeader title={t('community')} navigation={navigation} />,
          tabBarIcon: ({ focused, color }) => (
            <Icon 
              name={focused ? "people" : "people-outline"} 
              size={24} 
              color={color}
            />
          ),
          tabBarLabel: "community",
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        })}
      />

      {/* <Tab.Screen 
        name='settings'
        component={SettingsScreen}
        options={({ navigation }) => ({
          headerShown: false,
          header: () => <CustomHeader title={t('settings')} navigation={navigation} />,
          tabBarIcon: ({ focused, color }) => (
            <Icon 
              name={focused ? "settings" : "settings-outline"} 
              size={24} 
              color={color}
            />
          ),
          tabBarLabel: 'settings',
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        })}
      /> */}
    </Tab.Navigator>
  );
}

export default TabNavigator;
