import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import the hook

export default function LiveMotionTrackingCard() {
  const navigation = useNavigation(); // Get the navigation object using the hook
  
  const handleNavigate = () => {
    navigation.navigate('CameraScreen');  // Navigate to CameraScreen when the button is pressed
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Live Motion Tracking</Text>

      {/* Image Placeholder */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/f.png')} // Replace with actual image
          style={styles.image}
        />
      </View>

      {/* Start Button */}
      <TouchableOpacity style={styles.button} onPress={handleNavigate}>
        <Text style={styles.buttonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2D343C',
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    width: '90%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#01C594',
  },
  imageContainer: {
    backgroundColor: '#ddd',
    width: '100%',
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#01C594',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#2D343C',
    fontSize: 16,
    fontWeight: '600',
  },
});