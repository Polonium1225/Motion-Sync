import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import LiveMotionTracking from '../components/LiveMotionTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [profileData, setProfileData] = React.useState({
    profileImage: require('../assets/icon.png'),
    fullName: 'Name'
  });

  // Load profile data when component mounts
  React.useEffect(() => {
    const loadProfileData = async () => {
      try {
        const savedProfileName = await AsyncStorage.getItem('profile_name');
        const savedProfileImageUri = await AsyncStorage.getItem('profile_image');
        
        if (savedProfileName) {
          setProfileData(prevData => ({ 
            ...prevData, 
            fullName: savedProfileName 
          }));
        }
        
        if (savedProfileImageUri) {
          setProfileData(prevData => ({ 
            ...prevData, 
            profileImage: { uri: savedProfileImageUri } 
          }));
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      }
    };

    loadProfileData();

    // Set up a focus listener to reload data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Profile Image in the top-right */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('Settings')}
        style={styles.profileImageContainer}
      >
        <Image
          source={profileData.profileImage}
          style={styles.profileImage}
        />
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        {/* Greeting and User Name */}
        <Text style={styles.greeting}>Hello, Welcome 👋</Text>
        <Text style={styles.name}>{profileData.fullName}</Text>
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
  profileImageContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    borderColor: "#01CC97",
    borderWidth: 2,
    borderRadius: 30,
    marginTop: 15,
    width: '80%',
    height: 70,
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