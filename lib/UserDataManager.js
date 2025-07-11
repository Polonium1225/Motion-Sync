// lib/UserDataManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, databases, DATABASE_ID, COLLECTIONS, Query } from './AppwriteService';

class UserDataManager {
  constructor() {
    this.isInitialized = false;
    this.userData = {
      profile: {
        userId: null,
        name: '',
        email: '',
        profileImage: null,
        joinDate: null,
        lastActive: null
      },
      progress: {
        level: 1,
        xp: 0,
        totalSessions: 0,
        perfectForms: 0,
        streak: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageMotionScore: 0,
        totalMotionScore: 0,
        lastWorkoutDate: null,
        workoutHistory: []
      },
      badges: {
        earned: [],
        locked: [],
        totalBadgesEarned: 0,
        lastEarnedBadge: null
      },
      achievements: {
        milestones: [],
        completedMilestones: [],
        totalBadgesEarned: 0,
        progressPercentage: 0
      },
      settings: {
        notifications: {
          workoutReminders: true,
          achievementAlerts: true,
          weeklyReports: true,
          soundEffects: true,
          hapticFeedback: true
        },
        motionAnalysis: {
          realTimeFeedback: true,
          voiceInstructions: true,
          difficulty: 'intermediate',
          targetAccuracy: 85
        },
        privacy: {
          dataSharing: false,
          analytics: true,
          profileVisibility: 'private'
        },
        preferences: {
          theme: 'dark',
          units: 'metric',
          language: 'en'
        }
      },
      statistics: {
        dailyStats: {},
        weeklyStats: {},
        monthlyStats: {},
        exerciseStats: {},
        performanceHistory: []
      }
    };
    
    this.listeners = [];
    this.syncTimeout = null;
  }

  // Initialize the data manager
  async initialize() {
    try {
      console.log('Initializing UserDataManager...');
      
      // Load user from Appwrite
      const user = await account.get();
      this.userData.profile.userId = user.$id;
      this.userData.profile.name = user.name || '';
      this.userData.profile.email = user.email || '';
      
      // Load cached data first
      await this.loadFromCache();
      
      // Then sync with cloud
      await this.syncWithCloud();
      
      this.isInitialized = true;
      console.log('UserDataManager initialized successfully');
      
      // Notify listeners
      this.notifyListeners('initialized');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize UserDataManager:', error);
      
      // Try to load from cache only
      await this.loadFromCache();
      this.isInitialized = true;
      
      return false;
    }
  }

  // Load data from AsyncStorage cache
  async loadFromCache() {
    try {
      const keys = [
        'userData_profile',
        'userData_progress', 
        'userData_badges',
        'userData_achievements',
        'userData_settings',
        'userData_statistics'
      ];
      
      const values = await AsyncStorage.multiGet(keys);
      
      values.forEach(([key, value]) => {
        if (value) {
          const section = key.replace('userData_', '');
          this.userData[section] = { ...this.userData[section], ...JSON.parse(value) };
        }
      });
      
      console.log('Data loaded from cache');
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }
  }

  // Save data to AsyncStorage cache
  async saveToCache() {
    try {
      const dataToSave = [
        ['userData_profile', JSON.stringify(this.userData.profile)],
        ['userData_progress', JSON.stringify(this.userData.progress)],
        ['userData_badges', JSON.stringify(this.userData.badges)],
        ['userData_achievements', JSON.stringify(this.userData.achievements)],
        ['userData_settings', JSON.stringify(this.userData.settings)],
        ['userData_statistics', JSON.stringify(this.userData.statistics)]
      ];
      
      await AsyncStorage.multiSet(dataToSave);
      console.log('Data saved to cache');
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  // Sync with Appwrite cloud database
  async syncWithCloud() {
    try {
      if (!this.userData.profile.userId) return;
      
      // Load user profile from cloud
      const profiles = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        [Query.equal('userId', this.userData.profile.userId)]
      );
      
      if (profiles.documents.length > 0) {
        const profile = profiles.documents[0];
        this.userData.profile = {
          ...this.userData.profile,
          ...profile,
          lastActive: new Date().toISOString()
        };
      }
      
      // Save updated data to cache
      await this.saveToCache();
      
      console.log('Data synced with cloud');
    } catch (error) {
      console.error('Failed to sync with cloud:', error);
    }
  }

  // Add listener for data changes
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of changes
  notifyListeners(eventType, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data, this.userData);
      } catch (error) {
        console.error('Error in listener callback:', error);
      }
    });
  }

  // Debounced save function
  debouncedSave() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(async () => {
      await this.saveToCache();
      this.notifyListeners('dataUpdated');
    }, 1000);
  }

  // === PROFILE METHODS ===
  getUserProfile() {
    return { ...this.userData.profile };
  }

  async updateUserProfile(updates) {
    this.userData.profile = { ...this.userData.profile, ...updates };
    this.debouncedSave();
    this.notifyListeners('profileUpdated', updates);
  }

  // === PROGRESS METHODS ===
  getUserProgress() {
    return { ...this.userData.progress };
  }

  async addWorkoutSession(sessionData) {
    const {
      exerciseType = 'general',
      motionScore = 0,
      duration = 0,
      perfectForms = 0,
      date = new Date().toISOString()
    } = sessionData;

    // Update basic stats
    this.userData.progress.totalSessions += 1;
    this.userData.progress.perfectForms += perfectForms;
    this.userData.progress.totalMotionScore += motionScore;
    this.userData.progress.averageMotionScore = 
      this.userData.progress.totalMotionScore / this.userData.progress.totalSessions;

    // Update XP based on performance
    const xpGained = this.calculateXPGain(motionScore, duration, perfectForms);
    await this.addXP(xpGained);

    // Update streak
    await this.updateStreak(date);

    // Add to workout history
    this.userData.progress.workoutHistory.push({
      date,
      exerciseType,
      motionScore,
      duration,
      perfectForms,
      xpGained
    });

    // Keep only last 100 workouts in history
    if (this.userData.progress.workoutHistory.length > 100) {
      this.userData.progress.workoutHistory = 
        this.userData.progress.workoutHistory.slice(-100);
    }

    this.userData.progress.lastWorkoutDate = date;

    // Update daily statistics
    await this.updateDailyStats(date, sessionData);

    // Check for badge unlocks
    await this.checkBadgeUnlocks();

    this.debouncedSave();
    this.notifyListeners('sessionAdded', sessionData);

    return xpGained;
  }

  calculateXPGain(motionScore, duration, perfectForms) {
    let baseXP = 50;
    
    // Bonus for high motion score
    if (motionScore >= 95) baseXP += 50;
    else if (motionScore >= 90) baseXP += 30;
    else if (motionScore >= 80) baseXP += 20;
    else if (motionScore >= 70) baseXP += 10;

    // Bonus for perfect forms
    baseXP += perfectForms * 10;

    // Bonus for duration (cap at 30 minutes)
    const durationMinutes = Math.min(duration / 60, 30);
    baseXP += Math.floor(durationMinutes * 2);

    return baseXP;
  }

  async addXP(amount) {
    const oldLevel = this.userData.progress.level;
    this.userData.progress.xp += amount;
    
    // Calculate new level
    const newLevel = this.calculateLevelFromXP(this.userData.progress.xp);
    
    if (newLevel > oldLevel) {
      this.userData.progress.level = newLevel;
      this.notifyListeners('levelUp', { oldLevel, newLevel, totalXP: this.userData.progress.xp });
      
      // Award level-up badge
      await this.unlockBadge(`level_${newLevel}`, {
        title: `Level ${newLevel}`,
        description: `Reached level ${newLevel}`,
        icon: '⭐',
        category: 'progression'
      });
    }
  }

  calculateLevelFromXP(xp) {
    const xpRequirements = [
      0, 1000, 2500, 4500, 7000, 10000, 14000, 19000, 25000, 32000
    ];

    for (let i = xpRequirements.length - 1; i >= 0; i--) {
      if (xp >= xpRequirements[i]) {
        return Math.min(i + 1, 10);
      }
    }
    return 1;
  }

  async updateStreak(date) {
    const today = new Date(date).toDateString();
    const lastWorkout = this.userData.progress.lastWorkoutDate 
      ? new Date(this.userData.progress.lastWorkoutDate).toDateString()
      : null;
    
    if (!lastWorkout) {
      // First workout
      this.userData.progress.currentStreak = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastWorkout === yesterday.toDateString()) {
        // Consecutive day
        this.userData.progress.currentStreak += 1;
      } else if (lastWorkout !== today) {
        // Streak broken
        this.userData.progress.currentStreak = 1;
      }
      // Same day workout doesn't change streak
    }
    
    // Update longest streak
    if (this.userData.progress.currentStreak > this.userData.progress.longestStreak) {
      this.userData.progress.longestStreak = this.userData.progress.currentStreak;
    }
    
    this.userData.progress.streak = this.userData.progress.currentStreak;
  }

  // === BADGE METHODS ===
  getUserBadges() {
    return { ...this.userData.badges };
  }

  async unlockBadge(badgeId, badgeData) {
    // Check if badge already earned
    if (this.userData.badges.earned.find(badge => badge.id === badgeId)) {
      return false;
    }

    const badge = {
      id: badgeId,
      ...badgeData,
      unlockedAt: new Date().toISOString()
    };

    this.userData.badges.earned.push(badge);
    this.userData.badges.totalBadgesEarned += 1;
    this.userData.badges.lastEarnedBadge = badge;

    // Remove from locked badges if it exists
    this.userData.badges.locked = this.userData.badges.locked.filter(
      lockedBadge => lockedBadge.id !== badgeId
    );

    this.debouncedSave();
    this.notifyListeners('badgeUnlocked', badge);
    
    return true;
  }

  async checkBadgeUnlocks() {
    const progress = this.userData.progress;
    
    // First Steps Badge
    if (progress.totalSessions >= 1) {
      await this.unlockBadge('first_steps', {
        title: 'First Steps',
        description: 'Completed first motion analysis',
        icon: '👶',
        category: 'getting_started'
      });
    }

    // Form Master Badge
    if (progress.averageMotionScore >= 90 && progress.totalSessions >= 10) {
      await this.unlockBadge('form_master', {
        title: 'Form Master',
        description: 'Achieved 90+ average score in 10+ exercises',
        icon: '🎯',
        category: 'form'
      });
    }

    // Consistency King Badge
    if (progress.streak >= 15) {
      await this.unlockBadge('consistency_king', {
        title: 'Consistency King',
        description: '15-day workout streak',
        icon: '🔥',
        category: 'consistency'
      });
    }

    // Perfect Form Badges
    if (progress.perfectForms >= 20) {
      await this.unlockBadge('squat_specialist', {
        title: 'Squat Specialist',
        description: 'Perfect squat form 20 times',
        icon: '🏋️',
        category: 'exercises'
      });
    }

    // Session Milestones
    if (progress.totalSessions >= 100) {
      await this.unlockBadge('motion_tracker', {
        title: 'Motion Tracker',
        description: '100 motion analysis sessions',
        icon: '📊',
        category: 'progress'
      });
    }

    // Perfectionist Badge
    if (progress.workoutHistory.some(workout => workout.motionScore >= 95)) {
      await this.unlockBadge('perfectionist', {
        title: 'Perfectionist',
        description: 'Score above 95 in any exercise',
        icon: '⭐',
        category: 'achievement'
      });
    }
  }

  // === ACHIEVEMENT METHODS ===
  getUserAchievements() {
    return { ...this.userData.achievements };
  }

  async updateMilestoneProgress(milestoneId, progress) {
    const milestone = this.userData.achievements.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.progress = progress;
      milestone.completed = progress >= 100;
      
      if (milestone.completed && !this.userData.achievements.completedMilestones.includes(milestoneId)) {
        this.userData.achievements.completedMilestones.push(milestoneId);
        await this.addXP(milestone.xp || 0);
        this.notifyListeners('milestoneCompleted', milestone);
      }
    }
    
    this.calculateAchievementProgress();
    this.debouncedSave();
  }

  calculateAchievementProgress() {
    const total = this.userData.achievements.milestones.length;
    const completed = this.userData.achievements.completedMilestones.length;
    this.userData.achievements.progressPercentage = total > 0 ? (completed / total) * 100 : 0;
    this.userData.achievements.totalBadgesEarned = this.userData.badges.totalBadgesEarned;
  }

  // === SETTINGS METHODS ===
  getUserSettings() {
    return { ...this.userData.settings };
  }

  async updateSettings(updates) {
    this.userData.settings = this.deepMerge(this.userData.settings, updates);
    this.debouncedSave();
    this.notifyListeners('settingsUpdated', updates);
  }

  // === STATISTICS METHODS ===
  getUserStatistics() {
    return { ...this.userData.statistics };
  }

  async updateDailyStats(date, sessionData) {
    const dateKey = new Date(date).toDateString();
    
    if (!this.userData.statistics.dailyStats[dateKey]) {
      this.userData.statistics.dailyStats[dateKey] = {
        sessions: 0,
        totalScore: 0,
        averageScore: 0,
        perfectForms: 0,
        totalDuration: 0,
        exercises: []
      };
    }

    const dayStats = this.userData.statistics.dailyStats[dateKey];
    dayStats.sessions += 1;
    dayStats.totalScore += sessionData.motionScore || 0;
    dayStats.averageScore = dayStats.totalScore / dayStats.sessions;
    dayStats.perfectForms += sessionData.perfectForms || 0;
    dayStats.totalDuration += sessionData.duration || 0;
    
    if (sessionData.exerciseType && !dayStats.exercises.includes(sessionData.exerciseType)) {
      dayStats.exercises.push(sessionData.exerciseType);
    }

    // Update exercise-specific stats
    if (sessionData.exerciseType) {
      if (!this.userData.statistics.exerciseStats[sessionData.exerciseType]) {
        this.userData.statistics.exerciseStats[sessionData.exerciseType] = {
          sessions: 0,
          bestScore: 0,
          averageScore: 0,
          totalScore: 0,
          perfectForms: 0
        };
      }

      const exerciseStats = this.userData.statistics.exerciseStats[sessionData.exerciseType];
      exerciseStats.sessions += 1;
      exerciseStats.totalScore += sessionData.motionScore || 0;
      exerciseStats.averageScore = exerciseStats.totalScore / exerciseStats.sessions;
      exerciseStats.bestScore = Math.max(exerciseStats.bestScore, sessionData.motionScore || 0);
      exerciseStats.perfectForms += sessionData.perfectForms || 0;
    }

    // Keep only last 90 days of daily stats
    const keys = Object.keys(this.userData.statistics.dailyStats);
    if (keys.length > 90) {
      const sortedKeys = keys.sort((a, b) => new Date(b) - new Date(a));
      const keysToRemove = sortedKeys.slice(90);
      keysToRemove.forEach(key => {
        delete this.userData.statistics.dailyStats[key];
      });
    }
  }

  // === UTILITY METHODS ===
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // === DATA EXPORT/IMPORT ===
  async exportUserData() {
    try {
      return {
        ...this.userData,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  async importUserData(data) {
    try {
      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      // Merge imported data with current data
      this.userData = this.deepMerge(this.userData, data);
      
      await this.saveToCache();
      this.notifyListeners('dataImported', data);
      
      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      throw error;
    }
  }

  // === RESET METHODS ===
  async resetAllData() {
    this.userData = {
      profile: { ...this.userData.profile }, // Keep profile info
      progress: {
        level: 1,
        xp: 0,
        totalSessions: 0,
        perfectForms: 0,
        streak: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageMotionScore: 0,
        totalMotionScore: 0,
        lastWorkoutDate: null,
        workoutHistory: []
      },
      badges: {
        earned: [],
        locked: [],
        totalBadgesEarned: 0,
        lastEarnedBadge: null
      },
      achievements: {
        milestones: [],
        completedMilestones: [],
        totalBadgesEarned: 0,
        progressPercentage: 0
      },
      settings: { ...this.userData.settings }, // Keep settings
      statistics: {
        dailyStats: {},
        weeklyStats: {},
        monthlyStats: {},
        exerciseStats: {},
        performanceHistory: []
      }
    };

    await this.saveToCache();
    this.notifyListeners('dataReset');
  }

  // === CLOUD SYNC METHODS ===
  async forceSync() {
    try {
      await this.syncWithCloud();
      return true;
    } catch (error) {
      console.error('Force sync failed:', error);
      return false;
    }
  }

  getLastSyncTime() {
    return this.userData.profile.lastActive;
  }
}

// Create and export singleton instance
const userDataManager = new UserDataManager();
export default userDataManager;