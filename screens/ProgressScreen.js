import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Animated } from 'react-native';
import BadgesMilestoneCard from '../components/BadgesMilestoneCard';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

import backgroundImage from '../assets/sfgsdh.png'; // Adjust the path to your image

export default function ProgressScreen() {
  const navigation = useNavigation();
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

  const handleNavigate = () => {
    navigation.navigate('Performance');
  };

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

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <Animated.View style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}>
        <Text style={styles.title}>Performance</Text>
        <Text style={styles.description}>
          in this section you get to analyse pre recorded videos and imaged to see your progress you can analyse your  movement based on scientific etrics calculated from the pose estimation.
        </Text>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNavigate}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Enter</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Milestone Card Component */}
        <BadgesMilestoneCard />
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Add padding at the top for better spacing
    // backgroundColor: '#1F2229', // Added transparency for readability
  },
  button: {
    backgroundColor: '#ff4c48',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 20,
    marginTop: 15,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#ff4c48', // Changed to white for better contrast
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
