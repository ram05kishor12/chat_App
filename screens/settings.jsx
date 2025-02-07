import React, { useState, useEffect } from 'react';
import {
  I18nManager,
  Text,
  View,
  Switch,
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import RNRestart from 'react-native-restart';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import ReactNativeBiometrics from 'react-native-biometrics';
import i18n from '../services/arabic';

const SettingsPage = () => {
  const [isRTL, setIsRTL] = useState(I18nManager.isRTL);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const { t } = useTranslation();
  const rnBiometrics = new ReactNativeBiometrics();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [lang, dark, notif, sound, bio] = await Promise.all([
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('darkMode'),
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('sound'),
        AsyncStorage.getItem('biometrics')
      ]);
      
      setIsRTL(lang === 'ar');
      setIsDarkMode(dark === 'true');
      setNotifications(notif !== 'false');
      setSoundEnabled(sound !== 'false');
      setBiometricsEnabled(bio === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleDirection = async () => {
    const newDirection = !isRTL;
    setIsRTL(newDirection);
    const newLang = newDirection ? 'ar' : 'en';

    await AsyncStorage.setItem('language', newLang);
    i18n.changeLanguage(newLang);
    I18nManager.forceRTL(newDirection);

    Alert.alert(
      t('restartRequired'),
      t('restartMessage'),
      [
        {
          text: t('restartNow'),
          onPress: () => RNRestart.Restart(),
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, value, onToggle, description }) => (
    <View className="mb-6 border-b border-gray-100 pb-4">
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center flex-1">
          <Icon name={icon} size={24} color="#6b21a8" className="mr-3" />
          <View className="flex-1 ml-3">
            <Text className="text-lg font-medium text-gray-800">
              {title}
            </Text>
            {description && (
              <Text className="text-sm text-gray-500 mt-1">
                {description}
              </Text>
            )}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          thumbColor={value ? '#6b21a8' : '#9ca3af'}
          trackColor={{ false: '#e5e7eb', true: '#ddd6fe' }}
        />
      </View>
    </View>
  );

  const handleDarkMode = async (value) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('darkMode', value.toString());
  };

  const handleNotifications = async (value) => {
    setNotifications(value);
    await AsyncStorage.setItem('notifications', value.toString());
  };

  const handleSound = async (value) => {
    setSoundEnabled(value);
    await AsyncStorage.setItem('sound', value.toString());
  };

  const handleBiometrics = async (value) => {
    try {
      if (value) {
        // Check if biometrics are available
        const { available } = await rnBiometrics.isSensorAvailable();

        if (!available) {
          Alert.alert(
            t('biometricsNotAvailable'),
            t('biometricsNotSupportedMessage'),
            [{ text: 'OK' }]
          );
          return;
        }

        // Show permission dialog
        Alert.alert(
          t('enableBiometrics'),
          t('enableBiometricsMessage'),
          [
            {
              text: t('cancel'),
              style: 'cancel'
            },
            {
              text: t('enable'),
              onPress: async () => {
                // Verify biometrics before enabling
                const { success } = await rnBiometrics.simplePrompt({
                  promptMessage: t('verifyBiometrics'),
                  cancelButtonText: t('cancel')
                });

                if (success) {
                  setBiometricsEnabled(true);
                  await AsyncStorage.setItem('biometrics', 'true');
                  Alert.alert(t('success'), t('biometricsEnabled'));
                }
              }
            }
          ]
        );
      } else {
        // Disable biometrics
        setBiometricsEnabled(false);
        await AsyncStorage.setItem('biometrics', 'false');
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert(t('error'), t('biometricSetupError'));
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="bg-purple-600 p-6">
        <Text className="text-2xl font-bold text-white">
          {t('settings')}
        </Text>
      </View>

      <View className="p-6">
        <Text className="text-sm font-medium text-purple-700 mb-4 uppercase">
          {t('security')}
        </Text>

        <SettingItem
          icon="finger-print"
          title={t('biometricAuth')}
          value={biometricsEnabled}
          onToggle={handleBiometrics}
          description={t('biometricDescription')}
        />

        <Text className="text-sm font-medium text-purple-700 mb-4 uppercase">
          {t('preferences')}
        </Text>

        <SettingItem
          icon="language-outline"
          title={t(isRTL ? 'switchToLTR' : 'switchToRTL')}
          value={isRTL}
          onToggle={toggleDirection}
          description={t('languageDescription')}
        />

        <SettingItem
          icon="moon-outline"
          title={t('darkMode')}
          value={isDarkMode}
          onToggle={handleDarkMode}
          description={t('darkModeDescription')}
        />

        <Text className="text-sm font-medium text-purple-700 mb-4 uppercase mt-4">
          {t('notifications')}
        </Text>

        <SettingItem
          icon="notifications-outline"
          title={t('pushNotifications')}
          value={notifications}
          onToggle={handleNotifications}
          description={t('notificationsDescription')}
        />

        <SettingItem
          icon="volume-high-outline"
          title={t('soundEffects')}
          value={soundEnabled}
          onToggle={handleSound}
          description={t('soundDescription')}
        />

        <TouchableOpacity 
          className="mt-6 p-4 bg-purple-50 rounded-lg flex-row items-center justify-between"
          onPress={() => Alert.alert(t('version'), '1.0.0')}
        >
          <View className="flex-row items-center">
            <Icon name="information-circle-outline" size={24} color="#6b21a8" />
            <Text className="ml-3 text-lg text-gray-800">{t('about')}</Text>
          </View>
          <Text className="text-gray-500">v1.0.0</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SettingsPage;