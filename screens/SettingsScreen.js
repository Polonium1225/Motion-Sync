// screens/SettingsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  Animated, 
  ScrollView,
  Switch,
  SafeAreaView,
  Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { account, databases, storage, ID, Query, DATABASE_ID, COLLECTIONS, userProfiles } from '../lib/AppwriteService';
import { Client } from 'appwrite';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import ImageBackground from 'react-native/Libraries/Image/ImageBackground';
import backgroundImage from '../assets/sfgsdh.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userDataManager from '../lib/UserDataManager'; // Import the data manager

export default function SettingsScreen({ setIsLoggedIn }) {
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);
  const [selectedImageObj, setSelectedImageObj] = useState(null);
  
  // User data from data manager
  const [userStats, setUserStats] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  
  // Settings states
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [realTimeFeedback, setRealTimeFeedback] = useState(true);
  const [voiceInstructions, setVoiceInstructions] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  const navigation = useNavigation();

  const PROJECT_ID = '67d0bb27002cfc0b22d2';
  const API_ENDPOINT = 'https://cloud.appwrite.io/v1';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  // Load current user data and stats
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        
        // Load Appwrite user data
        const user = await account.get();
        setUserId(user.$id);
        setName(user.name || '');
        
        const profiles = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          [Query.equal('userId', user.$id)]
        );

        if (profiles.documents.length > 0) {
          const profile = profiles.documents[0];
          setProfileDoc(profile);
          
          if (profile.avatar) {
            try {
              const imageUrl = `${API_ENDPOINT}/storage/buckets/profile_images/files/${profile.avatar}/view?project=${PROJECT_ID}`;
              console.log('Loading avatar image from:', imageUrl);
              setImage(imageUrl);
            } catch (error) {
              console.log('Error getting file view:', error);
            }
          }
        }

        // Load user data manager stats
        await loadUserDataManagerStats();
        
      } catch (error) {
        console.log('Load user error:', error);
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const loadUserDataManagerStats = async () => {
    try {
      // Initialize data manager if not already done
      if (!userDataManager.isInitialized) {
        await userDataManager.initialize();
      }
      
      const progress = userDataManager.getUserProgress();
      const badges = userDataManager.getUserBadges();
      const achievements = userDataManager.getUserAchievements();
      const settings = userDataManager.getUserSettings();
      
      setUserStats({
        level: progress?.level || 1,
        xp: progress?.xp || 0,
        totalSessions: progress?.totalSessions || 0,
        perfectForms: progress?.perfectForms || 0,
        streak: progress?.streak || 0,
        averageScore: progress?.averageMotionScore || 0,
        totalBadges: badges?.earned?.length || 0,
        totalAchievements: achievements?.totalBadgesEarned || 0
      });

      if (settings) {
        setUserSettings(settings);
        setNotifications(settings.notifications?.workoutReminders ?? true);
        setSoundEffects(settings.notifications?.soundEffects ?? true);
        setHapticFeedback(settings.notifications?.hapticFeedback ?? true);
        setRealTimeFeedback(settings.motionAnalysis?.realTimeFeedback ?? true);
        setVoiceInstructions(settings.motionAnalysis?.voiceInstructions ?? true);
        setDataSharing(settings.privacy?.dataSharing ?? false);
      }
      
    } catch (error) {
      console.error('Error loading user data manager stats:', error);
    }
  };

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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setSelectedImageObj(result.assets[0]);
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const uploadImage = async (imageObject) => {
    try {
      const fileId = ID.unique();
      console.log('Generated file ID:', fileId);
      
      const formData = new FormData();
      formData.append('fileId', fileId);
      formData.append('file', {
        uri: imageObject.uri,
        type: imageObject.mimeType || 'image/jpeg',
        name: imageObject.fileName || 'upload.jpg'
      });

      console.log('FormData prepared with file:', {
        uri: imageObject.uri,
        type: imageObject.mimeType || 'image/jpeg',
        name: imageObject.fileName || 'upload.jpg'
      });
      
      const response = await fetch(
        `https://cloud.appwrite.io/v1/storage/buckets/profile_images/files`,
        {
          method: 'POST',
          headers: {
            'X-Appwrite-Project': PROJECT_ID,
          },
          body: formData,
        }
      );

      const result = await response.json();
      console.log('Upload response:', result);

      if (response.ok) {
        return result.$id;
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload image error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  // Navigation helper with error handling
  const navigateToScreen = (screenName, params = {}) => {
    try {
      navigation.navigate(screenName, params);
    } catch (error) {
      console.error(`Navigation error to ${screenName}:`, error);
      Alert.alert(
        'Navigation Error', 
        `Unable to navigate to ${screenName}. Please ensure the screen is properly configured.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // Quick navigation functions
  const goToAchievements = () => {
    navigateToScreen('BadgesAndMilestonesScreen');
  };

  const goToAIAssistant = () => {
    navigateToScreen('aichatscreen');
  };

  const goToHome = () => {
    navigateToScreen('home');
  };

  const goToMotionAnalysis = () => {
    navigateToScreen('image_analyser3d');
  };

  const goToGymFinder = () => {
    navigateToScreen('GymFinder');
  };

  const saveProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    try {
      setLoading(true);
      
      await account.updateName(name);
      
      let avatarId = profileDoc?.avatar;
      if (image && selectedImageObj && !image.includes('profile_images')) {
        console.log('Uploading new image...');
        avatarId = await uploadImage(selectedImageObj);
        console.log('Image uploaded with ID:', avatarId);
      }
      
      const updateData = { 
        name,
        userId,
        status: profileDoc?.status || 'online',
      };

      if (avatarId) {
        updateData.avatar = avatarId;
      }
      
      if (profileDoc) {
        console.log('Updating existing profile:', profileDoc.$id);
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          profileDoc.$id,
          updateData
        );
      } else {
        console.log('Creating new profile');
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          ID.unique(),
          updateData
        );
      }

      // Update user data manager profile
      await userDataManager.updateUserProfile({ name });

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      const settingsUpdate = {
        notifications: {
          workoutReminders: notifications,
          soundEffects: soundEffects,
          hapticFeedback: hapticFeedback,
        },
        motionAnalysis: {
          realTimeFeedback: realTimeFeedback,
          voiceInstructions: voiceInstructions,
        },
        privacy: {
          dataSharing: dataSharing,
        }
      };

      await userDataManager.updateSettings(settingsUpdate);
      Alert.alert('Success', 'Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                const user = await account.get();
                await userProfiles.safeUpdateStatus(user.$id, 'offline');
              } catch (error) {
                console.log('Error setting offline status:', error);
              }

              await AsyncStorage.clear();
              await account.deleteSessions();

              setIsLoggedIn(false);
            } catch (error) {
              console.error('Logout error:', error);
              setIsLoggedIn(false);
            }
          }
        }
      ]
    );
  };

  const StatCard = ({ title, value, icon, subtitle }) => (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={24} color="#ff4c48" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const SettingItem = ({ title, subtitle, value, onValueChange, type = 'switch', onPress }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={type === 'button' ? onPress : undefined}
      disabled={type === 'switch'}
    >
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#ff4c48' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.overlay}>
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Profile & Settings</Text>
              <View style={styles.headerSpace} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Profile Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile</Text>
                <View style={styles.profileSection}>
                  <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.profileImage} />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderText}>{name.charAt(0) || 'U'}</Text>
                      </View>
                    )}
                    <View style={styles.editIconContainer}>
                      <Ionicons name="camera" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>

                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your Name"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    style={styles.input}
                  />

                  <TouchableOpacity
                    onPress={saveProfile}
                    disabled={loading}
                    style={[styles.actionButton, loading && styles.disabledButton]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>Save Profile</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dashboard Stats */}
              {userStats && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Your Progress</Text>
                  <View style={styles.statsGrid}>
                    <StatCard 
                      title="Level" 
                      value={userStats.level} 
                      icon="trending-up"
                      subtitle={`${userStats.xp} XP`}
                    />
                    <StatCard 
                      title="Sessions" 
                      value={userStats.totalSessions} 
                      icon="fitness"
                      subtitle="Completed"
                    />
                    <StatCard 
                      title="Streak" 
                      value={userStats.streak} 
                      icon="flame"
                      subtitle="Days"
                    />
                    <StatCard 
                      title="Avg Score" 
                      value={userStats.averageScore} 
                      icon="trophy"
                      subtitle="Motion Quality"
                    />
                  </View>
                </View>
              )}

              {/* Quick Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={goToAchievements}
                  >
                    <Ionicons name="trophy" size={24} color="#ff4c48" />
                    <Text style={styles.quickActionText}>Achievements</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={goToAIAssistant}
                  >
                    <Ionicons name="chatbubbles" size={24} color="#ff4c48" />
                    <Text style={styles.quickActionText}>AI Assistant</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* App Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Motion Analysis</Text>
                <View style={styles.settingsContainer}>
                  <SettingItem
                    title="Real-time Feedback"
                    subtitle="Get instant form corrections"
                    value={realTimeFeedback}
                    onValueChange={setRealTimeFeedback}
                  />
                  <SettingItem
                    title="Voice Instructions"
                    subtitle="Hear audio guidance during workouts"
                    value={voiceInstructions}
                    onValueChange={setVoiceInstructions}
                  />
                </View>
              </View>

              {/* Notifications */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifications & Sounds</Text>
                <View style={styles.settingsContainer}>
                  <SettingItem
                    title="Workout Reminders"
                    subtitle="Daily motivation notifications"
                    value={notifications}
                    onValueChange={setNotifications}
                  />
                  <SettingItem
                    title="Sound Effects"
                    subtitle="Audio feedback for interactions"
                    value={soundEffects}
                    onValueChange={setSoundEffects}
                  />
                  <SettingItem
                    title="Haptic Feedback"
                    subtitle="Vibration for touch interactions"
                    value={hapticFeedback}
                    onValueChange={setHapticFeedback}
                  />
                </View>
              </View>

              {/* Privacy Settings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Privacy & Data</Text>
                <View style={styles.settingsContainer}>
                  <SettingItem
                    title="Data Sharing"
                    subtitle="Help improve MotionSync with anonymous usage data"
                    value={dataSharing}
                    onValueChange={setDataSharing}
                  />
                  <SettingItem
                    title="Export Data"
                    subtitle="Download your workout data"
                    type="button"
                    onPress={() => Alert.alert('Export Data', 'Feature coming soon!')}
                  />
                </View>
              </View>

              {/* App Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.settingsContainer}>
                  <SettingItem
                    title="App Version"
                    subtitle="1.0.0"
                    type="button"
                  />
                  <SettingItem
                    title="Privacy Policy"
                    subtitle="Read our privacy policy"
                    type="button"
                    onPress={() => Alert.alert('Privacy Policy', 'Feature coming soon!')}
                  />
                  <SettingItem
                    title="Terms of Service"
                    subtitle="Read our terms"
                    type="button"
                    onPress={() => Alert.alert('Terms of Service', 'Feature coming soon!')}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.section}>
                <TouchableOpacity
                  onPress={updateSettings}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Save Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleLogout}
                  disabled={loading}
                  style={[styles.actionButton, styles.logoutButton]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.actionButtonText}>Logout</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.bottomPadding} />
            </ScrollView>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpace: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  profileSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ff4c48',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff4c48',
  },
  placeholderText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '600',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4c48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    width: '100%',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    width: '48%',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statTitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#ff4c48',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderColor: '#ff4c48',
    borderWidth: 2,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButton: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomPadding: {
    height: 50,
  },
});