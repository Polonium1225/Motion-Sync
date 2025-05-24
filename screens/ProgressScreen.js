import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet,ImageBackground } from 'react-native';
import BadgesMilestoneCard from '../components/BadgesMilestoneCard';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';

import backgroundImage from '../assets/sfgsdh.png'; // Adjust the path to your image

export default function ProgressScreen() {
  const navigation = useNavigation();
  const handleNavigate = () => {
    navigation.navigate('Performance');
  };
  return (
    <ImageBackground
        source={backgroundImage} // 👈 Set the background image
        style={styles.container}
        resizeMode="cover" // 👈 Ensure the image covers the screen
      >
      <View style={styles.container}>
        <Text style={styles.title}>Performance</Text>
        <Text style={styles.description}>
          in this section you get to analyse pre recorded videos and imaged to see your progress you can analyse your  movement based on scientific etrics calculated from the pose estimation.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleNavigate}>
          <Text style={styles.buttonText} >Enter</Text>
        </TouchableOpacity>

        {/* Milestone Card Component */}
        <BadgesMilestoneCard />
      </View></ImageBackground>
    
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
    //backgroundColor: '#1F2229', // Added transparency for readability
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
