import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ImageBackground, Animated, ScrollView } from 'react-native';
import BadgesMilestoneCard from '../components/BadgesMilestoneCard';
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

  // New state for XP and level progress
  const [userXP, setUserXP] = useState(2750); // Current XP points
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xpForCurrentLevel, setXpForCurrentLevel] = useState(0);
  const [xpForNextLevel, setXpForNextLevel] = useState(1000);
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
    navigation1.navigate('image_analyser3d'); // Replace with your actual route (e.g., CameraScreen)
  };

  // New navigation handlers
  const handleGymSearch = () => {
    navigation1.navigate('GymFinder'); // You'll need to create this screen
  };

  const handleAIAssistant = () => {
    navigation1.navigate('aichatscreen'); // You'll need to create this screen
  };

  const handleNotifications = () => {
    navigation1.navigate('Notifications'); // You'll need to create this screen
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

  // Load profile data and notifications when component mounts
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

          // Load user level and XP if available
          if (profile.level) {
            setCurrentLevel(profile.level);
          }
          if (profile.xp) {
            setUserXP(profile.xp);
          }

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

        // Load notifications (you can customize this based on your backend)
        await loadNotifications(userId);

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
          const savedLevel = await AsyncStorage.getItem('user_level');
          const savedXP = await AsyncStorage.getItem('user_xp');
          
          if (savedProfileName || savedProfileImageUri) {
            setProfileData({
              fullName: savedProfileName || 'Name',
              profileImage: savedProfileImageUri ? { uri: savedProfileImageUri } : require('../assets/icon.png'),
            });
          }
          
          if (savedLevel) {
            setCurrentLevel(parseInt(savedLevel));
          }
          if (savedXP) {
            setUserXP(parseInt(savedXP));
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

  // Load notifications function
  const loadNotifications = async (userId) => {
    try {
      // Mock notification loading - replace with your actual API calls
      const mockNotifications = {
        messages: Math.floor(Math.random() * 5), // Random number for demo
        news: Math.floor(Math.random() * 3),
        hasNewContent: Math.random() > 0.5
      };
      
      setNotifications(mockNotifications);
      
      // Start pulse animation if there are notifications
      if (mockNotifications.messages > 0 || mockNotifications.news > 0) {
        startNotificationPulse();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
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

  // Handle level change
  const handleLevelChange = async (value) => {
    setCurrentLevel(Math.round(value));
    try {
      await AsyncStorage.setItem('user_level', Math.round(value).toString());
      // You can also update this in your database
    } catch (error) {
      console.error('Failed to save level:', error);
    }
  };

  // XP Progress Bar Component (non-interactive)
  const XPProgressBar = () => {
    const levelData = calculateLevelFromXP(userXP);
    const progressPercentage = currentLevel >= 10 ? 100 : 
      (levelData.progressXP / levelData.requiredXP) * 100;
    
    const progressBarWidth = useRef(new Animated.Value(progressPercentage)).current;

    useEffect(() => {
      Animated.timing(progressBarWidth, {
        toValue: progressPercentage,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, [progressPercentage]);

    return (
      <View style={styles.xpProgressContainer}>
        {/* XP Numbers */}
        <View style={styles.xpInfoRow}>
          <Text style={styles.xpText}>
            {currentLevel >= 10 ? 'MAX LEVEL' : `${levelData.progressXP} / ${levelData.requiredXP} XP`}
          </Text>
          <Text style={styles.totalXpText}>Total: {userXP.toLocaleString()} XP</Text>
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
                  currentLevel > i + 1 && styles.levelMarkerPassed
                ]} 
              />
            ))}
          </View>
        </View>
        
        {/* Next level info */}
        {currentLevel < 10 && (
          <Text style={styles.nextLevelText}>
            {xpForNextLevel - userXP} XP to Level {currentLevel + 1}
          </Text>
        )}
      </View>
    );
  };

  // Calculate level and XP progress
  const calculateLevelFromXP = (xp) => {
    // XP required for each level (exponential growth)
    const xpRequirements = [
      0,     // Level 1: 0 XP
      1000,  // Level 2: 1000 XP
      2500,  // Level 3: 2500 XP
      4500,  // Level 4: 4500 XP
      7000,  // Level 5: 7000 XP
      10000, // Level 6: 10000 XP
      14000, // Level 7: 14000 XP
      19000, // Level 8: 19000 XP
      25000, // Level 9: 25000 XP
      32000, // Level 10: 32000 XP
    ];

    let level = 1;
    for (let i = 0; i < xpRequirements.length; i++) {
      if (xp >= xpRequirements[i]) {
        level = i + 1;
      } else {
        break;
      }
    }

    const currentLevelXP = level > 1 ? xpRequirements[level - 1] : 0;
    const nextLevelXP = level < 10 ? xpRequirements[level] : xpRequirements[9];
    
    return {
      level: Math.min(level, 10),
      currentLevelXP,
      nextLevelXP,
      progressXP: xp - currentLevelXP,
      requiredXP: nextLevelXP - currentLevelXP
    };
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
                <Image source={profileData.profileImage} style={styles.profileImage} />
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
              <Text style={styles.levelLabel}>Level {currentLevel}</Text>
              <Text style={styles.levelDescription}>{getLevelDescription(currentLevel)}</Text>
            </View>
            <XPProgressBar />
          </View>

          {/* Notifications Section */}
          <View style={styles.notificationsContainer}>
            <Text style={styles.sectionTitle}>Updates & Notifications</Text>
            <View style={styles.notificationRow}>
              <TouchableOpacity style={styles.notificationItem} onPress={handleNotifications}>
                <Text style={styles.notificationIcon}>💬</Text>
                <View>
                  <Text style={styles.notificationItemTitle}>Messages</Text>
                  <Text style={styles.notificationItemCount}>
                    {notifications.messages > 0 ? `${notifications.messages} new` : 'No new messages'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.notificationItem} onPress={handleNotifications}>
                <Text style={styles.notificationIcon}>🔔</Text>
                <View>
                  <Text style={styles.notificationItemTitle}>News & Updates</Text>
                  <Text style={styles.notificationItemCount}>
                    {notifications.news > 0 ? `${notifications.news} new` : 'No new updates'}
                  </Text>
                </View>
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
    transform: [{ translateX: -20 }], // Better centering method
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
    color: Colors.primary, // Using vibrant primary color
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
  levelIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  levelIndicatorText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.6,
  },
  // Notifications Styles
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