import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground, 
  Animated, 
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

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

  // Navigation functions for different analysis types
  const navigateToLiveTracking = () => {
    try {
      navigation.navigate('CameraScreen');
    } catch (error) {
      Alert.alert('Navigation Error', 'Live tracking screen not found');
    }
  };

  const navigateToPoseEstimation = () => {
    try {
      navigation.navigate('image_analyser3d');
    } catch (error) {
      Alert.alert('Navigation Error', 'Pose estimation screen not found');
    }
  };

  const navigateToVideoAnalysis = () => {
    try {
      navigation.navigate('VideoAnalysis');
    } catch (error) {
      Alert.alert('Coming Soon', 'Video analysis feature will be available soon!');
    }
  };

  const navigateToPerformanceMetrics = () => {
    try {
      navigation.navigate('Performance');
    } catch (error) {
      Alert.alert('Navigation Error', 'Performance metrics screen not found');
    }
  };

  const navigateToFormCorrection = () => {
    try {
      navigation.navigate('FormCorrection');
    } catch (error) {
      Alert.alert('Coming Soon', 'Form correction feature will be available soon!');
    }
  };

  const navigateToMovementComparison = () => {
    try {
      navigation.navigate('MovementComparison');
    } catch (error) {
      Alert.alert('Coming Soon', 'Movement comparison feature will be available soon!');
    }
  };

  // Analysis Card Component
  const AnalysisCard = ({ 
    title, 
    description, 
    icon, 
    color, 
    onPress, 
    isHighlighted = false 
  }) => (
    <TouchableOpacity
      style={[styles.analysisCard, isHighlighted && styles.highlightedCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={color}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <Ionicons name={icon} size={32} color="#fff" />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardDescription}>{description}</Text>
        <View style={styles.cardAction}>
          <Text style={styles.actionText}>Start Analysis</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Quick Stats Component
  const QuickStat = ({ label, value, icon }) => (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color="#ff4c48" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Motion Analysis Hub</Text>
              <Text style={styles.description}>
                Advanced movement analysis using AI-powered pose estimation and real-time tracking
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <QuickStat label="Sessions" value="12" icon="fitness" />
              <QuickStat label="Accuracy" value="94%" icon="checkmark-circle" />
              <QuickStat label="Improvements" value="23" icon="trending-up" />
            </View>

            {/* Live Motion Tracking - Featured */}
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}> Live Analysis</Text>
              <TouchableOpacity
                style={styles.liveTrackingCard}
                onPress={navigateToLiveTracking}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#ff4c48", "#c44569", "#8b2635"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liveCardGradient}
                >
                  <View style={styles.liveCardContent}>
                    <View style={styles.liveIndicator}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                    <Text style={styles.liveTitle}>Real-Time Motion Tracking</Text>
                    <Text style={styles.liveDescription}>
                      Get instant feedback on your form with live pose detection
                    </Text>
                    <View style={styles.startButton}>
                      <Ionicons name="play" size={24} color="#ff4c48" />
                      <Text style={styles.startButtonText}>Start Live Session</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Analysis Tools */}
            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}> Analysis Tools</Text>
              
              <View style={styles.analysisGrid}>
                <AnalysisCard
                  title="Pose Estimation"
                  description="Analyze movement from photos and detect 33 key pose landmarks"
                  icon="body"
                  color={["#2c2c2c", "#1a1a1a", "#000000"]}
                  onPress={navigateToPoseEstimation}
                />

                <AnalysisCard
                  title="Video Analysis"
                  description="Frame-by-frame breakdown of recorded workout videos"
                  icon="videocam"
                  color={["#3c3c3c", "#2a2a2a", "#1c1c1c"]}
                  onPress={navigateToVideoAnalysis}
                />

                <AnalysisCard
                  title="Performance Metrics"
                  description="Detailed statistics and progress tracking over time"
                  icon="analytics"
                  color={["#232526", "#414345"]}
                  onPress={navigateToPerformanceMetrics}
                />

                <AnalysisCard
                  title="Form Correction"
                  description="AI-powered suggestions for improving exercise technique"
                  icon="fitness"
                  color={["#3a3a3a", "#252525", "#1a1a1a"]}
                  onPress={navigateToFormCorrection}
                />

                <AnalysisCard
                  title="Movement Comparison"
                  description="Compare your form against perfect exercise examples"
                  icon="git-compare"
                  color={["#434343", "#000000"]}
                  onPress={navigateToMovementComparison}
                />

                <AnalysisCard
                  title="3D Model Matching"
                  description="Visualize your pose on a 3D human model in real-time"
                  icon="cube"
                  color={["#4a4a4a", "#2e2e2e", "#1a1a1a"]}
                  onPress={navigateToPoseEstimation}
                />
              </View>
            </View>

            {/* Analysis Features */}
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}> Analysis Features</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="eye" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>33-point pose landmark detection</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="speedometer" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Real-time motion analysis</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="analytics" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Scientific movement metrics</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trophy" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Form accuracy scoring</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trending-up" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Progress tracking over time</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="bulb" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>AI-powered improvement suggestions</Text>
                </View>
              </View>
            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  liveTrackingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  liveCardGradient: {
    padding: 20,
  },
  liveCardContent: {
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  liveTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  liveDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#ff4c48',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  analysisSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  analysisGrid: {
    gap: 15,
  },
  analysisCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 15,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  featuresList: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});