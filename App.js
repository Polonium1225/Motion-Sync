import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import Colors from './constants/color';
import Fonts from './constants/fonts';

const MyTheme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surfaceDark,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.primary,
  },
  fonts: {
    regular: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.regular,
    },
    medium: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.medium, 
    },
    light: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.light,
    },
    thin: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.thin,
    },
  },
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Simulate font loading or any initialization
  useEffect(() => {
    // Wait a moment to ensure everything is initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Define styles using StyleSheet
  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background,
    },
    loadingText: {
      ...Fonts.getFont('medium', 'regular'),
      color: Colors.textPrimary,
      marginTop: 20,
    }
  });

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyTheme}>
      <AppNavigator isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
    </NavigationContainer>
  );
}