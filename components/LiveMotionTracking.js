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
      <View style={styles.TextContainer}>
        <Text style={styles.cardTitle}>Live Motion Tracking</Text>

        {/* Start Button */}
        <TouchableOpacity style={styles.button} onPress={handleNavigate}>
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
      </View>

      {/* Image Placeholder */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/f.png')} // Replace with actual image
          style={styles.image}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2D343C',
    borderRadius: 10,
    paddingVertical: 30,
    paddingHorizontal: 10,
    marginVertical: 15,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center', 
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#01C594',
    fontFamily: 'Poppins',
    letterSpacing: 1.2,
    lineHeight: 32,
    
  },
  imageContainer: {
    backgroundColor: '#ddd',
    width: '50%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#01C594',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 30,
    alignItems: 'center',
    width: '70%',
  

  },
  buttonText: {
    color: '#2D343C',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    lineHeight: 22,
    fontFamily: 'Poppins',
  },
  TextContainer: {
    width: '50%',
    alignItems: 'left',

  },
});
