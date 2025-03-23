import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: "999675398759-fog61cpqtcek5jo9cfcddmqkea6nrp1e.apps.googleusercontent.com",
      webClientId: "999675398759-l40ou2ii4adb1d54f1pjlts69nau3feo.apps.googleusercontent.com",
      profileImageSize: 150,
    });
  });
  

  return (
    <NavigationContainer>

      <AppNavigator isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

    </NavigationContainer>
  );
}