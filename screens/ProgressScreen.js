import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BadgesMilestoneCard from '../components/BadgesMilestoneCard';
import { useNavigation } from '@react-navigation/native';

export default function ProgressScreen() {
  const navigation = useNavigation();
  const handleNavigate = () => {
    navigation.navigate('Performance');
  };
  return (
    
      <View style={styles.container}>
        <Text style={styles.title}>Performance</Text>
        <Text style={styles.description}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc maximus, nulla ut commodo sagittis, sapien dui mattis dui, non pulvinar lorem felis nec erat.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleNavigate}>
          <Text style={styles.buttonText} >Enter</Text>
        </TouchableOpacity>

        {/* Milestone Card Component */}
        <BadgesMilestoneCard />
      </View>
    
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover', // Ensures the background image covers the entire screen
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#1F2229', // Added transparency for readability
  },
  button: {
    backgroundColor: '#07A07C',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 20,
    marginTop: 15,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: "white",
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#00ffc0', // Changed to white for better contrast
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    color: '#ddd', // Lightened text for better visibility
    textAlign: 'center',
  },
});
