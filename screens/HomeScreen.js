import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import LiveMotionTracking from '../components/LiveMotionTracking';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Profile Image in the top-right */}
      <Image
        source={{ uri: 'https://www.pngegg.com/en/png-wbapv' }}  // Replace this with your image URL
        style={styles.profileImage}
      />

      <View style={styles.contentContainer}>
        {/* Greeting and User Name */}
        <Text style={styles.greeting}>Hello, Welcome 👋</Text>
        <Text style={styles.name}>Name</Text>
      </View>

      {/* Buttons Section */}
      
      <LiveMotionTracking/>
      

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
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
    marginTop: 10,  // Adjust the content to leave space for the profile image
    marginLeft: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  name: {
    fontSize: 20,
    color: '#777',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 15,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
