import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function LiveMotionTrackingCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Live Motion Tracking</Text>

      {/* Image Placeholder */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/favicon.png')} // Replace with a real image if needed
          style={styles.image}
        />
      </View>

      {/* Start Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f1f1f1',
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
    color: '#333',
  },
  imageContainer: {
    backgroundColor: '#ddd', // Grey background for the image placeholder
    width: '100%',
    height: 150,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 50, // You can adjust the size of the placeholder image
    height: 50,
    tintColor: '#999', // Grey color to match the placeholder effect
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
