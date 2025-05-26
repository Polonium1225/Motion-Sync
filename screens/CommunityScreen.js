import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ImageBackground, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { account, getUserConversations } from "../lib/AppwriteService";
import { useIsFocused } from '@react-navigation/native';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';

export default function CommunityScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const isFocused = useIsFocused();

  // Animation states
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleChatPress = async () => {
    setIsLoading(true);
    try {
      const user = await account.get();
      const conversations = await getUserConversations(user.$id);

      if (conversations.length > 0) {
        navigation.navigate('FindFriend');
      } else {
        navigation.navigate('SearchFriends'); // Go directly to SearchFriends instead of NoConversation
      }
    } catch (error) {
      console.error("Error checking conversations:", error);
      navigation.navigate('SearchFriends');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.container}>
          <Text style={styles.title}>Community</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Checking your conversations...</Text>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleChatPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Text style={styles.buttonText}>Chat</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 20,
    paddingTop: 50, // Add top padding for better spacing
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: Colors.textPrimary
  },
  input: {
    backgroundColor: Colors.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.background,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: Colors.primary,
    borderWidth: 2,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 18,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: Colors.textSecondary,
  }
});