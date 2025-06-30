// screens/BadgesAndMilestonesScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ImageBackground, 
  Animated, 
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useUserData, useUserBadges, useUserProgress } from '../hooks/useUserData';

// Import your background image
import backgroundImage from '../assets/sfgsdh.png';

const { width: screenWidth } = Dimensions.get('window');

const BadgesAndMilestonesScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('badges');
  
  // Use UserDataManager data
  const { userData, isInitialized } = useUserData();
  const { badges, isUnlocked } = useUserBadges();
  const { progress } = useUserProgress();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const tabIndicator = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleTabPress = (tab, index) => {
    setSelectedTab(tab);
    Animated.spring(tabIndicator, {
      toValue: index,
      useNativeDriver: true,
    }).start();
  };

  const Badge = ({ badge, isLocked = false }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <Animated.View style={[styles.badgeCard, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[styles.badgeContainer, isLocked && styles.lockedBadge]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={[styles.badgeIcon, isLocked && styles.lockedIcon]}>
            <Text style={[styles.badgeEmoji, isLocked && styles.lockedEmoji]}>
              {isLocked ? '🔒' : badge.icon}
            </Text>
          </View>
          <Text style={[styles.badgeTitle, isLocked && styles.lockedText]}>
            {badge.title}
          </Text>
          <Text style={[styles.badgeDescription, isLocked && styles.lockedText]}>
            {isLocked ? badge.requirement : badge.description}
          </Text>
          {badge.progress !== undefined && !isLocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(badge.progress, 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(badge.progress)}%</Text>
            </View>
          )}
          {!isLocked && badge.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const Milestone = ({ milestone, isCompleted = false }) => {
    return (
      <View style={[styles.milestoneCard, isCompleted && styles.completedMilestone]}>
        <View style={styles.milestoneLeft}>
          <View style={styles.milestoneIcon}>
            <Ionicons 
              name={isCompleted ? "checkmark-circle" : "radio-button-off"} 
              size={24} 
              color={isCompleted ? "#4CAF50" : "rgba(255, 255, 255, 0.6)"} 
            />
          </View>
          <View style={styles.milestoneContent}>
            <Text style={[styles.milestoneTitle, isCompleted && styles.completedTitle]}>
              {milestone.title}
            </Text>
            <Text style={[styles.milestoneDescription, isCompleted && styles.completedDescription]}>
              {milestone.description}
            </Text>
            {milestone.reward && (
              <Text style={styles.milestoneReward}>
                🏆 {milestone.reward}
              </Text>
            )}
            {milestone.progress !== undefined && !isCompleted && (
              <View style={styles.milestoneProgressContainer}>
                <View style={styles.milestoneProgressBar}>
                  <View style={[styles.milestoneProgressFill, { width: `${Math.min(milestone.progress, 100)}%` }]} />
                </View>
                <Text style={styles.milestoneProgressText}>{Math.round(milestone.progress)}%</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.milestoneRight}>
          <Text style={[styles.milestoneXP, isCompleted && styles.completedXP]}>
            +{milestone.xp} XP
          </Text>
        </View>
      </View>
    );
  };

  // Show loading state while UserDataManager initializes
  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading achievements...</Text>
            </View>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  // Get earned badges directly from UserDataManager
  const earnedBadges = badges?.earned || [];
  
  // Calculate progress for potential badges based on current user stats
  const calculateBadgeProgress = (badgeId) => {
    if (!progress) return 0;
    
    switch (badgeId) {
      case 'first_steps':
        return progress.totalSessions >= 1 ? 100 : 0;
      case 'form_master':
        const formProgress = progress.totalSessions >= 10 && progress.averageMotionScore >= 90 ? 100 : 
          Math.min(((progress.averageMotionScore || 0) / 90) * ((progress.totalSessions || 0) / 10) * 100, 100);
        return formProgress;
      case 'consistency_king':
        return Math.min(((progress.streak || 0) / 15) * 100, 100);
      case 'tech_guru':
        return progress.totalSessions >= 5 ? 100 : ((progress.totalSessions || 0) / 5) * 100;
      case 'squat_specialist':
        return Math.min(((progress.perfectForms || 0) / 20) * 100, 100);
      case 'push_up_pro':
        return progress.perfectForms >= 10 ? 100 : ((progress.perfectForms || 0) / 10) * 100;
      case 'motion_tracker':
        return Math.min(((progress.totalSessions || 0) / 100) * 100, 100);
      case 'perfectionist':
        return (progress.averageMotionScore || 0) >= 95 ? 100 : ((progress.averageMotionScore || 0) / 95) * 100;
      default:
        return 0;
    }
  };

  // Available badges with current progress
  const availableBadges = [
    {
      id: 'first_steps',
      title: 'First Steps',
      description: 'Completed first motion analysis',
      icon: '👶',
      category: 'getting_started',
      progress: calculateBadgeProgress('first_steps')
    },
    {
      id: 'form_master',
      title: 'Form Master',
      description: 'Achieved 90+ score in 10 exercises',
      icon: '🎯',
      category: 'form',
      progress: calculateBadgeProgress('form_master')
    },
    {
      id: 'consistency_king',
      title: 'Consistency King',
      description: '15-day workout streak',
      icon: '🔥',
      category: 'consistency',
      progress: calculateBadgeProgress('consistency_king')
    },
    {
      id: 'tech_guru',
      title: 'Tech Guru',
      description: 'Mastered camera setup and tracking',
      icon: '📱',
      category: 'technical',
      progress: calculateBadgeProgress('tech_guru')
    },
    {
      id: 'squat_specialist',
      title: 'Squat Specialist',
      description: 'Perfect squat form 20 times',
      icon: '🏋️',
      category: 'exercises',
      progress: calculateBadgeProgress('squat_specialist')
    },
    {
      id: 'push_up_pro',
      title: 'Push-up Pro',
      description: 'Flawless push-up technique',
      icon: '💪',
      category: 'exercises',
      progress: calculateBadgeProgress('push_up_pro')
    },
    {
      id: 'motion_tracker',
      title: 'Motion Tracker',
      description: '100 motion analysis sessions',
      icon: '📊',
      category: 'progress',
      progress: calculateBadgeProgress('motion_tracker')
    },
    {
      id: 'perfectionist',
      title: 'Perfectionist',
      description: 'Score above 95 in any exercise',
      icon: '⭐',
      category: 'achievement',
      progress: calculateBadgeProgress('perfectionist')
    }
  ];

  // Separate earned and in-progress badges
  const displayEarnedBadges = [];
  const displayInProgressBadges = [];

  // Add earned badges from UserDataManager
  earnedBadges.forEach(earnedBadge => {
    displayEarnedBadges.push({
      ...earnedBadge,
      progress: 100
    });
  });

  // Add in-progress badges (not yet earned)
  availableBadges.forEach(badge => {
    if (!isUnlocked(badge.id)) {
      displayInProgressBadges.push(badge);
    }
  });

  // Locked badges (high-level achievements)
  const lockedBadges = [
    {
      id: 'marathon_master',
      title: 'Marathon Master',
      requirement: 'Complete 1000 sessions',
      icon: '🏃',
      category: 'milestone'
    },
    {
      id: 'form_fanatic',
      title: 'Form Fanatic',
      requirement: 'Achieve 100% in 5 different exercises',
      icon: '🏆',
      category: 'form'
    },
    {
      id: 'streak_legend',
      title: 'Streak Legend',
      requirement: 'Maintain 100-day streak',
      icon: '⚡',
      category: 'consistency'
    },
    {
      id: 'ai_whisperer',
      title: 'AI Whisperer',
      requirement: 'Use AI assistant 50 times',
      icon: '🤖',
      category: 'social'
    }
  ];

  // Calculate milestone progress based on user data
  const calculateMilestoneProgress = (milestoneId) => {
    if (!progress) return 0;
    
    switch (milestoneId) {
      case 1:
        return Math.min(((progress.totalSessions || 0) / 1) * 100, 100);
      case 2:
        return Math.min(((progress.totalSessions || 0) / 5) * 100, 100);
      case 3:
        return Math.min(((progress.averageMotionScore || 0) / 70) * 100, 100);
      case 4:
        return Math.min(((progress.streak || 0) / 7) * 100, 100);
      case 5:
        return Math.min(((progress.totalSessions || 0) / 15) * 100, 100);
      case 6:
        return Math.min(((progress.averageMotionScore || 0) / 95) * 100, 100);
      default:
        return 0;
    }
  };

  // Generate milestones based on user progress
  const milestones = [
    {
      id: 1,
      title: 'Welcome to MotionSync',
      description: 'Complete your first motion analysis session',
      xp: 100,
      reward: 'First Steps Badge',
      completed: (progress?.totalSessions || 0) >= 1,
      progress: calculateMilestoneProgress(1)
    },
    {
      id: 2,
      title: 'Camera Setup Master',
      description: 'Successfully configure optimal camera positioning',
      xp: 150,
      reward: 'Tech Guru Badge',
      completed: (progress?.totalSessions || 0) >= 5,
      progress: calculateMilestoneProgress(2)
    },
    {
      id: 3,
      title: 'Form Improvement',
      description: 'Improve your motion score by 20 points',
      xp: 200,
      reward: 'Progress Tracker Badge',
      completed: (progress?.averageMotionScore || 0) >= 70,
      progress: calculateMilestoneProgress(3)
    },
    {
      id: 4,
      title: 'Consistency Builder',
      description: 'Complete motion analysis for 7 consecutive days',
      xp: 250,
      reward: 'Weekly Warrior Badge',
      completed: (progress?.streak || 0) >= 7,
      progress: calculateMilestoneProgress(4)
    },
    {
      id: 5,
      title: 'Exercise Variety',
      description: 'Analyze 5 different exercise types',
      xp: 300,
      reward: 'Versatile Athlete Badge',
      completed: (progress?.totalSessions || 0) >= 15,
      progress: calculateMilestoneProgress(5)
    },
    {
      id: 6,
      title: 'Perfect Form',
      description: 'Achieve a motion score of 95+ in any exercise',
      xp: 400,
      reward: 'Perfectionist Badge',
      completed: (progress?.averageMotionScore || 0) >= 95,
      progress: calculateMilestoneProgress(6)
    }
  ];

  const calculateOverallProgress = () => {
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.completed).length;
    return totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  };

  // Calculate total badges for header
  const totalBadges = displayEarnedBadges.length + displayInProgressBadges.length + lockedBadges.length;

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
              <Text style={styles.headerTitle}>Achievements</Text>
              <View style={styles.headerStats}>
                <Text style={styles.headerStatsText}>
                  {displayEarnedBadges.length}/{totalBadges}
                </Text>
              </View>
            </View>

            {/* Progress Overview */}
            <View style={styles.progressOverview}>
              <Text style={styles.overviewTitle}>Your Progress</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{progress?.level || 1}</Text>
                  <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{(progress?.xp || 0).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total XP</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{progress?.streak || 0}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
              </View>
              <View style={styles.overallProgress}>
                <View style={styles.overallProgressBar}>
                  <View style={[styles.overallProgressFill, { width: `${calculateOverallProgress()}%` }]} />
                </View>
                <Text style={styles.overallProgressText}>{Math.round(calculateOverallProgress())}% Complete</Text>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabPress('badges', 0)}
              >
                <Text style={[styles.tabText, selectedTab === 'badges' && styles.activeTabText]}>
                  Badges
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabPress('milestones', 1)}
              >
                <Text style={[styles.tabText, selectedTab === 'milestones' && styles.activeTabText]}>
                  Milestones
                </Text>
              </TouchableOpacity>
              <Animated.View 
                style={[
                  styles.tabIndicator,
                  {
                    transform: [{
                      translateX: tabIndicator.interpolate({
                        inputRange: [0, 1],
                        outputRange: [5, (screenWidth - 50) / 2],
                      })
                    }]
                  }
                ]} 
              />
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {selectedTab === 'badges' ? (
                <View style={styles.badgesContent}>
                  {displayEarnedBadges.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Earned Badges ({displayEarnedBadges.length})</Text>
                      <View style={styles.badgesGrid}>
                        {displayEarnedBadges.map((badge) => (
                          <Badge key={badge.id} badge={badge} />
                        ))}
                      </View>
                    </>
                  )}
                  
                  {displayInProgressBadges.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>In Progress ({displayInProgressBadges.length})</Text>
                      <View style={styles.badgesGrid}>
                        {displayInProgressBadges.map((badge) => (
                          <Badge key={badge.id} badge={badge} />
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={styles.sectionTitle}>Locked Badges ({lockedBadges.length})</Text>
                  <View style={styles.badgesGrid}>
                    {lockedBadges.map((badge) => (
                      <Badge key={badge.id} badge={badge} isLocked={true} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.milestonesContent}>
                  <Text style={styles.sectionTitle}>Your Journey</Text>
                  {milestones.map((milestone) => (
                    <Milestone 
                      key={milestone.id} 
                      milestone={milestone} 
                      isCompleted={milestone.completed}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerStats: {
    alignItems: 'center',
  },
  headerStatsText: {
    color: '#ff4c48',
    fontSize: 16,
    fontWeight: '600',
  },
  progressOverview: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 20,
    borderRadius: 15,
    padding: 20,
  },
  overviewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#ff4c48',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 5,
  },
  overallProgress: {
    alignItems: 'center',
  },
  overallProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 4,
  },
  overallProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 5,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabIndicator: {
    position: 'absolute',
    top: 5,
    width: (screenWidth - 50) / 2 - 10,
    height: 34,
    backgroundColor: '#ff4c48',
    borderRadius: 20,
    zIndex: 0,
  },
  scrollContent: {
    flex: 1,
    marginTop: 20,
  },
  badgesContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  badgeCard: {
    width: (screenWidth - 60) / 2,
    marginBottom: 15,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  lockedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockedIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  lockedEmoji: {
    fontSize: 20,
  },
  badgeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  badgeDescription: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 16,
  },
  lockedText: {
    opacity: 0.5,
  },
  progressContainer: {
    width: '100%',
    marginTop: 10,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 2,
  },
  progressText: {
    color: '#ff4c48',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  unlockedDate: {
    color: '#4CAF50',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.8,
  },
  milestonesContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  milestoneCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  completedMilestone: {
    borderColor: 'rgba(76, 175, 80, 0.5)',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  milestoneLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneIcon: {
    marginRight: 15,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  completedTitle: {
    color: '#4CAF50',
  },
  milestoneDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 5,
  },
  completedDescription: {
    opacity: 1,
  },
  milestoneReward: {
    color: '#ff4c48',
    fontSize: 12,
    fontWeight: '600',
  },
  milestoneProgressContainer: {
    marginTop: 8,
  },
  milestoneProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 4,
  },
  milestoneProgressFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 2,
  },
  milestoneProgressText: {
    color: '#ff4c48',
    fontSize: 10,
    fontWeight: '600',
  },
  milestoneRight: {
    alignItems: 'flex-end',
  },
  milestoneXP: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  completedXP: {
    color: '#4CAF50',
  },
});

export default BadgesAndMilestonesScreen;