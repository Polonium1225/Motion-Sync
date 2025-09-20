import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useNavigation } from '@react-navigation/native';
import { useUserData, useUserProgress, useUserBadges } from '../hooks/useUserData';

export default function BadgesMilestoneCard({ navigation }) {
  const navigation1 = useNavigation();
  
  // Get data from UserDataManager
  const { userData, isInitialized } = useUserData();
  const { progress, levelProgress } = useUserProgress();
  const { badges } = useUserBadges();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Handle navigation to different screens
  const handleNavigateToBadges = () => {
    navigation1.navigate('BadgesAndMilestonesScreen');
  };

  const handleNavigateToXP = () => {
    // You can create this screen or navigate to existing one
    navigation1.navigate('BadgesAndMilestonesScreen');
  };

  const handleNavigateToGoals = () => {
    // You can create this screen or navigate to existing one
    navigation1.navigate('BadgesAndMilestonesScreen');
  };

  // Start animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 6,
        bounciness: 4,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Calculate stats from UserDataManager data
  const getStats = () => {
    if (!isInitialized || !progress) {
      return {
        badgeCount: 0,
        currentLevel: 'Level 1',
        goalsCompleted: 0
      };
    }

    // Calculate completed milestones/goals based on progress
    const completedGoals = [
      progress.totalSessions >= 1 ? 1 : 0, // First session
      progress.totalSessions >= 5 ? 1 : 0, // 5 sessions
      progress.totalSessions >= 10 ? 1 : 0, // 10 sessions
      progress.streak >= 3 ? 1 : 0, // 3-day streak
      progress.streak >= 7 ? 1 : 0, // 7-day streak
      progress.averageMotionScore >= 70 ? 1 : 0, // 70% avg score
      progress.averageMotionScore >= 85 ? 1 : 0, // 85% avg score
      progress.perfectForms >= 5 ? 1 : 0, // 5 perfect forms
      progress.perfectForms >= 15 ? 1 : 0, // 15 perfect forms
    ].reduce((sum, goal) => sum + goal, 0);

    return {
      badgeCount: badges?.earned?.length || 0,
      currentLevel: `Level ${progress.level}`,
      goalsCompleted: completedGoals
    };
  };

  const stats = getStats();

  // Enhanced List Item Component
  const ListItem = ({ icon, text, onPress, iconColor = "#ff4c48", gradientColors, badge, subtitle }) => {
    const itemScaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(itemScaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(itemScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: itemScaleAnim }] }}>
        <TouchableOpacity 
          style={styles.listItem} 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.listItemGradient}
          >
            <View style={styles.listItemContent}>
              <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.listText}>{text}</Text>
                {subtitle && <Text style={styles.listSubtext}>{subtitle}</Text>}
              </View>
              {badge && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleMainButtonPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handleMainButtonPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Show loading state if UserDataManager not ready
  if (!isInitialized) {
    return (
      <Animated.View 
        style={[
          styles.cardContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.2)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.loadingContainer}>
            <Ionicons name="hourglass" size={24} color="#ff4c48" />
            <Text style={styles.loadingText}>Loading your progress...</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.cardContainer,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.2)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="trophy" size={24} color="#ff4c48" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.cardTitle}>Badges & Milestones</Text>
            <Text style={styles.cardSubtitle}>Track your achievements</Text>
          </View>
        </View>

        {/* Quick Stats Row - Now using real data */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.badgeCount}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.currentLevel}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.goalsCompleted}</Text>
            <Text style={styles.statLabel}>Goals</Text>
          </View>
        </View>

        {/* Progress Bar for Current Level */}
        {levelProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Level Progress</Text>
              <Text style={styles.progressPercentage}>{Math.round(levelProgress.progressPercentage)}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: `${levelProgress.progressPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressXP}>
              {levelProgress.progressXP} / {levelProgress.requiredXP} XP
            </Text>
          </View>
        )}

        {/* List Items with real data */}
        <View style={styles.listContainer}>
          <ListItem
            icon="trophy"
            text="Badges & Milestones"
            subtitle={`${stats.badgeCount} badges earned`}
            onPress={handleNavigateToBadges}
            iconColor="#ff4c48"
            gradientColors={["rgba(255, 76, 72, 0.15)", "rgba(255, 76, 72, 0.05)"]}
            badge={stats.badgeCount > 0 ? `+${stats.badgeCount}` : null}
          />

          <ListItem
            icon="star"
            text="XP & Levels"
            subtitle={`${(progress?.xp || 0).toLocaleString()} total XP`}
            onPress={handleNavigateToXP}
            iconColor="#ffc107"
            gradientColors={["rgba(255, 193, 7, 0.15)", "rgba(255, 193, 7, 0.05)"]}
          />

          <ListItem
            icons ="target"
            text="Daily & Weekly Goals"
            subtitle={`${stats.goalsCompleted} completed`}
            onPress={handleNavigateToGoals}
            iconColor="#4caf50"
            gradientColors={["rgba(76, 175, 80, 0.15)", "rgba(76, 175, 80, 0.05)"]}
            badge={progress?.streak > 0 ? `${progress.streak}🔥` : null}
          />
        </View>

        {/* Recent Achievement Display */}
        {badges?.lastEarnedBadge && (
          <View style={styles.recentAchievement}>
            <Text style={styles.recentTitle}>Recent Achievement</Text>
            <View style={styles.recentBadge}>
              <Text style={styles.recentEmoji}>{badges.lastEarnedBadge.icon}</Text>
              <View style={styles.recentInfo}>
                <Text style={styles.recentBadgeTitle}>{badges.lastEarnedBadge.title}</Text>
                <Text style={styles.recentBadgeDesc}>{badges.lastEarnedBadge.description}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Main Action Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            style={styles.mainButton} 
            onPress={handleNavigateToBadges}
            onPressIn={handleMainButtonPressIn}
            onPressOut={handleMainButtonPressOut}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#ff4c48", "#c44569"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mainButtonGradient}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="eye" size={18} color="#fff" />
                <Text style={styles.buttonText}>View All Achievements</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 15,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowOffset: { width: 0, height: 6 },
  },
  
  // Loading State
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 10,
  },
  
  // Header Section
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 76, 72, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4c48',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statDivider: {
    width: 1,
    height: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Progress Section
  progressSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#ff4c48',
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 4,
  },
  progressXP: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  
  // List Items
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItemGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  listText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  listSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#ff4c48',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Recent Achievement
  recentAchievement: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  recentTitle: {
    fontSize: 14,
    color: '#ffc107',
    fontWeight: '600',
    marginBottom: 8,
  },
  recentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentBadgeTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  recentBadgeDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  
  // Main Button
  mainButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#ff4c48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonGradient: {
    borderRadius: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
});