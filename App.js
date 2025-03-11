import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  return (
    <NavigationContainer>

      <AppNavigator isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />


    </NavigationContainer>
  );
}