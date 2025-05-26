import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ImageBackground, Animated } from 'react-native';
import LiveMotionTracking from '../components/LiveMotionTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, databases, DATABASE_ID, COLLECTIONS, Query, userProfiles } from '../lib/AppwriteService';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';


import backgroundImage from '../assets/sfgsdh.png'; // Adjust the path to your image

export default function HomeScreen({ navigation, setIsLoggedIn }) {
  const [profileData, setProfileData] = React.useState({
    profileImage: require('../assets/icon.png'),
    fullName: 'Name',
  });

  const navigation1 = useNavigation();
  const handleNavigate = () => {
    navigation1.navigate('test'); // Replace with your actual route (e.g., CameraScreen)
  };

  const PROJECT_ID = '67d0bb27002cfc0b22d2';
  const API_ENDPOINT = 'https://cloud.appwrite.io/v1';

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Load profile data when component mounts
  React.useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Check if user is authenticated
        let user;
        try {
          user = await account.get();
        } catch (error) {
          if (error.code === 401 || error.message.includes('missing scope')) {
            console.log('User not authenticated, redirecting to login...');
            setIsLoggedIn(false);
            navigation.navigate('Login');
            return;
          }
          throw error;
        }

        const userId = user.$id;

        // Load profile from database
        const profiles = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          [Query.equal('userId', userId)]
        );

        let newProfileData = {
          fullName: user.name || 'Name',
          profileImage: require('../assets/icon.png'),
        };

        if (profiles.documents.length > 0) {
          const profile = profiles.documents[0];
          newProfileData.fullName = profile.name || user.name || 'Name';

          // If profile has avatar, get direct file URL
          if (profile.avatar && profile.avatar !== 'avatar.png') {
            try {
              const imageUrl = `${API_ENDPOINT}/storage/buckets/profile_images/files/${profile.avatar}/view?project=${PROJECT_ID}`;
              newProfileData.profileImage = { uri: imageUrl };
            } catch (error) {
              console.log('Error getting file view:', error);
            }
          }
        }

        setProfileData(newProfileData);

        // Update AsyncStorage for offline fallback
        await AsyncStorage.setItem('profile_name', newProfileData.fullName);
        if (newProfileData.profileImage.uri) {
          await AsyncStorage.setItem('profile_image', newProfileData.profileImage.uri);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        Alert.alert('Error', 'Failed to load profile data. Using cached data if available.');

        // Fallback to AsyncStorage
        try {
          const savedProfileName = await AsyncStorage.getItem('profile_name');
          const savedProfileImageUri = await AsyncStorage.getItem('profile_image');
          if (savedProfileName || savedProfileImageUri) {
            setProfileData({
              fullName: savedProfileName || 'Name',
              profileImage: savedProfileImageUri ? { uri: savedProfileImageUri } : require('../assets/icon.png'),
            });
          }
        } catch (storageError) {
          console.error('Failed to load from AsyncStorage:', storageError);
        }
      }
    };

    loadProfileData();

    // Reload data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
    });

    return unsubscribe;
  }, [navigation, setIsLoggedIn]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      // Set offline status
      try {
        const user = await account.get();
        await userProfiles.safeUpdateStatus(user.$id, 'offline');
      } catch (error) {
        console.log('Error setting offline status:', error);
      }

      // Clear local data
      await AsyncStorage.clear();
      await account.deleteSessions();

      // Update UI and redirect
      setIsLoggedIn(false);
      navigation.navigate('Login');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggedIn(false);
      navigation.navigate('Login');
    }
  };

  // Start animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Profile Image in the top-right */}
        <View style={styles.header}>
          <View style={styles.contentContainer}>
            <Text style={styles.greeting}>Hello, Welcome 👋</Text>
            <Text style={styles.name}>{profileData.fullName}</Text>
          </View>
          <Image source={profileData.profileImage} style={styles.profileImage} />
        </View>
        {/* Live Motion Tracking Component */}
        <View style={styles.card}>
          <LiveMotionTracking />
        </View>
        {/* Buttons Section */}
        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity style={styles.button} onPress={handleNavigate} onPressIn={handlePressIn} onPressOut={handlePressOut}>
              <Text style={styles.buttonText}>Error Detection & Feedback</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity style={styles.button} onPressIn={handlePressIn} onPressOut={handlePressOut}>
              <Text style={styles.buttonText}>Compare with Professional Model</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
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
    
    padding: 20,
  },
  profileImageContainer: {
    position: 'absolute',
    
    top: 20,
    right: 20,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 40,
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  button: {
    backgroundColor: 'transparent',
    textAlign:"center",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: '#ff4c48',
    borderWidth: 2,
    borderRadius: 30,
    marginTop: 15,
    width: '80%',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  logoutButton: {
    borderColor: Colors.primary,
  },
  buttonText: {
    color: '#fff',
    textAlign:"center",
    fontSize: 18,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  name: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  buttonContainer: {
    
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 70,
  },
  card: {
    paddingTop: 20,
  },
  contentContainer: {
    flex: 1,
  },
});