import React, { useState, useEffect } from 'react';
import { View, Text, Alert, BackHandler, Platform } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const BiometricAuth = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const rnBiometrics = new ReactNativeBiometrics();

  useEffect(() => {
    checkAndAuthenticate();
  }, []);

  const checkAndAuthenticate = async () => {
    try {
      const biometricSetting = await AsyncStorage.getItem('biometrics');
      // If biometrics is not explicitly disabled, show the prompt
      if (biometricSetting !== 'false') {
        const { available } = await rnBiometrics.isSensorAvailable();
        if (available) {
          const result = await rnBiometrics.simplePrompt({
            promptMessage: t('authenticateMessage'),
            cancelButtonText: t('cancel')
          });

          if (result.success) {
            await AsyncStorage.setItem('biometrics', 'true');
            setIsAuthenticated(true);
          } else {
            // If authentication fails or is cancelled
            Alert.alert(
              t('authenticationRequired'),
              t('authenticationRequiredMessage'),
              [
                {
                  text: t('retry'),
                  onPress: () => checkAndAuthenticate()
                },
                {
                  text: t('exit'),
                  onPress: () => BackHandler.exitApp(),
                  style: 'cancel'
                }
              ]
            );
            return;
          }
        } else {
          // If biometrics not available, disable it
          await AsyncStorage.setItem('biometrics', 'false');
          setIsAuthenticated(true);
        }
      } else {
        // If biometrics is explicitly disabled
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert(
        t('error'),
        t('authenticationErrorMessage'),
        [
          {
            text: t('retry'),
            onPress: () => checkAndAuthenticate()
          },
          {
            text: t('exit'),
            onPress: () => BackHandler.exitApp(),
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-xl text-gray-800 mb-4">
          {isLoading ? t('loading') : t('waitingForAuthentication')}
        </Text>
        {!isLoading && (
          <Text className="text-sm text-gray-500 text-center px-6">
            {Platform.OS === 'ios' ? t('useFaceId') : t('useFingerprint')}
          </Text>
        )}
      </View>
    );
  }

  return children;
};

export default BiometricAuth;