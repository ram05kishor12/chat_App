import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Navigation from './navigation';
import "./services/firebaseConfig";


import './global.css';


export default function App() {
  return (
    <NavigationContainer>
      <Navigation />
    </NavigationContainer>
  );
}
