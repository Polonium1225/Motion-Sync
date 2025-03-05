import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import LiveMotionTracking from '../components/LiveMotionTracking';

export default function HomeScreen() {
  return (
      <View style={styles.container}>
        {/* Profile Image in the top-right */}
        <Image
          source={{ uri: 'https://www.pngegg.com/en/png-wbapv' }} // Corrected image source for online images
          style={styles.profileImage}
        />

        <View style={styles.contentContainer}>
          {/* Greeting and User Name */}
          <Text style={styles.greeting}>Hello, Welcome 👋</Text>
          <Text style={styles.name}>Name</Text>
        </View>

        {/* Live Motion Tracking Component */}
        <LiveMotionTracking />

        {/* Buttons Section */}
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Error Detection & Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Compare with Professional Model</Text>
        </TouchableOpacity>
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
    backgroundColor: '#22272B', // Added transparency to blend with background
    padding: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'absolute',
    top: 20,
    right: 20,
  },
  contentContainer: {
    marginTop: 80, // Increased to prevent overlap with profile image
    marginLeft: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff', // Changed to white for better contrast
  },
  name: {
    fontSize: 20,
    color: '#ddd', // Lightened text for better visibility
    marginTop: 10,
  },
  button: {
    backgroundColor: '#22272B',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: "#01CC97",  // Correct property
    borderWidth: 2,          // Required for the border to appear
    borderRadius: 30,
    marginTop: 15,
    width: '80%',
    height:'70',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
