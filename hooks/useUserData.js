// hooks/useUserData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import userDataManager from '../lib/UserDataManager';

export const useUserData = () => {
  const [isInitialized, setIsInitialized] = useState(userDataManager.isInitialized);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(!userDataManager.isInitialized);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  // Initialize data manager and set up listener
  useEffect(() => {
    const initializeAndListen = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize if not already done
        if (!userDataManager.isInitialized) {
          await userDataManager.initialize();
        }

        // Get initial data
        setUserData({
          profile: userDataManager.getUserProfile(),
          progress: userDataManager.getUserProgress(),
          badges: userDataManager.getUserBadges(),
          achievements: userDataManager.getUserAchievements(),
          settings: userDataManager.getUserSettings(),
          statistics: userDataManager.getUserStatistics()
        });

        setIsInitialized(true);

        // Set up listener for data changes
        unsubscribeRef.current = userDataManager.addListener((eventType, data, fullUserData) => {
          // Update local state when data changes
          setUserData({
            profile: userDataManager.getUserProfile(),
            progress: userDataManager.getUserProgress(),
            badges: userDataManager.getUserBadges(),
            achievements: userDataManager.getUserAchievements(),
            settings: userDataManager.getUserSettings(),
            statistics: userDataManager.getUserStatistics()
          });
        });

      } catch (err) {
        console.error('Failed to initialize user data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAndListen();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Methods to interact with user data
  const addWorkoutSession = useCallback(async (sessionData) => {
    try {
      return await userDataManager.addWorkoutSession(sessionData);
    } catch (error) {
      console.error('Failed to add workout session:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    try {
      await userDataManager.updateUserProfile(updates);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (updates) => {
    try {
      await userDataManager.updateSettings(updates);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }, []);

  const addXP = useCallback(async (amount) => {
    try {
      await userDataManager.addXP(amount);
    } catch (error) {
      console.error('Failed to add XP:', error);
      throw error;
    }
  }, []);

  const unlockBadge = useCallback(async (badgeId, badgeData) => {
    try {
      return await userDataManager.unlockBadge(badgeId, badgeData);
    } catch (error) {
      console.error('Failed to unlock badge:', error);
      throw error;
    }
  }, []);

  const forceSync = useCallback(async () => {
    try {
      setLoading(true);
      return await userDataManager.forceSync();
    } catch (error) {
      console.error('Failed to sync:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportData = useCallback(async () => {
    try {
      return await userDataManager.exportUserData();
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }, []);

  const resetData = useCallback(async () => {
    try {
      await userDataManager.resetAllData();
    } catch (error) {
      console.error('Failed to reset data:', error);
      throw error;
    }
  }, []);

  return {
    // Data
    userData,
    isInitialized,
    loading,
    error,

    // Methods
    addWorkoutSession,
    updateProfile,
    updateSettings,
    addXP,
    unlockBadge,
    forceSync,
    exportData,
    resetData,

    // Direct access to specific data sections
    profile: userData?.profile,
    progress: userData?.progress,
    badges: userData?.badges,
    achievements: userData?.achievements,
    settings: userData?.settings,
    statistics: userData?.statistics
  };
};

// Additional specialized hooks for specific use cases
export const useUserProgress = () => {
  const { progress, addWorkoutSession, addXP, loading } = useUserData();
  
  return {
    progress,
    addWorkoutSession,
    addXP,
    loading,
    
    // Calculated values
    levelProgress: progress ? {
      currentLevel: progress.level,
      currentXP: progress.xp,
      xpForCurrentLevel: getXPForLevel(progress.level - 1),
      xpForNextLevel: getXPForLevel(progress.level),
      progressXP: progress.xp - getXPForLevel(progress.level - 1),
      requiredXP: getXPForLevel(progress.level) - getXPForLevel(progress.level - 1),
      progressPercentage: progress.level >= 10 ? 100 : 
        ((progress.xp - getXPForLevel(progress.level - 1)) / 
         (getXPForLevel(progress.level) - getXPForLevel(progress.level - 1))) * 100
    } : null
  };
};

export const useUserBadges = () => {
  const { badges, unlockBadge, loading } = useUserData();
  
  return {
    badges,
    unlockBadge,
    loading,
    
    // Helper methods
    isUnlocked: (badgeId) => badges?.earned.some(badge => badge.id === badgeId) || false,
    getBadgeProgress: (badgeId) => {
      // This could be enhanced to track progress towards specific badges
      return 0;
    }
  };
};

export const useUserSettings = () => {
  const { settings, updateSettings, loading } = useUserData();
  
  return {
    settings,
    updateSettings,
    loading,
    
    // Quick access to common settings
    notifications: settings?.notifications,
    motionAnalysis: settings?.motionAnalysis,
    privacy: settings?.privacy,
    preferences: settings?.preferences
  };
};

// Helper function to calculate XP requirements for levels
const getXPForLevel = (level) => {
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
    50000,
    92000,
    150000,
    300000
  ];
  
  return xpRequirements[Math.min(level, xpRequirements.length - 1)] || 0;
};