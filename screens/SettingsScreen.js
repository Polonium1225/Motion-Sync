// screens/SettingsScreen.js
import React, { useState, useEffect, useRef, Component } from 'react';
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
  Platform,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, userProfiles, storage, getUserId, supabase } from '../lib/SupabaseService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import ImageBackground from 'react-native/Libraries/Image/ImageBackground';
import backgroundImage from '../assets/sfgsdh.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserData, useUserSettings, useUserProgress } from '../hooks/useUserData';

// Error Boundary Component
class SettingsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SettingsScreen Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Ionicons name="warning" size={48} color="#ff4c48" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>
              The settings screen encountered an error. Please try again.
            </Text>
            <TouchableOpacity 
              onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={styles.errorButton}
            >
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// Main Settings Screen Component
function SettingsScreen({ setIsLoggedIn, route, navigation: propNavigation }) {
  // Handle navigation from both props and hook
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;

  // Handle setIsLoggedIn from both props and route params
  const routeSetIsLoggedIn = route?.params?.setIsLoggedIn;
  const handleSetIsLoggedIn = setIsLoggedIn || routeSetIsLoggedIn || (() => {
    console.warn('setIsLoggedIn function not provided to SettingsScreen');
    // Fallback - try to navigate to login screen
    try {
      navigation?.navigate('Auth');
    } catch (error) {
      console.error('Cannot navigate to Auth screen:', error);
    }
  });

  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);
  const [selectedImageObj, setSelectedImageObj] = useState(null);
  
  // Premium Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  
  // Use UserDataManager hooks with error handling
  const { 
    userData, 
    isInitialized, 
    updateProfile, 
    updateSettings: updateUserSettings,
    exportData,
    resetData,
    forceSync,
    error: userDataError
  } = useUserData();
  
  const { 
    settings, 
    updateSettings: updateSettingsHook,
    error: settingsError
  } = useUserSettings();
  
  const { progress, error: progressError } = useUserProgress();
  
  // Local settings states (synced with UserDataManager)
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [realTimeFeedback, setRealTimeFeedback] = useState(true);
  const [voiceInstructions, setVoiceInstructions] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const premiumModalAnim = useRef(new Animated.Value(0)).current;

  // Premium Plans Configuration
  const premiumPlans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: 50,
      currency: 'DH',
      duration: '1 Month',
      savings: null,
      popular: false,
      features: [
        'Unlimited AI Motion Analysis',
        'Premium Badge',
        'Exclusive Community Features',
        'Competition Entry & Prizes',
        'Priority Support',
        'Advanced Analytics'
      ]
    },
    {
      id: 'quarterly',
      name: '3 Months',
      price: 125,
      currency: 'DH',
      duration: '3 Months',
      savings: '17% Off',
      popular: true,
      features: [
        'Everything in Monthly',
        'Save 25 DH',
        'Quarterly Progress Reports',
        'Custom Training Plans',
        'Early Feature Access'
      ]
    },
    {
      id: 'yearly',
      name: 'Annual',
      price: 449,
      currency: 'DH',
      duration: '12 Months',
      savings: '25% Off',
      popular: false,
      features: [
        'Everything in 3 Months',
        'Save 151 DH',
        'Yearly Competition Pass',
        '1-on-1 Coach Session',
        'Personalized Nutrition Guide',
        'VIP Community Status'
      ]
    }
  ];

  // Handle navigation safety check with focus effect
  useFocusEffect(
    React.useCallback(() => {
      if (!navigation) {
        console.error('Navigation prop is missing in SettingsScreen');
        return;
      }
    }, [navigation])
  );

  // Handle any errors from hooks
  useEffect(() => {
    if (userDataError || settingsError || progressError) {
      console.error('Hook errors:', { userDataError, settingsError, progressError });
      Alert.alert(
        'Data Loading Error',
        'Some settings data could not be loaded. Please try refreshing.',
        [{ text: 'OK' }]
      );
    }
  }, [userDataError, settingsError, progressError]);

  // Sync local state with UserDataManager settings
  useEffect(() => {
    if (settings && isInitialized) {
      try {
        setNotifications(settings.notifications?.workoutReminders ?? true);
        setSoundEffects(settings.notifications?.soundEffects ?? true);
        setHapticFeedback(settings.notifications?.hapticFeedback ?? true);
        setRealTimeFeedback(settings.motionAnalysis?.realTimeFeedback ?? true);
        setVoiceInstructions(settings.motionAnalysis?.voiceInstructions ?? true);
        setDataSharing(settings.privacy?.dataSharing ?? false);
        
        // Check premium status
        setIsPremium(userData?.profile?.isPremium || false);
        setCurrentPlan(userData?.profile?.subscriptionPlan || null);
      } catch (error) {
        console.error('Error syncing settings:', error);
      }
    }
  }, [settings, isInitialized, userData]);

  // Load current user data with better error handling
  useEffect(() => {
    const loadUser = async () => {
      if (!isInitialized) return;
    
      try {
        setLoading(true);
        
        // Load Supabase user data with error handling
        const user = await auth.getCurrentUser();
        if (!user) {
          throw new Error('No authenticated user found');
        }
        
        setUserId(user.id);
        
        // Use UserDataManager profile data if available
        if (userData?.profile) {
          const profile = userData.profile;
          setName(profile.name || user.user_metadata?.name || '');
          
          if (profile.avatar && profile.avatar !== 'avatar.png') {
            console.log('Loading avatar image from:', profile.avatar);
            setImage(profile.avatar);
          }
        } else {
          // Fallback to direct Supabase query
          setName(user.user_metadata?.name || '');
          
          try {
            const profile = await userProfiles.getProfileByUserId(user.id);
            setProfileDoc(profile);
            
            if (profile?.avatar && profile.avatar !== 'avatar.png') {
              console.log('Loading avatar image from:', profile.avatar);
              setImage(profile.avatar);
            }
          } catch (profileError) {
            console.warn('Could not load profile from database:', profileError);
            // Continue without profile data
          }
        }
        
      } catch (error) {
        console.error('Load user error:', error);
        Alert.alert(
          'Profile Load Error', 
          'Could not load your profile. Some features may not work correctly.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [isInitialized, userData]);

  // Animation effects
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

  // Animate premium modal
  useEffect(() => {
    if (showPremiumModal) {
      Animated.spring(premiumModalAnim, {
        toValue: 1,
        speed: 14,
        bounciness: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(premiumModalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showPremiumModal]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos');
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
  
      console.log('Image picker result:', result);
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate file size (5MB limit)
        if (asset.fileSize && asset.fileSize > 5242880) {
          Alert.alert(
            'Image Too Large', 
            'Please select an image smaller than 5MB',
            [{ text: 'OK' }]
          );
          return;
        }
        
        setImage(asset.uri);
        setSelectedImageObj(asset);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const uploadImage = async (imageObject) => {
    try {
      console.log('Starting image upload process...');
      
      if (!userId) {
        throw new Error('User ID is required for upload');
      }

      // Generate unique filename with proper path
      const fileExt = imageObject.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      console.log('Upload path:', filePath);
      
      // Get the session token for authenticated upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }
      
      // Read file as blob
      const response = await fetch(imageObject.uri);
      if (!response.ok) {
        throw new Error('Failed to read image file');
      }
      
      const blob = await response.blob();
      
      // Upload using Supabase client
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, blob, {
          contentType: imageObject.mimeType || 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
      
    } catch (error) {
      console.error('Upload error details:', error);
      
      if (error.message?.includes('Network request failed')) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      
      if (error.message?.includes('storage')) {
        throw new Error('Storage upload failed. This might be a server configuration issue.');
      }
      
      throw new Error(`Upload failed: ${error.message}`);
    }
  };
  
  // Navigation helper with better error handling
  const navigateToScreen = (screenName, params = {}) => {
    try {
      if (!navigation) {
        throw new Error('Navigation not available');
      }
      navigation.navigate(screenName, params);
    } catch (error) {
      console.error(`Navigation error to ${screenName}:`, error);
      Alert.alert(
        'Navigation Error', 
        `Unable to open ${screenName}. The screen might not be available.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // Quick navigation functions with fallbacks
  const goToAchievements = () => {
    navigateToScreen('BadgesAndMilestonesScreen');
  };

  const goToAIAssistant = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Unlimited AI Assistant access is a premium feature. Upgrade now to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => setShowPremiumModal(true) }
        ]
      );
      return;
    }
    navigateToScreen('aichatscreen');
  };

  const goToHome = () => {
    navigateToScreen('home');
  };

  const goToMotionAnalysis = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Unlimited Motion Analysis is a premium feature. Upgrade now to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => setShowPremiumModal(true) }
        ]
      );
      return;
    }
    navigateToScreen('image_analyser3d');
  };

  const goToGymFinder = () => {
    navigateToScreen('GymFinder');
  };

  const handleSubscribe = async (plan) => {
    try {
      setLoading(true);
      
      Alert.alert(
        'Confirm Subscription',
        `Subscribe to ${plan.name} plan for ${plan.price} ${plan.currency}/${plan.duration}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: async () => {
              try {
                // Update user profile with premium status
                await updateProfile({
                  isPremium: true,
                  subscriptionPlan: plan.id,
                  subscriptionStartDate: new Date().toISOString(),
                  subscriptionEndDate: calculateEndDate(plan.id),
                });
                
                setIsPremium(true);
                setCurrentPlan(plan.id);
                setShowPremiumModal(false);
                
                Alert.alert(
                  'Welcome to Premium!',
                  `You've successfully subscribed to the ${plan.name} plan. Enjoy all premium features!`,
                  [{ text: 'Awesome!' }]
                );
              } catch (error) {
                Alert.alert('Subscription Failed', error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDate = (planId) => {
    const now = new Date();
    switch (planId) {
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        break;
      case 'yearly':
        now.setFullYear(now.getFullYear() + 1);
        break;
    }
    return now.toISOString();
  };

  const saveProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }
  
    try {
      setLoading(true);
      
      let avatarUrl = profileDoc?.avatar || userData?.profile?.avatar;
      if (image && selectedImageObj && !image.includes('supabase')) {
        console.log('Uploading new image...');
        try {
          avatarUrl = await uploadImage(selectedImageObj);
          console.log('Image uploaded with URL:', avatarUrl);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          Alert.alert(
            'Upload Failed',
            'Could not upload image. Profile will be saved without image changes.',
            [{ text: 'OK' }]
          );
        }
      }
      
      const updateData = { 
        name,
        user_id: userId,
      };
  
      if (avatarUrl) {
        updateData.avatar = avatarUrl;
      }
      
      // Update profile in Supabase
      try {
        await userProfiles.updateProfile(userId, updateData);
      } catch (dbError) {
        console.warn('Database update failed:', dbError);
        // Continue with UserDataManager update
      }

      // Update UserDataManager profile
      try {
        await updateProfile({ name, avatar: avatarUrl });
      } catch (udmError) {
        console.warn('UserDataManager update failed:', udmError);
      }
  
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const settingsUpdate = {
        notifications: {
          workoutReminders: notifications,
          soundEffects: soundEffects,
          hapticFeedback: hapticFeedback,
          achievementAlerts: notifications,
          weeklyReports: notifications,
        },
        motionAnalysis: {
          realTimeFeedback: realTimeFeedback,
          voiceInstructions: voiceInstructions,
          difficulty: settings?.motionAnalysis?.difficulty || 'intermediate',
          targetAccuracy: settings?.motionAnalysis?.targetAccuracy || 85,
        },
        privacy: {
          dataSharing: dataSharing,
          analytics: settings?.privacy?.analytics ?? true,
          profileVisibility: settings?.privacy?.profileVisibility || 'private',
        },
        preferences: {
          theme: settings?.preferences?.theme || 'dark',
          units: settings?.preferences?.units || 'metric',
          language: settings?.preferences?.language || 'en'
        }
      };

      await updateSettingsHook(settingsUpdate);
      Alert.alert('Success', 'Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleExportData = async () => {
    try {
      Alert.alert(
        'Export Data',
        'Are you sure you want to export all your data?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: async () => {
              try {
                setLoading(true);
                const exportedData = await exportData();
                
                // Create summary for user
                const summary = {
                  level: exportedData.progress?.level || 1,
                  totalXP: exportedData.progress?.xp || 0,
                  totalSessions: exportedData.progress?.totalSessions || 0,
                  badgesEarned: exportedData.badges?.earned?.length || 0,
                  streak: exportedData.progress?.streak || 0,
                  averageScore: Math.round(exportedData.progress?.averageMotionScore || 0)
                };
                
                Alert.alert(
                  'Export Complete',
                  `Your data has been exported successfully!\n\n` +
                  `Level: ${summary.level}\n` +
                  `Total XP: ${summary.totalXP.toLocaleString()}\n` +
                  `Sessions: ${summary.totalSessions}\n` +
                  `Badges: ${summary.badgesEarned}\n` +
                  `Streak: ${summary.streak} days\n` +
                  `Avg Score: ${summary.averageScore}%`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Export Failed', error.message);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleResetData = async () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your progress, badges, and statistics. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await resetData();
              Alert.alert(
                'Data Reset Complete', 
                'All your progress data has been reset successfully. Your profile information has been preserved.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Reset Failed', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleForceSync = async () => {
    try {
      setLoading(true);
      const success = await forceSync();
      if (success) {
        Alert.alert('Sync Complete', 'Your data has been synchronized with the cloud.');
      } else {
        Alert.alert('Sync Failed', 'Unable to sync with cloud. Please check your connection.');
      }
    } catch (error) {
      Alert.alert('Sync Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout with better error handling
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
              setLoading(true);
              
              // Update user status to offline
              try {
                const user = await auth.getCurrentUser();
                if (user?.id) {
                  await userProfiles.updateStatus(user.id, 'offline');
                }
              } catch (error) {
                console.log('Error setting offline status:', error);
              }
  
              // Clear AsyncStorage and sign out
              try {
                await AsyncStorage.clear();
                await auth.signOut();
              } catch (error) {
                console.log('Error during logout:', error);
              }
  
              // Call the logout handler
              handleSetIsLoggedIn(false);
            } catch (error) {
              console.error('Logout error:', error);
              // Still try to logout even if there were errors
              handleSetIsLoggedIn(false);
            } finally {
              setLoading(false);
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

  // Premium Modal Component
  const PremiumModal = () => (
    <Modal
      visible={showPremiumModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPremiumModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.premiumModalContainer,
            {
              opacity: premiumModalAnim,
              transform: [{
                scale: premiumModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              }]
            }
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.premiumHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPremiumModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.premiumIconContainer}>
                <Ionicons name="diamond" size={50} color="#FFD700" />
              </View>
              
              <Text style={styles.premiumTitle}>Unlock Premium</Text>
              <Text style={styles.premiumSubtitle}>
                Take your fitness journey to the next level
              </Text>
            </View>

            {/* Premium Features */}
            <View style={styles.premiumFeatures}>
              <Text style={styles.featuresTitle}>Premium Benefits</Text>
              <View style={styles.featureItem}>
                <Ionicons name="infinite" size={20} color="#ff4c48" />
                <Text style={styles.featureText}>Unlimited AI Motion Analysis</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="medal" size={20} color="#ff4c48" />
                <Text style={styles.featureText}>Exclusive Premium Badge</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="people" size={20} color="#ff4c48" />
                <Text style={styles.featureText}>VIP Community Features</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="trophy" size={20} color="#ff4c48" />
                <Text style={styles.featureText}>Compete for Prizes in Competitions</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="flash" size={20} color="#ff4c48" />
                <Text style={styles.featureText}>Priority Support & Early Access</Text>
              </View>
            </View>

            {/* Plans */}
            <View style={styles.plansContainer}>
              {premiumPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan?.id === plan.id && styles.selectedPlan,
                    plan.popular && styles.popularPlan
                  ]}
                  onPress={() => setSelectedPlan(plan)}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>MOST POPULAR</Text>
                    </View>
                  )}
                  
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planCurrency}>{plan.currency}</Text>
                  </View>
                  <Text style={styles.planDuration}>{plan.duration}</Text>
                  
                  {plan.savings && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{plan.savings}</Text>
                    </View>
                  )}
                  
                  <View style={styles.planFeatures}>
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <Text key={index} style={styles.planFeatureText}>• {feature}</Text>
                    ))}
                  </View>
                  
                  {selectedPlan?.id === plan.id && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                !selectedPlan && styles.disabledButton
              ]}
              onPress={() => selectedPlan && handleSubscribe(selectedPlan)}
              disabled={!selectedPlan || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.subscribeButtonText}>
                  {selectedPlan ? `Subscribe - ${selectedPlan.price} ${selectedPlan.currency}` : 'Select a Plan'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              Subscriptions auto-renew unless cancelled.
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  // Show loading state while UserDataManager initializes
  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff4c48" />
              <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

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
              <TouchableOpacity 
                onPress={() => navigation?.goBack ? navigation.goBack() : navigation?.navigate('home')} 
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Profile & Settings</Text>
              <TouchableOpacity onPress={handleForceSync} style={styles.syncButton}>
                <Ionicons name="sync" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Premium Status Banner */}
              {!isPremium && (
                <TouchableOpacity 
                  style={styles.premiumBanner}
                  onPress={() => setShowPremiumModal(true)}
                >
                  <View style={styles.premiumBannerContent}>
                    <View style={styles.premiumBannerLeft}>
                      <Ionicons name="diamond" size={30} color="#FFD700" />
                      <View style={styles.premiumBannerText}>
                        <Text style={styles.premiumBannerTitle}>Go Premium</Text>
                        <Text style={styles.premiumBannerSubtitle}>Unlock all features</Text>
                      </View>
                    </View>
                    <View style={styles.premiumBannerRight}>
                      <Text style={styles.premiumBannerPrice}>From 50 DH/month</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFD700" />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Premium Member Badge */}
              {isPremium && (
                <View style={styles.premiumMemberBadge}>
                  <Ionicons name="diamond" size={24} color="#FFD700" />
                  <Text style={styles.premiumMemberText}>Premium Member</Text>
                  <Text style={styles.premiumPlanText}>{currentPlan?.toUpperCase()} PLAN</Text>
                </View>
              )}

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
                    {isPremium && (
                      <View style={styles.premiumProfileBadge}>
                        <Ionicons name="diamond" size={12} color="#FFD700" />
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

              {/* Dashboard Stats from UserDataManager */}
              {progress && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Your Progress</Text>
                  <View style={styles.statsGrid}>
                    <StatCard 
                      title="Level" 
                      value={progress.level || 1} 
                      icon="trending-up"
                      subtitle={`${(progress.xp || 0).toLocaleString()} XP`}
                    />
                    <StatCard 
                      title="Sessions" 
                      value={progress.totalSessions || 0} 
                      icon="fitness"
                      subtitle="Completed"
                    />
                    <StatCard 
                      title="Streak" 
                      value={progress.streak || 0} 
                      icon="flame"
                      subtitle="Days"
                    />
                    <StatCard 
                      title="Avg Score" 
                      value={Math.round(progress.averageMotionScore || 0)} 
                      icon="trophy"
                      subtitle="Motion Quality"
                    />
                    <StatCard 
                      title="Perfect Forms" 
                      value={progress.perfectForms || 0} 
                      icon="checkmark-circle"
                      subtitle="Achieved"
                    />
                    <StatCard 
                      title="Badges" 
                      value={userData?.badges?.earned?.length || 0} 
                      icon="medal"
                      subtitle="Earned"
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
                    style={[styles.quickActionButton, !isPremium && styles.premiumFeature]}
                    onPress={goToAIAssistant}
                  >
                    <Ionicons name="chatbubbles" size={24} color="#ff4c48" />
                    <Text style={styles.quickActionText}>AI Assistant</Text>
                    {!isPremium && <Ionicons name="lock-closed" size={16} color="#FFD700" style={styles.lockIcon} />}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickActionButton, !isPremium && styles.premiumFeature]}
                    onPress={goToMotionAnalysis}
                  >
                    <Ionicons name="camera" size={24} color="#ff4c48" />
                    <Text style={styles.quickActionText}>Motion Analysis</Text>
                    {!isPremium && <Ionicons name="lock-closed" size={16} color="#FFD700" style={styles.lockIcon} />}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={goToGymFinder}
                  >
                    <Ionicons name="location" size={24} color="#ff4c48" />
                    <Text style={styles.quickActionText}>Gym Finder</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subscription Management */}
              {!isPremium && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Premium</Text>
                  <TouchableOpacity 
                    style={styles.premiumUpgradeButton}
                    onPress={() => setShowPremiumModal(true)}
                  >
                    <Ionicons name="diamond" size={24} color="#FFD700" />
                    <Text style={styles.premiumUpgradeText}>Upgrade to Premium</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              )}

              {isPremium && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Subscription</Text>
                  <View style={styles.settingsContainer}>
                    <SettingItem
                      title="Current Plan"
                      subtitle={`Premium ${currentPlan?.charAt(0).toUpperCase()}${currentPlan?.slice(1) || ''}`}
                      type="button"
                      onPress={() => setShowPremiumModal(true)}
                    />
                    <SettingItem
                      title="Manage Subscription"
                      subtitle="Change or cancel your plan"
                      type="button"
                      onPress={() => Alert.alert('Manage Subscription', 'Subscription management coming soon!')}
                    />
                  </View>
                </View>
              )}

              {/* Motion Analysis Settings */}
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
                    onPress={handleExportData}
                  />
                  <SettingItem
                    title="Reset All Data"
                    subtitle="Permanently delete all progress"
                    type="button"
                    onPress={handleResetData}
                  />
                </View>
              </View>

              {/* App Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.settingsContainer}>
                  <SettingItem
                    title="App Version"
                    subtitle="1.0.0 (with UserDataManager v2)"
                    type="button"
                  />
                  <SettingItem
                    title="Data Sync Status"
                    subtitle={userData?.profile?.lastActive ? 
                      `Last synced: ${new Date(userData.profile.lastActive).toLocaleDateString()}` : 
                      'Never synced'
                    }
                    type="button"
                    onPress={handleForceSync}
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
                  onPress={handleUpdateSettings}
                  style={styles.actionButton}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>Save Settings</Text>
                  )}
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
      
      {/* Premium Modal */}
      <PremiumModal />
    </SafeAreaView>
  );
}

// Export with Error Boundary wrapper
export default function SettingsScreenWrapper(props) {
  return (
    <SettingsErrorBoundary>
      <SettingsScreen {...props} />
    </SettingsErrorBoundary>
  );
}

// StyleSheet
const styles = StyleSheet.create({
  // Error Boundary Styles
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#ff4c48',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Main Component Styles
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  
  // Premium Banner
  premiumBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumBannerText: {
    marginLeft: 12,
  },
  premiumBannerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumBannerSubtitle: {
    color: 'rgba(255, 215, 0, 0.8)',
    fontSize: 14,
  },
  premiumBannerRight: {
    alignItems: 'flex-end',
  },
  premiumBannerPrice: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },

  // Premium Member Badge
  premiumMemberBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumMemberText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  premiumPlanText: {
    color: 'rgba(255, 215, 0, 0.8)',
    fontSize: 12,
    marginLeft: 8,
  },

  // Sections
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  // Profile Section
  profileSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
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
    borderWidth: 3,
    borderColor: '#ff4c48',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ff4c48',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ff4c48',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  premiumProfileBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff4c48',
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  statSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  premiumFeature: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  lockIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  // Premium Upgrade Button
  premiumUpgradeButton: {
    backgroundColor: 'linear-gradient(45deg, #FFD700, #FFA500)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumUpgradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },

  // Settings
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },

  // Action Buttons
  actionButton: {
    backgroundColor: '#ff4c48',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 76, 72, 0.5)',
  },

  // Premium Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    maxWidth: 400,
  },
  premiumHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  premiumSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  premiumFeatures: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginLeft: 12,
  },
  plansContainer: {
    padding: 24,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  popularPlan: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  planPrice: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  planCurrency: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginLeft: 4,
  },
  planDuration: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 12,
  },
  savingsBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planFeatures: {
    marginBottom: 16,
  },
  planFeatureText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  subscribeButton: {
    backgroundColor: '#ff4c48',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});