import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import LiveMotionTracking from '../components/LiveMotionTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, databases, DATABASE_ID, COLLECTIONS, Query, userProfiles } from '../lib/AppwriteService';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/color';

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

  return (
    <View style={styles.container}>
      {/* Profile Image in the top-right */}
      <View style={styles.header}>
        <View style={styles.contentContainer}>
          <Text style={styles.greeting}>Hello, Welcome 👋</Text>
          <Text style={styles.name}>{profileData.fullName}</Text>
        </View>

        <Image
          source={profileData.profileImage}
          style={styles.profileImage}
        />
      </View>

      {/* Live Motion Tracking Component */}
      <View style={styles.card}>
        <LiveMotionTracking />
      </View>

      {/* Buttons Section */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleNavigate}>
          <Text style={styles.buttonText}>Error Detection & Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Compare with Professional Model</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surfaceDark,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: Colors.primary,
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
    color: Colors.textPrimary,
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