import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import Colors from './constants/Colors';
import Fonts from './constants/fonts';
import userDataManager from './lib/UserDataManager';

const MyTheme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surfaceDark,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.primary,
  },
  fonts: {
    regular: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.regular,
    },
    medium: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.medium, 
    },
    light: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.light,
    },
    thin: {
      fontFamily: undefined,
      fontWeight: Fonts.weights.thin,
    },
  },
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [userDataReady, setUserDataReady] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState('Initializing app...');

  // Initialize app and UserDataManager
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Step 1: Basic app initialization
        setInitializationStatus('Loading resources...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate font loading

        // Step 2: Initialize UserDataManager
        setInitializationStatus('Setting up user data...');
        console.log('Initializing UserDataManager...');
        
        const userDataSuccess = await userDataManager.initialize();
        
        if (userDataSuccess) {
          console.log('UserDataManager initialized successfully');
          setInitializationStatus('Setting up notifications...');
          
          // Set up global event listeners for user achievements
          userDataManager.addListener((eventType, data, fullUserData) => {
            switch (eventType) {
              case 'levelUp':
                // Show level up celebration
                setTimeout(() => {
                  Alert.alert(
                    '🎉 Level Up!', 
                    `Congratulations! You've reached Level ${data.newLevel}!\n\nYou now have ${data.totalXP.toLocaleString()} total XP!`,
                    [{ text: 'Awesome!', style: 'default' }]
                  );
                }, 1000); // Delay to ensure UI is ready
                break;
                
              case 'badgeUnlocked':
                // Show badge unlock notification
                setTimeout(() => {
                  Alert.alert(
                    '🏆 Badge Unlocked!', 
                    `You've earned: ${data.title}\n\n${data.description}`,
                    [{ text: 'Cool!', style: 'default' }]
                  );
                }, 1000);
                break;
                
              case 'milestoneCompleted':
                // Show milestone completion
                setTimeout(() => {
                  Alert.alert(
                    '✅ Milestone Complete!', 
                    `${data.title}\n\n+${data.xp} XP earned!`,
                    [{ text: 'Nice!', style: 'default' }]
                  );
                }, 1000);
                break;
                
              case 'sessionAdded':
                console.log('Workout session added:', data);
                break;
                
              case 'dataUpdated':
                console.log('User data synchronized');
                break;
                
              case 'initialized':
                console.log('UserDataManager fully initialized');
                break;
                
              default:
                console.log(`UserDataManager event: ${eventType}`, data);
            }
          });
          
          setUserDataReady(true);
        } else {
          console.warn('UserDataManager initialized with errors, but will work offline');
          setUserDataReady(true);
        }

        // Step 3: Final setup
        setInitializationStatus('Finalizing...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // All ready!
        setIsReady(true);
        
      } catch (error) {
        console.error('App initialization error:', error);
        
        // Still allow app to continue
        setUserDataReady(true);
        setIsReady(true);
        
        // Show error but don't block the app
        setTimeout(() => {
          Alert.alert(
            'Initialization Warning',
            'Some features may not work optimally. The app will continue in offline mode.',
            [{ text: 'OK', style: 'default' }]
          );
        }, 2000);
      }
    };

    initializeApp();
  }, []);

  // Helper function to get current user stats (for debugging)
  const getCurrentUserStats = () => {
    if (userDataReady && userDataManager.isInitialized) {
      const progress = userDataManager.getUserProgress();
      const badges = userDataManager.getUserBadges();
      console.log('Current user stats:', {
        level: progress.level,
        xp: progress.xp,
        sessions: progress.totalSessions,
        badges: badges.earned.length
      });
    }
  };

  // Expose this globally for debugging (remove in production)
  global.getUserStats = getCurrentUserStats;
  global.userDataManager = userDataManager;

  // Define styles using StyleSheet
  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background,
      paddingHorizontal: 40,
    },
    loadingText: {
      ...Fonts.getFont('medium', 'regular'),
      color: Colors.textPrimary,
      marginTop: 20,
      textAlign: 'center',
    },
    statusText: {
      ...Fonts.getFont('regular', 'light'),
      color: Colors.textSecondary,
      marginTop: 10,
      textAlign: 'center',
      fontSize: 14,
    },
    progressContainer: {
      marginTop: 30,
      alignItems: 'center',
    },
    progressBar: {
      width: 200,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      width: '100%',
      height: '100%',
      backgroundColor: Colors.primary,
    }
  });

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>MotionSync</Text>
        <Text style={styles.statusText}>{initializationStatus}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyTheme}>
      <AppNavigator 
        isLoggedIn={isLoggedIn} 
        setIsLoggedIn={setIsLoggedIn}
        userDataReady={userDataReady}
      />
    </NavigationContainer>
  );
}