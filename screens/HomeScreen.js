import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import LiveMotionTracking from '../components/LiveMotionTracking';

export default function HomeScreen(navigation ) {
  return (
      <View style={styles.container}>
        {/* Profile Image in the top-right */}
        <View style={styles.header}>
        <View style={styles.contentContainer}>
            <Text style={styles.greeting}>Hello, Welcome 👋</Text>
            <Text style={styles.name}>Name</Text>
          </View>

          <Image
            source={require('../assets/avatar.png')} // Corrected online image source
            style={styles.profileImage}
          />

        </View>


        {/* Live Motion Tracking Component */}
        <View style={styles.card}>
          <LiveMotionTracking />
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonContainer}>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Error Detection & Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Compare with Professional Model</Text>
          </TouchableOpacity>

        </View>

      </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover', // Ensures the background image covers the entire screen
  },
  header: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    justifyContent: 'space-between',
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
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 40,
    marginRight: 15, 
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 18,
    color: '#ddd',
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'column', 
    alignItems: 'center', 
    marginTop: 70,
  },
  card: {
    paddingTop: 20,
  }
});