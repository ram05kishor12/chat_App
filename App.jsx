import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Navigation from './navigation';
import "./services/firebaseConfig";
import BiometricAuth from './screens/boimetric';
import './global.css';

export default function App() {
  return (
    <BiometricAuth>
      <NavigationContainer>
        <Navigation initialCheckComplete={true} />
      </NavigationContainer>
    </BiometricAuth>
  );
}