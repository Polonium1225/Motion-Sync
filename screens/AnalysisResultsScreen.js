import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Animated,
  ScrollView,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

const backgroundImage = require('../assets/sfgsdh.png');

export default function AnalysisResultsScreen({ navigation, route }) {
  const { analysisId, movement, movementName, videoInfo, results } = route.params;
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 85) return '#4caf50'; // Green
    if (score >= 70) return '#ffa726'; // Orange
    return '#ff5722'; // Red
  };

  const getFormQuality = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    return 'Needs Improvement';
  };

  const shareResults = async () => {
    try {
      const shareContent = {
        message: `Check out my ${movementName} analysis! Overall score: ${results.overall_score}/100 - ${getFormQuality(results.overall_score)}`,
        title: `${movementName} Form Analysis`
      };
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderScoreCard = (title, score, icon, description) => {
    const color = getScoreColor(score);
    const circumference = 2 * Math.PI * 30; // radius = 30
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <View style={styles.scoreCard}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreCardGradient}
        >
          <View style={styles.scoreHeader}>
            <View style={[styles.scoreIcon, { backgroundColor: `${color}30` }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.scoreTitle}>{title}</Text>
          </View>
          
          <View style={styles.scoreContent}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{score}</Text>
              <Text style={styles.scoreUnit}>%</Text>
            </View>
            <Text style={styles.scoreDescription}>{description}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderRecommendationCard = (recommendation, index) => {
    return (
      <View key={index} style={styles.recommendationCard}>
        <View style={styles.recommendationIcon}>
          <Ionicons name="bulb" size={16} color="#ffa726" />
        </View>
        <Text style={styles.recommendationText}>{recommendation}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={backgroundImage} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('MainTabs')} 
              style={styles.backButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Analysis Results</Text>
            <TouchableOpacity 
              onPress={shareResults} 
              style={styles.shareButton}
            >
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Overall Score Section */}
              <Animated.View 
                style={[
                  styles.overallSection,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 76, 72, 0.3)', 'rgba(255, 76, 72, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.overallGradient}
                >
                  <View style={styles.overallHeader}>
                    <View style={styles.movementIconContainer}>
                      <Ionicons name="fitness" size={32} color="#ff4c48" />
                    </View>
                    <View style={styles.overallTextContainer}>
                      <Text style={styles.movementName}>{movementName} Analysis</Text>
                      <Text style={styles.analysisDate}>
                        {new Date().toLocaleDateString()} • {results.rep_count} reps
                      </Text>
                    </View>
                  </View>

                  <View style={styles.overallScoreContainer}>
                    <View style={styles.mainScoreCircle}>
                      <Text style={styles.mainScoreValue}>{results.overall_score}</Text>
                      <Text style={styles.mainScoreUnit}>%</Text>
                    </View>
                    <View style={styles.qualityContainer}>
                      <Text style={styles.qualityLabel}>Form Quality</Text>
                      <Text style={[
                        styles.qualityValue,
                        { color: getScoreColor(results.overall_score) }
                      ]}>
                        {getFormQuality(results.overall_score)}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Detailed Metrics */}
              <View style={styles.metricsSection}>
                <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
                <View style={styles.metricsGrid}>
                  {renderScoreCard(
                    'Depth',
                    results.metrics.depth_score,
                    'arrow-down',
                    'Squat depth quality'
                  )}
                  {renderScoreCard(
                    'Balance',
                    results.metrics.balance_score,
                    'balance',
                    'Body stability'
                  )}
                  {renderScoreCard(
                    'Tempo',
                    results.metrics.tempo_score,
                    'time',
                    'Movement timing'
                  )}
                  {renderScoreCard(
                    'Symmetry',
                    results.metrics.symmetry_score,
                    'sync',
                    'Left-right balance'
                  )}
                </View>
              </View>

              {/* Recommendations */}
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
                <View style={styles.recommendationsList}>
                  {results.recommendations.map((recommendation, index) => 
                    renderRecommendationCard(recommendation, index)
                  )}
                </View>
              </View>

              {/* Performance Stats */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Performance Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.statGradient}
                    >
                      <Ionicons name="repeat" size={24} color="#ff4c48" />
                      <Text style={styles.statValue}>{results.rep_count}</Text>
                      <Text style={styles.statLabel}>Repetitions</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.statGradient}
                    >
                      <Ionicons name="stopwatch" size={24} color="#ff4c48" />
                      <Text style={styles.statValue}>{results.analysis_duration}s</Text>
                      <Text style={styles.statLabel}>Duration</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.statGradient}
                    >
                      <Ionicons name="trending-up" size={24} color="#ff4c48" />
                      <Text style={styles.statValue}>+5</Text>
                      <Text style={styles.statLabel}>XP Earned</Text>
                    </LinearGradient>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsSection}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('MovementSelectionScreen')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#ff4c48', '#ff6b6b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Analyze Another Video</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.secondaryButtons}>
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('ProgressScreen')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trending-up" size={18} color="#ff4c48" />
                    <Text style={styles.secondaryButtonText}>View Progress</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={shareResults}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-outline" size={18} color="#ff4c48" />
                    <Text style={styles.secondaryButtonText}>Share Results</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Padding */}
              <View style={styles.bottomPadding} />
            </ScrollView>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  overallSection: {
    marginBottom: 30,
  },
  overallGradient: {
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  movementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.5)',
  },
  overallTextContainer: {
    flex: 1,
  },
  movementName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  analysisDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  overallScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainScoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ff4c48',
  },
  mainScoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainScoreUnit: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: -4,
  },
  qualityContainer: {
    alignItems: 'flex-end',
  },
  qualityLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  qualityValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  metricsGrid: {
    gap: 15,
  },
  scoreCard: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scoreCardGradient: {
    padding: 15,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreUnit: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 2,
  },
  scoreDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  recommendationsSection: {
    marginBottom: 30,
  },
  recommendationsList: {
    gap: 10,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recommendationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  statsSection: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statGradient: {
    padding: 15,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4c48',
  },
  bottomPadding: {
    height: 20,
  },
});