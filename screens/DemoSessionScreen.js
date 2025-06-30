import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  Animated,
  BackHandler
} from 'react-native';
import WebView from 'react-native-webview';
import { Camera, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from './config';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';
import { useUserData } from '../hooks/useUserData';

const DEMO_API = `${API_CONFIG.BASE_URL}/pose_tracker/demo`;
const { width, height } = Dimensions.get('window');

export default function DemoSessionScreen() {
  const navigation = useNavigation();
  const { addWorkoutSession } = useUserData();
  
  // Demo state
  const [isLoading, setIsLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(null);
  const [webViewKey, setWebViewKey] = useState(1);
  const [sessionStartTime] = useState(Date.now());
  const [completedSteps, setCompletedSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function getCameraPermission() {
      if (!permission?.granted) {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Demo session needs camera access to track your movements.',
            [
              { text: 'Cancel', onPress: () => navigation.goBack() },
              { text: 'Grant Permission', onPress: requestPermission }
            ]
          );
          return;
        }
      }
      
      // Start fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
    
    getCameraPermission();
  }, [permission, requestPermission]);

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Exit Demo Session?',
        'Are you sure you want to exit the demo session?',
        [
          { text: 'Continue Demo', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // WebView configuration
  const demoUrl = `${DEMO_API}?token=${API_CONFIG.API_KEY}&width=${width}&height=${height}&skeleton=true`;

  const jsBridge = `
    window.addEventListener('message', function(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
    });

    window.webViewCallback = function(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    };

    // Handle demo completion
    window.addEventListener('load', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'demo_ready',
        message: 'Demo session loaded'
      }));
    });

    true;
  `;

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Demo message:', data);
      
      if (data.type === 'demo_ready') {
        setIsLoading(false);
      } else if (data.type === 'demo_complete') {
        handleDemoCompletion(data);
      } else if (data.type === 'demo_step_complete') {
        handleStepCompletion(data);
      } else if (data.type === 'demo_status') {
        setCurrentStep(data.step);
      }
      
    } catch (error) {
      console.error('Error processing demo message:', error);
    }
  };

  const handleStepCompletion = (data) => {
    console.log('Step completed:', data);
    
    // Update completed steps array
    setCompletedSteps(prev => {
      const newSteps = [...prev];
      if (!newSteps.includes(data.step_index)) {
        newSteps.push(data.step_index);
      }
      return newSteps;
    });
  };

  const handleDemoCompletion = async (data) => {
    const totalDuration = Date.now() - sessionStartTime;
    const stepsCompleted = data.steps_completed || 5;
    
    try {
      // Calculate demo session metrics
      const averageScore = 85; // Base score for completing demo
      const bonusScore = Math.min(stepsCompleted * 3, 15); // Bonus for each step
      const finalScore = Math.min(averageScore + bonusScore, 100);
      
      const demoData = {
        exerciseType: 'demo_session',
        motionScore: finalScore,
        duration: Math.floor(totalDuration / 1000),
        perfectForms: Math.floor(stepsCompleted * 0.8), // Estimate perfect forms
        date: new Date().toISOString(),
        stepsCompleted: stepsCompleted,
        isDemoSession: true
      };

      const xpGained = await addWorkoutSession(demoData);
      
      // Show completion dialog
      Alert.alert(
        '🎉 Demo Session Complete!',
        `Congratulations! You've experienced AI motion tracking!\n\n` +
        `✅ Steps Completed: ${stepsCompleted}/5\n` +
        `📊 Demo Score: ${finalScore}%\n` +
        `⏱️ Duration: ${Math.floor(totalDuration / 60000)}m ${Math.floor((totalDuration % 60000) / 1000)}s\n` +
        `🏆 XP Gained: ${xpGained}\n\n` +
        `Ready to try live motion tracking?`,
        [
          { 
            text: 'View Progress', 
            onPress: () => navigation.navigate('Performance') 
          },
          { 
            text: 'Try Live Tracking', 
            onPress: () => navigation.navigate('CameraScreen'),
            style: 'default'
          },
          { 
            text: 'Done', 
            onPress: () => navigation.goBack(),
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error saving demo session:', error);
      Alert.alert(
        'Demo Complete!',
        'Great job completing the demo session! You\'re ready for live motion tracking.',
        [
          { text: 'Try Live Tracking', onPress: () => navigation.navigate('CameraScreen') },
          { text: 'Done', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const handleReload = () => {
    setWebViewError(null);
    setIsLoading(true);
    setWebViewKey(prevKey => prevKey + 1);
  };

  if (!permission?.granted) {
    return (
      <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera" size={64} color="#ff4c48" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              The demo session needs camera access to track your movements and provide real-time feedback.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.permissionButton, styles.cancelButton]} 
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.permissionButtonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Demo Session</Text>
              <Text style={styles.headerSubtitle}>
                {currentStep ? `Current: ${currentStep.replace('_', ' ')}` : 'AI Motion Analysis Demo'}
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <Text style={styles.stepCounter}>{completedSteps.length}/5</Text>
            </View>
          </View>

          {/* WebView Container */}
          <View style={styles.webViewContainer}>
            {webViewError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={48} color="#ff4c48" />
                <Text style={styles.errorTitle}>Connection Error</Text>
                <Text style={styles.errorText}>{webViewError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <WebView
                key={webViewKey}
                source={{ uri: demoUrl }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlaybook={true}
                mediaPlaybackRequiresUserAction={false}
                androidHardwareAccelerationDisabled={true}
                injectedJavaScript={jsBridge}
                onMessage={onMessage}
                onError={(error) => {
                  console.error('WebView error:', error);
                  setWebViewError('Failed to load demo session');
                }}
                onLoadingError={(error) => {
                  console.error('WebView loading error:', error);
                  setWebViewError('Could not connect to demo server');
                }}
                onLoadStart={() => setIsLoading(true)}
                onLoad={() => setIsLoading(false)}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ff4c48" />
                    <Text style={styles.loadingText}>Loading demo session...</Text>
                    <Text style={styles.loadingSubtext}>
                      This may take a moment to initialize the camera and AI
                    </Text>
                  </View>
                )}
                renderError={() => (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={48} color="#ff4c48" />
                    <Text style={styles.errorTitle}>Failed to Load</Text>
                    <Text style={styles.errorText}>Could not load the demo session</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
                      <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
            
            {/* Loading Overlay */}
            {isLoading && !webViewError && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color="#ff4c48" />
                  <Text style={styles.loadingTitle}>Preparing Demo Session</Text>
                  <Text style={styles.loadingDescription}>
                    • Initializing AI motion detection{'\n'}
                    • Setting up camera interface{'\n'}
                    • Loading guided instructions
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Demo Progress</Text>
            <View style={styles.progressDots}>
              {[1, 2, 3, 4, 5].map((step, index) => (
                <View
                  key={step}
                  style={[
                    styles.progressDot,
                    index < completedSteps.length && styles.progressDotCompleted,
                    index === completedSteps.length && styles.progressDotActive
                  ]}
                />
              ))}
            </View>
          </View>

        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#ff4c48',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    minWidth: 200,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'center',
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff4c48',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 15,
    textAlign: 'center',
  },
  loadingDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#ff4c48',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
    transform: [{ scale: 1.2 }],
  },
  progressDotActive: {
    backgroundColor: '#ff4c48',
    transform: [{ scale: 1.3 }],
  },
});