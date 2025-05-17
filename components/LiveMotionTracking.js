import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native'; // Import the hook

export default function LiveMotionTrackingCard() {
  const navigation = useNavigation(); // Get the navigation object using the hook
  
  const handleNavigate = () => {
    navigation.navigate('CameraScreen');  // Navigate to CameraScreen when the button is pressed
  };

  return (
  
    <LinearGradient
      colors={["#05274e", "#490a0f"]} // Gradient from dark to slightly lighter
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.TextContainer}>
        <Text style={styles.cardTitle}>Live Motion Tracking</Text>

        {/* Start Button */}
        <TouchableOpacity style={styles.button} onPress={handleNavigate}>
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    
    borderRadius: 30,
    paddingVertical: 30,
    marginVertical: 15,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center', 
    display: 'flex',
    justifyContent: 'space-between',
  },
  cardTitle: {
    position:'relative',
    fontSize: 22,
    textAlign:'center',
    fontWeight: 'bold',
    marginBottom: 15,
    
    color: '#fff',
    fontFamily: 'Poppins',
    letterSpacing: 1.2,
    lineHeight: 32,
    
  },
  button: {
    marginTop: 20,
    
    alignSelf:'center',
    backgroundColor: '#ff4c48',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 30,
    alignItems: 'center',
    width: '70%',
  

  },
  buttonText: {
    color: '#2D343C',
    fontSize: 17,
    width:'80%',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 4,
    lineHeight: 30,
    fontFamily: 'Poppins',
    textAlign:'center',
  },
  TextContainer: {
    width: '50%',
    
    alignItems: 'left',

  },
});
