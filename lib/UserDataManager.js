// services/UserDataManager.js - Comprehensive User Data Management
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  USER_PROFILE: 'motionsync_user_profile',
  USER_PROGRESS: 'motionsync_user_progress',
  USER_BADGES: 'motionsync_user_badges',
  USER_MILESTONES: 'motionsync_user_milestones',
  USER_SESSIONS: 'motionsync_user_sessions',
  USER_SETTINGS: 'motionsync_user_settings',
  USER_ACHIEVEMENTS: 'motionsync_user_achievements'
};

class UserDataManager {
  constructor() {
    this.userData = {
      profile: null,
      progress: null,
      badges: null,
      milestones: null,
      sessions: null,
      settings: null,
      achievements: null
    };
    this.isInitialized = false;
  }

  // Initialize user data - call this when app starts
  async initialize() {
    try {
      console.log('🔄 Initializing UserDataManager...');
      
      await this.loadAllUserData();
      
      // If no user data exists, create default data
      if (!this.userData.profile) {
        await this.createDefaultUserData();
      }
      
      this.isInitialized = true;
      console.log('✅ UserDataManager initialized successfully');
      
      return this.userData;
    } catch (error) {
      console.error('❌ Error initializing UserDataManager:', error);
      throw error;
    }
  }

  // Load all user data from storage
  async loadAllUserData() {
    try {
      const [profile, progress, badges, milestones, sessions, settings, achievements] = await Promise.all([
        this.loadFromStorage(STORAGE_KEYS.USER_PROFILE),
        this.loadFromStorage(STORAGE_KEYS.USER_PROGRESS),
        this.loadFromStorage(STORAGE_KEYS.USER_BADGES),
        this.loadFromStorage(STORAGE_KEYS.USER_MILESTONES),
        this.loadFromStorage(STORAGE_KEYS.USER_SESSIONS),
        this.loadFromStorage(STORAGE_KEYS.USER_SETTINGS),
        this.loadFromStorage(STORAGE_KEYS.USER_ACHIEVEMENTS)
      ]);

      this.userData = {
        profile,
        progress,
        badges,
        milestones,
        sessions,
        settings,
        achievements
      };

      console.log('📊 User data loaded:', Object.keys(this.userData).filter(key => this.userData[key] !== null));
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      throw error;
    }
  }

  // Create default user data for new users
  async createDefaultUserData() {
    console.log('🆕 Creating default user data...');
    
    const defaultProfile = {
      id: this.generateUserId(),
      name: 'Fitness Enthusiast',
      email: '',
      profileImage: null,
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      preferences: {
        language: 'en',
        notifications: true,
        soundEffects: true,
        hapticFeedback: true
      }
    };

    const defaultProgress = {
      level: 1,
      xp: 0,
      totalSessions: 0,
      perfectForms: 0,
      streak: 0,
      longestStreak: 0,
      lastSessionDate: null,
      totalWorkoutTime: 0, // in minutes
      averageMotionScore: 0,
      bestMotionScore: 0,
      exercisesAnalyzed: 0
    };

    const defaultBadges = {
      earned: [],
      locked: this.getDefaultLockedBadges(),
      progress: {} // badge_id: progress_percentage
    };

    const defaultMilestones = {
      completed: [],
      inProgress: this.getDefaultMilestones(),
      totalXpEarned: 0
    };

    const defaultSessions = {
      history: [],
      recentAnalysis: [],
      exerciseStats: {
        squat: { count: 0, avgScore: 0, bestScore: 0 },
        pushup: { count: 0, avgScore: 0, bestScore: 0 },
        deadlift: { count: 0, avgScore: 0, bestScore: 0 },
        plank: { count: 0, avgScore: 0, bestScore: 0 },
        running: { count: 0, avgScore: 0, bestScore: 0 }
      }
    };

    const defaultSettings = {
      cameraSettings: {
        resolution: 'high',
        frameRate: 30,
        autoFocus: true,
        flashMode: 'auto'
      },
      motionAnalysis: {
        confidenceThreshold: 85,
        realTimeFeedback: true,
        voiceInstructions: true,
        showBodyPoints: true
      },
      notifications: {
        workoutReminders: true,
        achievementAlerts: true,
        weeklyReports: true,
        reminderTime: '18:00'
      },
      privacy: {
        dataSharing: false,
        analytics: true,
        crashReporting: true
      }
    };

    const defaultAchievements = {
      totalBadgesEarned: 0,
      totalMilestonesCompleted: 0,
      firstSessionDate: null,
      personalRecords: {
        highestMotionScore: 0,
        longestStreak: 0,
        mostSessionsInDay: 0,
        totalWorkouts: 0
      }
    };

    // Set default data
    this.userData = {
      profile: defaultProfile,
      progress: defaultProgress,
      badges: defaultBadges,
      milestones: defaultMilestones,
      sessions: defaultSessions,
      settings: defaultSettings,
      achievements: defaultAchievements
    };

    // Save to storage
    await this.saveAllUserData();
    console.log('✅ Default user data created and saved');
  }

  // Get all user data
  getUserData() {
    if (!this.isInitialized) {
      throw new Error('UserDataManager not initialized. Call initialize() first.');
    }
    return { ...this.userData };
  }

  // Get specific user data section
  getUserProfile() {
    return { ...this.userData.profile };
  }

  getUserProgress() {
    return { ...this.userData.progress };
  }

  getUserBadges() {
    return { ...this.userData.badges };
  }

  getUserMilestones() {
    return { ...this.userData.milestones };
  }

  getUserSessions() {
    return { ...this.userData.sessions };
  }

  getUserSettings() {
    return { ...this.userData.settings };
  }

  getUserAchievements() {
    return { ...this.userData.achievements };
  }

  // Update user profile
  async updateUserProfile(profileUpdates) {
    try {
      this.userData.profile = { ...this.userData.profile, ...profileUpdates };
      this.userData.profile.lastActive = new Date().toISOString();
      
      await this.saveToStorage(STORAGE_KEYS.USER_PROFILE, this.userData.profile);
      console.log('✅ User profile updated');
      
      return this.userData.profile;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // Add XP and update level
  async addXP(xpAmount, source = 'general') {
    try {
      const oldXP = this.userData.progress.xp;
      const oldLevel = this.userData.progress.level;
      
      this.userData.progress.xp += xpAmount;
      
      // Calculate new level (every 1000 XP = 1 level)
      const newLevel = Math.floor(this.userData.progress.xp / 1000) + 1;
      const levelUp = newLevel > oldLevel;
      
      this.userData.progress.level = newLevel;
      
      await this.saveToStorage(STORAGE_KEYS.USER_PROGRESS, this.userData.progress);
      
      console.log(`✅ Added ${xpAmount} XP from ${source}. Total: ${this.userData.progress.xp}`);
      
      if (levelUp) {
        console.log(`🎉 Level up! ${oldLevel} → ${newLevel}`);
        // You can trigger level up celebrations here
      }
      
      return {
        xpAdded: xpAmount,
        totalXP: this.userData.progress.xp,
        oldLevel,
        newLevel,
        levelUp
      };
    } catch (error) {
      console.error('❌ Error adding XP:', error);
      throw error;
    }
  }

  // Record a motion analysis session
  async recordSession(sessionData) {
    try {
      const session = {
        id: this.generateSessionId(),
        exerciseType: sessionData.exerciseType,
        motionScore: sessionData.motionScore,
        duration: sessionData.duration,
        feedback: sessionData.feedback,
        timestamp: new Date().toISOString(),
        cameraSettings: sessionData.cameraSettings || {},
        improvements: sessionData.improvements || []
      };

      // Add to session history
      this.userData.sessions.history.unshift(session);
      
      // Keep only last 100 sessions
      if (this.userData.sessions.history.length > 100) {
        this.userData.sessions.history = this.userData.sessions.history.slice(0, 100);
      }

      // Update recent analysis
      this.userData.sessions.recentAnalysis.unshift(session);
      if (this.userData.sessions.recentAnalysis.length > 10) {
        this.userData.sessions.recentAnalysis = this.userData.sessions.recentAnalysis.slice(0, 10);
      }

      // Update exercise stats
      const exerciseType = sessionData.exerciseType.toLowerCase();
      if (this.userData.sessions.exerciseStats[exerciseType]) {
        const stats = this.userData.sessions.exerciseStats[exerciseType];
        stats.count++;
        stats.avgScore = ((stats.avgScore * (stats.count - 1)) + sessionData.motionScore) / stats.count;
        stats.bestScore = Math.max(stats.bestScore, sessionData.motionScore);
      }

      // Update progress
      this.userData.progress.totalSessions++;
      this.userData.progress.exercisesAnalyzed++;
      this.userData.progress.totalWorkoutTime += sessionData.duration || 0;
      
      if (sessionData.motionScore >= 90) {
        this.userData.progress.perfectForms++;
      }
      
      // Update average and best scores
      this.userData.progress.averageMotionScore = this.calculateAverageMotionScore();
      this.userData.progress.bestMotionScore = Math.max(
        this.userData.progress.bestMotionScore, 
        sessionData.motionScore
      );

      // Update streak
      await this.updateStreak();

      // Check for badge achievements
      await this.checkBadgeAchievements();

      // Save updated data
      await Promise.all([
        this.saveToStorage(STORAGE_KEYS.USER_SESSIONS, this.userData.sessions),
        this.saveToStorage(STORAGE_KEYS.USER_PROGRESS, this.userData.progress)
      ]);

      console.log('✅ Session recorded successfully');
      
      return session;
    } catch (error) {
      console.error('❌ Error recording session:', error);
      throw error;
    }
  }

  // Unlock a badge
  async unlockBadge(badgeId) {
    try {
      if (this.userData.badges.earned.includes(badgeId)) {
        console.log(`Badge ${badgeId} already unlocked`);
        return false;
      }

      this.userData.badges.earned.push(badgeId);
      this.userData.badges.locked = this.userData.badges.locked.filter(b => b.id !== badgeId);
      this.userData.achievements.totalBadgesEarned++;

      await Promise.all([
        this.saveToStorage(STORAGE_KEYS.USER_BADGES, this.userData.badges),
        this.saveToStorage(STORAGE_KEYS.USER_ACHIEVEMENTS, this.userData.achievements)
      ]);

      console.log(`🏆 Badge unlocked: ${badgeId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error unlocking badge:', error);
      throw error;
    }
  }

  // Complete a milestone
  async completeMilestone(milestoneId) {
    try {
      const milestone = this.userData.milestones.inProgress.find(m => m.id === milestoneId);
      if (!milestone) {
        console.log(`Milestone ${milestoneId} not found`);
        return false;
      }

      // Move from in progress to completed
      this.userData.milestones.completed.push({
        ...milestone,
        completedDate: new Date().toISOString()
      });
      
      this.userData.milestones.inProgress = this.userData.milestones.inProgress.filter(
        m => m.id !== milestoneId
      );

      // Add XP reward
      if (milestone.xp) {
        await this.addXP(milestone.xp, `milestone_${milestoneId}`);
      }

      // Update achievements
      this.userData.achievements.totalMilestonesCompleted++;
      this.userData.milestones.totalXpEarned += milestone.xp || 0;

      await Promise.all([
        this.saveToStorage(STORAGE_KEYS.USER_MILESTONES, this.userData.milestones),
        this.saveToStorage(STORAGE_KEYS.USER_ACHIEVEMENTS, this.userData.achievements)
      ]);

      console.log(`🎯 Milestone completed: ${milestoneId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error completing milestone:', error);
      throw error;
    }
  }

  // Update user settings
  async updateSettings(settingsUpdates) {
    try {
      this.userData.settings = { ...this.userData.settings, ...settingsUpdates };
      await this.saveToStorage(STORAGE_KEYS.USER_SETTINGS, this.userData.settings);
      
      console.log('✅ Settings updated');
      return this.userData.settings;
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      throw error;
    }
  }

  // Update streak
  async updateStreak() {
    const today = new Date().toDateString();
    const lastSessionDate = this.userData.progress.lastSessionDate;
    
    if (!lastSessionDate) {
      // First session ever
      this.userData.progress.streak = 1;
      this.userData.progress.lastSessionDate = today;
    } else {
      const lastSession = new Date(lastSessionDate).toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      if (lastSession === today) {
        // Already counted today, no change
        return;
      } else if (lastSession === yesterday) {
        // Consecutive day
        this.userData.progress.streak++;
        this.userData.progress.lastSessionDate = today;
      } else {
        // Streak broken
        this.userData.progress.streak = 1;
        this.userData.progress.lastSessionDate = today;
      }
    }
    
    // Update longest streak
    this.userData.progress.longestStreak = Math.max(
      this.userData.progress.longestStreak,
      this.userData.progress.streak
    );
  }

  // Calculate average motion score
  calculateAverageMotionScore() {
    const recentSessions = this.userData.sessions.history.slice(0, 20); // Last 20 sessions
    if (recentSessions.length === 0) return 0;
    
    const totalScore = recentSessions.reduce((sum, session) => sum + session.motionScore, 0);
    return Math.round(totalScore / recentSessions.length);
  }

  // Check for badge achievements
  async checkBadgeAchievements() {
    const progress = this.userData.progress;
    const badges = this.getDefaultBadges();
    
    for (const badge of badges) {
      if (this.userData.badges.earned.includes(badge.id)) continue;
      
      let shouldUnlock = false;
      
      switch (badge.id) {
        case 'first_steps':
          shouldUnlock = progress.totalSessions >= 1;
          break;
        case 'form_master':
          shouldUnlock = progress.perfectForms >= 10;
          break;
        case 'consistency_king':
          shouldUnlock = progress.streak >= 15;
          break;
        case 'tech_guru':
          shouldUnlock = progress.totalSessions >= 5; // Assuming they've mastered setup
          break;
        case 'perfectionist':
          shouldUnlock = progress.bestMotionScore >= 95;
          break;
        case 'motion_tracker':
          shouldUnlock = progress.totalSessions >= 100;
          break;
        // Add more badge conditions here
      }
      
      if (shouldUnlock) {
        await this.unlockBadge(badge.id);
      }
    }
  }

  // Reset user data (for testing or user request)
  async resetUserData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_PROGRESS),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_BADGES),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_MILESTONES),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSIONS),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_SETTINGS),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ACHIEVEMENTS)
      ]);
      
      await this.createDefaultUserData();
      console.log('✅ User data reset successfully');
      
      return this.userData;
    } catch (error) {
      console.error('❌ Error resetting user data:', error);
      throw error;
    }
  }

  // Export user data
  async exportUserData() {
    return {
      exportDate: new Date().toISOString(),
      userData: this.userData
    };
  }

  // Import user data
  async importUserData(importedData) {
    try {
      this.userData = importedData.userData;
      await this.saveAllUserData();
      console.log('✅ User data imported successfully');
      
      return this.userData;
    } catch (error) {
      console.error('❌ Error importing user data:', error);
      throw error;
    }
  }

  // Helper methods
  async saveAllUserData() {
    await Promise.all([
      this.saveToStorage(STORAGE_KEYS.USER_PROFILE, this.userData.profile),
      this.saveToStorage(STORAGE_KEYS.USER_PROGRESS, this.userData.progress),
      this.saveToStorage(STORAGE_KEYS.USER_BADGES, this.userData.badges),
      this.saveToStorage(STORAGE_KEYS.USER_MILESTONES, this.userData.milestones),
      this.saveToStorage(STORAGE_KEYS.USER_SESSIONS, this.userData.sessions),
      this.saveToStorage(STORAGE_KEYS.USER_SETTINGS, this.userData.settings),
      this.saveToStorage(STORAGE_KEYS.USER_ACHIEVEMENTS, this.userData.achievements)
    ]);
  }

  async saveToStorage(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`❌ Error saving ${key}:`, error);
      throw error;
    }
  }

  async loadFromStorage(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Error loading ${key}:`, error);
      return null;
    }
  }

  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Default badge definitions
  getDefaultBadges() {
    return [
      { id: 'first_steps', title: 'First Steps', icon: '👶', category: 'getting_started' },
      { id: 'form_master', title: 'Form Master', icon: '🎯', category: 'form' },
      { id: 'consistency_king', title: 'Consistency King', icon: '🔥', category: 'consistency' },
      { id: 'tech_guru', title: 'Tech Guru', icon: '📱', category: 'technical' },
      { id: 'perfectionist', title: 'Perfectionist', icon: '⭐', category: 'achievement' },
      { id: 'motion_tracker', title: 'Motion Tracker', icon: '📊', category: 'progress' }
    ];
  }

  getDefaultLockedBadges() {
    return [
      { id: 'marathon_master', title: 'Marathon Master', requirement: 'Complete 1000 sessions', icon: '🏃' },
      { id: 'form_fanatic', title: 'Form Fanatic', requirement: 'Achieve 100% in 5 different exercises', icon: '🏆' },
      { id: 'streak_legend', title: 'Streak Legend', requirement: 'Maintain 100-day streak', icon: '⚡' },
      { id: 'ai_whisperer', title: 'AI Whisperer', requirement: 'Use AI assistant 50 times', icon: '🤖' }
    ];
  }

  getDefaultMilestones() {
    return [
      { id: 'welcome', title: 'Welcome to MotionSync', description: 'Complete your first motion analysis session', xp: 100, completed: false },
      { id: 'camera_master', title: 'Camera Setup Master', description: 'Successfully configure optimal camera positioning', xp: 150, completed: false },
      { id: 'form_improvement', title: 'Form Improvement', description: 'Improve your motion score by 20 points', xp: 200, completed: false },
      { id: 'consistency_builder', title: 'Consistency Builder', description: 'Complete motion analysis for 7 consecutive days', xp: 250, completed: false }
    ];
  }
}

// Create singleton instance
const userDataManager = new UserDataManager();

export default userDataManager;