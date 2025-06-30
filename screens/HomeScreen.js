import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ImageBackground, Animated, ScrollView } from 'react-native';
import BadgesMilestoneCard from '../components/BadgesMilestoneCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, userProfiles, getUserConversations } from '../lib/AppwriteService';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';
import { useUserData, useUserProgress } from '../hooks/useUserData';

import backgroundImage from '../assets/sfgsdh.png';

const DEFAULT_AVATAR = require('../assets/icon.png');

export default function HomeScreen({ navigation, setIsLoggedIn }) {
  const {
    userData,
    isInitialized,
    loading: userDataLoading,
    updateProfile,
    forceSync
  } = useUserData();

  const {
    progress,
    levelProgress,
    addWorkoutSession
  } = useUserProgress();

  const [profileData, setProfileData] = useState({
    profileImage: DEFAULT_AVATAR,
    fullName: 'Name',
  });

  const [notifications, setNotifications] = useState({
    messages: 0,
    news: 0,
    hasNewContent: false
  });

  // Scroll indicator state
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  const navigation1 = useNavigation();
  const scrollViewRef = useRef(null);

  const handleNavigate = () => {
    navigation1.navigate('image_analyser3d');
  };

  const handleGymSearch = () => {
    navigation1.navigate('GymFinder');
  };

  const handleAIAssistant = () => {
    navigation1.navigate('aichatscreen');
  };

  const handleNotifications = () => {
    navigation1.navigate('Notifications');
  };

  const PROJECT_ID = '685ebdb90007d578e80d';
  const API_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const notificationPulse = useRef(new Animated.Value(1)).current;
  
  // Scroll indicator animations
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const scrollIndicatorBounce = useRef(new Animated.Value(0)).current;

  // Function to get unread message count
  const getUnreadMessageCount = async (userId) => {
    try {
      // Get all conversations for the user
      const conversations = await getUserConversations(userId);
      
      let totalUnreadCount = 0;
      
      for (const conversation of conversations) {
        // Check if there are unread messages in this conversation
        // You'll need to implement this based on your message schema
        // This is a placeholder - replace with actual unread count logic
        const unreadCount = await getConversationUnreadCount(conversation.$id, userId);
        totalUnreadCount += unreadCount;
      }
      
      return totalUnreadCount;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  };

  // Helper function to get unread count for a specific conversation
  const getConversationUnreadCount = async (conversationId, userId) => {
    try {
      // This is a placeholder implementation
      // You need to modify this based on your message schema
      // For example, if you track read status in messages:
      
      // const unreadMessages = await databases.listDocuments(
      //   DATABASE_ID,
      //   'messages', // Your messages collection ID
      //   [
      //     Query.equal('conversationId', conversationId),
      //     Query.notEqual('senderId', userId), // Messages not sent by current user
      //     Query.equal('isRead', false) // Unread messages
      //   ]
      // );
      // return unreadMessages.total;
      
      // For now, return 0 - replace with actual implementation
      return 0;
    } catch (error) {
      console.error('Error getting conversation unread count:', error);
      return 0;
    }
  };

  // Function to construct profile image URI
  const getProfileImageUri = (avatar) => {
    if (!avatar || avatar === 'avatar.png') {
      return DEFAULT_AVATAR;
    }
    
    try {
      // Construct the direct file view URL
      const imageUri = `${API_ENDPOINT}/storage/buckets/profile_images/files/${avatar}/view?project=${PROJECT_ID}&mode=admin`;
      return { uri: imageUri };
    } catch (error) {
      console.error('Error constructing image URI:', error);
      return DEFAULT_AVATAR;
    }
  };

  // Load profile data and notifications when component mounts
  useEffect(() => {
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

        // Update profile data from UserDataManager if available
        if (userData?.profile) {
          const profile = userData.profile;
          let newProfileData = {
            fullName: profile.name || user.name || 'Name',
            profileImage: getProfileImageUri(profile.avatar),
          };

          setProfileData(newProfileData);
        } else {
          // Fallback: Try to get profile directly from Appwrite
          try {
            const profile = await userProfiles.getProfileByUserId(userId);
            const newProfileData = {
              fullName: profile.name || user.name || 'Name',
              profileImage: getProfileImageUri(profile.avatar),
            };
            setProfileData(newProfileData);
          } catch (profileError) {
            console.log('Error getting profile, using defaults:', profileError);
            // Use default values
            setProfileData({
              fullName: user.name || 'Name',
              profileImage: DEFAULT_AVATAR,
            });
          }
        }

        // Load notifications with actual unread message count
        await loadNotifications(userId);

        // Update AsyncStorage for offline fallback
        await AsyncStorage.setItem('profile_name', userData?.profile?.name || user.name || 'Name');
        if (userData?.profile?.avatar) {
          await AsyncStorage.setItem('profile_avatar', userData.profile.avatar);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        Alert.alert('Error', 'Failed to load profile data. Using cached data if available.');

        // Fallback to AsyncStorage
        try {
          const savedProfileName = await AsyncStorage.getItem('profile_name');
          const savedProfileAvatar = await AsyncStorage.getItem('profile_avatar');
          
          setProfileData({
            fullName: savedProfileName || 'Name',
            profileImage: savedProfileAvatar ? getProfileImageUri(savedProfileAvatar) : DEFAULT_AVATAR,
          });
        } catch (storageError) {
          console.error('Failed to load from AsyncStorage:', storageError);
        }
      }
    };

    loadProfileData();

    // Reload data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
      if (isInitialized) {
        forceSync(); // Sync user data when screen becomes active
      }
    });

    return unsubscribe;
  }, [navigation, setIsLoggedIn, userData, isInitialized]);

  // Load notifications function with actual unread message count
  const loadNotifications = async (userId) => {
    try {
      // Get actual unread message count
      const unreadMessages = await getUnreadMessageCount(userId);
      
      // Calculate other notifications based on user progress
      const newsCount = userData?.progress?.level > 1 ? 
        Math.floor(userData.progress.level / 2) : 0;

      const calculatedNotifications = {
        messages: unreadMessages,
        news: newsCount,
        hasNewContent: unreadMessages > 0 || newsCount > 0
      };
      
      setNotifications(calculatedNotifications);
      
      // Start pulse animation if there are notifications
      if (calculatedNotifications.messages > 0 || calculatedNotifications.news > 0) {
        startNotificationPulse();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Fallback to default values
      setNotifications({
        messages: 0,
        news: 0,
        hasNewContent: false
      });
    }
  };

  // Notification pulse animation
  const startNotificationPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(notificationPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(notificationPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Scroll indicator bounce animation
  const startScrollIndicatorBounce = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scrollIndicatorBounce, {
          toValue: 5,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scrollIndicatorBounce, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Handle scroll events
  const handleScroll = (event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const currentScrollY = contentOffset.y;
    setScrollY(currentScrollY);

    // Hide scroll indicator when near bottom (within 100px of bottom)
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    
    if (isNearBottom && showScrollIndicator) {
      setShowScrollIndicator(false);
      Animated.timing(scrollIndicatorOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!isNearBottom && !showScrollIndicator && currentScrollY < 200) {
      setShowScrollIndicator(true);
      Animated.timing(scrollIndicatorOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      startScrollIndicatorBounce();
    }
  };

  // XP Progress Bar Component using UserDataManager data
  const XPProgressBar = () => {
    if (!levelProgress) return null;

    const progressBarWidth = useRef(new Animated.Value(levelProgress.progressPercentage)).current;

    useEffect(() => {
      Animated.timing(progressBarWidth, {
        toValue: levelProgress.progressPercentage,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, [levelProgress.progressPercentage]);

    return (
      <View style={styles.xpProgressContainer}>
        {/* XP Numbers */}
        <View style={styles.xpInfoRow}>
          <Text style={styles.xpText}>
            {levelProgress.currentLevel >= 10 ? 'MAX LEVEL' : 
             `${levelProgress.progressXP} / ${levelProgress.requiredXP} XP`}
          </Text>
          <Text style={styles.totalXpText}>Total: {levelProgress.currentXP.toLocaleString()} XP</Text>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground} />
          <Animated.View 
            style={[
              styles.progressBarFill,
              {
                width: progressBarWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                })
              }
            ]} 
          />
          
          {/* Level markers */}
          <View style={styles.levelMarkers}>
            {Array.from({ length: 9 }, (_, i) => (
              <View 
                key={i} 
                style={[
                  styles.levelMarker,
                  { left: `${((i + 1) / 10) * 100}%` },
                  levelProgress.currentLevel > i + 1 && styles.levelMarkerPassed
                ]} 
              />
            ))}
          </View>
        </View>
        
        {/* Next level info */}
        {levelProgress.currentLevel < 10 && (
          <Text style={styles.nextLevelText}>
            {levelProgress.xpForNextLevel - levelProgress.currentXP} XP to Level {levelProgress.currentLevel + 1}
          </Text>
        )}
      </View>
    );
  };

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

    // Start scroll indicator bounce animation after a longer delay
    setTimeout(() => {
      startScrollIndicatorBounce();
    }, 3000);
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

  const getLevelDescription = (level) => {
    if (level <= 2) return 'Beginner';
    if (level <= 5) return 'Intermediate';
    if (level <= 8) return 'Advanced';
    return 'Expert';
  };

  // Show loading state while UserDataManager initializes
  if (userDataLoading && !isInitialized) {
    return (
      <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Profile Image in the top-right */}
          <View style={styles.header}>
            <View style={styles.contentContainer}>
              <Text style={styles.greeting}>Hello, Welcome 👋</Text>
              <Text style={styles.name}>{profileData.fullName}</Text>
            </View>
            <TouchableOpacity onPress={handleNotifications}>
              <Animated.View style={[styles.profileImageContainer, { transform: [{ scale: notifications.hasNewContent ? notificationPulse : 1 }] }]}>
                <Image 
                  source={profileData.profileImage} 
                  style={styles.profileImage}
                  defaultSource={DEFAULT_AVATAR}
                  onError={() => {
                    console.log('Image load error, falling back to default');
                    setProfileData(prev => ({ ...prev, profileImage: DEFAULT_AVATAR }));
                  }}
                />
                {(notifications.messages > 0 || notifications.news > 0) && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationText}>
                      {notifications.messages + notifications.news}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Level Progress Section */}
          <View style={styles.levelContainer}>
            <Text style={styles.levelTitle}>Fitness Level Progress</Text>
            <View style={styles.levelSliderContainer}>
              <Text style={styles.levelLabel}>
                Level {progress?.level || 1}
              </Text>
              <Text style={styles.levelDescription}>
                {getLevelDescription(progress?.level || 1)}
              </Text>
            </View>
            <XPProgressBar />
          </View>

          {/* Enhanced Notifications Section with UserDataManager data */}
          <View style={styles.notificationsContainer}>
            <Text style={styles.sectionTitle}>Your Progress Overview</Text>
            <View style={styles.progressOverviewRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressNumber}>{progress?.totalSessions || 0}</Text>
                <Text style={styles.progressLabel}>Total Sessions</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressNumber}>{progress?.perfectForms || 0}</Text>
                <Text style={styles.progressLabel}>Perfect Forms</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressNumber}>{progress?.streak || 0}</Text>
                <Text style={styles.progressLabel}>Current Streak</Text>
              </View>
            </View>
            
            <View style={styles.notificationRow}>
              <TouchableOpacity style={styles.notificationItem} onPress={() => navigation1.navigate('BadgesAndMilestonesScreen')}>
                <Text style={styles.notificationIcon}>🏆</Text>
                <View>
                  <Text style={styles.notificationItemTitle}>Achievements</Text>
                  <Text style={styles.notificationItemCount}>
                    {userData?.badges?.earned?.length || 0} badges earned
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.notificationItem} onPress={() => navigation1.navigate('FindFriendScreen')}>
                <Text style={styles.notificationIcon}>💬</Text>
                <View>
                  <Text style={styles.notificationItemTitle}>Messages</Text>
                  <Text style={styles.notificationItemCount}>
                    {notifications.messages > 0 ? `${notifications.messages} unread` : 'No new messages'}
                  </Text>
                </View>
                {notifications.messages > 0 && (
                  <View style={styles.messageNotificationBadge}>
                    <Text style={styles.messageNotificationText}>{notifications.messages}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Motion Tracking Component */}
          <View style={styles.card}>
            <BadgesMilestoneCard />
          </View>

          {/* Action Cards Section */}
          <View style={styles.actionCardsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.cardsColumn}>
              {/* Gym Finder Card */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={[styles.actionCard, styles.gymCard]} 
                  onPress={handleGymSearch} 
                  onPressIn={handlePressIn} 
                  onPressOut={handlePressOut}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconContainer}>
                      <Text style={styles.cardIcon}>🏋️</Text>
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>Find Nearby Gyms & Sports Facilities</Text>
                      <Text style={styles.cardSubtitle}>Discover fitness centers around you</Text>
                    </View>
                  </View>
                  <View style={styles.cardArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* AI Assistant Card */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={[styles.actionCard, styles.aiCard]} 
                  onPress={handleAIAssistant} 
                  onPressIn={handlePressIn} 
                  onPressOut={handlePressOut}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconContainer}>
                      <Text style={styles.cardIcon}>🤖</Text>
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>AI Fitness Personal Assistant</Text>
                      <Text style={styles.cardSubtitle}>Get personalized workout guidance</Text>
                    </View>
                  </View>
                  <View style={styles.cardArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Scroll Indicator */}
      <Animated.View 
        style={[
          styles.scrollIndicator,
          {
            opacity: scrollIndicatorOpacity,
            transform: [{ translateY: scrollIndicatorBounce }]
          }
        ]}
      >
        <View style={styles.scrollIndicatorContainer}>
          <Text style={styles.scrollIndicatorArrow}>↓</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 40,
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: 10,
    backgroundColor: '#ff4c48',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Scroll Indicator Styles
  scrollIndicator: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -20 }],
    zIndex: 1000,
  },
  scrollIndicatorContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollIndicatorArrow: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Level Slider Styles
  levelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    backdropFilter: 'blur(10px)',
  },
  levelTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  levelSliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelLabel: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  levelDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  // XP Progress Bar Styles
  xpProgressContainer: {
    marginTop: 10,
  },
  xpInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  totalXpText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  progressBarContainer: {
    height: 8,
    position: 'relative',
    marginBottom: 8,
  },
  progressBarBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  progressBarFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  levelMarkers: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  levelMarker: {
    position: 'absolute',
    width: 2,
    height: '120%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    top: '-10%',
  },
  levelMarkerPassed: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  nextLevelText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 5,
  },
  // Enhanced Notifications Styles
  notificationsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  progressOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressNumber: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 3,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  notificationItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationItemCount: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  // Action Cards Styles
  actionCardsContainer: {
    marginTop: 20,
    paddingBottom: 30,
  },
  cardsColumn: {
    flexDirection: 'column',
    marginTop: 15,
  },
  actionCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gymCard: {
    borderWidth: 2,
    borderColor: '#ff4c48',
    backgroundColor: 'rgba(255, 76, 72, 0.1)',
  },
  aiCard: {
    borderWidth: 2,
    borderColor: '#ff4c48',
    backgroundColor: 'rgba(255, 76, 72, 0.1)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 16,
  },
  cardArrow: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  arrowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginTop: 20,
    paddingBottom: 30,
  },
  card: {
    paddingTop: 20,
  },
  contentContainer: {
    flex: 1,
  },
});