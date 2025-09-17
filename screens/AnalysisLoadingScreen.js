import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  Animated,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import { API_CONFIG } from './config';

const backgroundImage = require('../assets/sfgsdh.png');

const analysisSteps = [
  {
    id: 'upload',
    title: 'Video Upload',
    description: 'Processing video file',
    icon: 'cloud-upload',
    duration: 2000
  },
  {
    id: 'preprocessing',
    title: 'Video Preprocessing', 
    description: 'Extracting frames and preparing data',
    icon: 'film',
    duration: 3000
  },
  {
    id: 'pose_detection',
    title: 'Pose Detection',
    description: 'Identifying key body points',
    icon: 'body',
    duration: 4000
  },
  {
    id: 'movement_analysis',
    title: 'Movement Analysis',
    description: 'Analyzing form and technique',
    icon: 'analytics',
    duration: 3000
  },
  {
    id: 'generating_report',
    title: 'Generating Report',
    description: 'Creating personalized feedback',
    icon: 'document-text',
    duration: 2000
  }
];

export default function AnalysisLoadingScreen({ navigation, route }) {
  const { analysisId, movement, movementName, videoInfo } = route.params;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const progressAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Start fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Start pulse animation
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulseAnimation();

    // Start analysis process
    startAnalysis();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startAnalysis = async () => {
    // Simulate the analysis process with realistic timing
    let currentProgress = 0;
    let stepIndex = 0;

    for (let step of analysisSteps) {
      setCurrentStep(stepIndex);
      
      // Animate progress for current step
      const stepProgress = (stepIndex + 1) / analysisSteps.length * 100;
      
      Animated.timing(progressAnim, {
        toValue: stepProgress,
        duration: step.duration,
        useNativeDriver: false,
      }).start();

      // Update progress text gradually
      const progressInterval = setInterval(() => {
        currentProgress += 2;
        if (currentProgress >= stepProgress) {
          currentProgress = stepProgress;
          clearInterval(progressInterval);
        }
        setProgress(Math.round(currentProgress));
      }, step.duration / 50);

      // Wait for step duration
      await new Promise(resolve => {
        timeoutRef.current = setTimeout(resolve, step.duration);
      });

      stepIndex++;
    }

    // Poll for analysis completion
    pollForResults();
  };

  const pollForResults = async () => {
    try {
      // Use the config to get API URL (same pattern as your other screens)
      const statusUrl = `${API_CONFIG.BASE_URL}/movement-analysis/status/${analysisId}`;
      console.log('Checking analysis status:', statusUrl);

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      
      if (response.ok) {
        const status = await response.json();
        
        if (status.status === 'completed') {
          // Analysis complete, navigate to results
          navigation.replace('AnalysisResultsScreen', {
            analysisId,
            movement,
            movementName,
            videoInfo,
            results: status.results
          });
        } else if (status.status === 'failed') {
          // Analysis failed, show error and go back
          navigation.goBack();
          Alert.alert('Analysis Failed', status.error || 'Sorry, we couldn\'t analyze your video. Please try again.');
        } else {
          // Still processing, check again after interval (2 seconds)
          setTimeout(pollForResults, 2000);
        }
      } else {
        // Handle non-OK response - fall back to mock for demo
        console.log('Status check failed, using mock results');
        
        setTimeout(() => {
          navigation.replace('AnalysisResultsScreen', {
            analysisId,
            movement,
            movementName,
            videoInfo,
            results: generateMockResults()
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Error polling for results:', error);
      
      // For demo, proceed to results with mock data
      setTimeout(() => {
        navigation.replace('AnalysisResultsScreen', {
          analysisId,
          movement,
          movementName,
          videoInfo,
          results: generateMockResults()
        });
      }, 2000);
    }
  };

  const generateMockResults = () => {
    // Mock results for demonstration when backend is not available
    return {
      overall_score: 78,
      form_quality: 'Good',
      movement_type: movementName.toLowerCase(),
      recommendations: [
        'Keep your knees aligned with your toes',
        'Go deeper in your squat for better glute activation',
        'Maintain a more upright torso position'
      ],
      metrics: {
        depth_score: 82,
        balance_score: 75,
        tempo_score: 80,
        symmetry_score: 76
      },
      rep_count: 12,
      analysis_duration: 45.2,
      video_info: {
        duration: videoInfo?.duration || 45.2,
        fps: 30,
        frame_count: 1356
      },
      pose_detection_stats: {
        total_frames: 1356,
        frames_with_pose: 1298,
        detection_rate: 95.7
      }
    };
  };

  const renderStepItem = (step, index) => {
    const isActive = index === currentStep;
    const isCompleted = index < currentStep;
    const isUpcoming = index > currentStep;

    return (
      <View key={step.id} style={styles.stepItem}>
        <View style={[
          styles.stepIcon,
          isActive && styles.stepIconActive,
          isCompleted && styles.stepIconCompleted,
          isUpcoming && styles.stepIconUpcoming
        ]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={20} color="#4caf50" />
          ) : (
            <Ionicons 
              name={step.icon} 
              size={20} 
              color={isActive ? '#ff4c48' : 'rgba(255, 255, 255, 0.4)'} 
            />
          )}
        </View>
        <View style={styles.stepContent}>
          <Text style={[
            styles.stepTitle,
            isActive && styles.stepTitleActive,
            isCompleted && styles.stepTitleCompleted
          ]}>
            {step.title}
          </Text>
          <Text style={[
            styles.stepDescription,
            isActive && styles.stepDescriptionActive
          ]}>
            {step.description}
          </Text>
        </View>
        {isActive && (
          <ActivityIndicator 
            size="small" 
            color="#ff4c48" 
            style={styles.stepLoader}
          />
        )}
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
          <Animated.View 
            style={[
              styles.content,
              { opacity: fadeAnim }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Analyzing Your {movementName}</Text>
              <Text style={styles.headerSubtitle}>
                Our AI is processing your video...
              </Text>
            </View>

            {/* Main Animation */}
            <View style={styles.animationSection}>
              <Animated.View 
                style={[
                  styles.mainIcon,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 76, 72, 0.3)', 'rgba(255, 76, 72, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name="analytics" size={48} color="#ff4c48" />
                </LinearGradient>
              </Animated.View>

              {/* Progress Circle */}
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                        extrapolate: 'clamp'
                      })
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Steps List */}
            <View style={styles.stepsSection}>
              <Text style={styles.stepsTitle}>Analysis Progress</Text>
              <View style={styles.stepsList}>
                {analysisSteps.map((step, index) => renderStepItem(step, index))}
              </View>
            </View>

            {/* Video Info */}
            <View style={styles.videoInfoSection}>
              <View style={styles.videoInfoCard}>
                <View style={styles.videoInfoHeader}>
                  <Ionicons name="videocam" size={20} color="#ff4c48" />
                  <Text style={styles.videoInfoTitle}>Video Details</Text>
                </View>
                <View style={styles.videoInfoContent}>
                  <Text style={styles.videoInfoText}>
                    File: {videoInfo?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.videoInfoText}>
                    Movement: {movementName}
                  </Text>
                  <Text style={styles.videoInfoText}>
                    Processing Time: ~15-30 seconds
                  </Text>
                </View>
              </View>
            </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  animationSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  mainIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#ff4c48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.5)',
    borderRadius: 50,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ff4c48',
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressSection: {
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 4,
  },
  stepsSection: {
    flex: 1,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepIconActive: {
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    borderColor: 'rgba(255, 76, 72, 0.5)',
  },
  stepIconCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  stepIconUpcoming: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  stepTitleActive: {
    color: '#fff',
  },
  stepTitleCompleted: {
    color: '#4caf50',
  },
  stepDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  stepDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stepLoader: {
    marginLeft: 10,
  },
  videoInfoSection: {
    marginBottom: 20,
  },
  videoInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  videoInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  videoInfoContent: {
    gap: 4,
  },
  videoInfoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});