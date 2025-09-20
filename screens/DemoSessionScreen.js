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
  BackHandler,
  Platform
} from 'react-native';
import WebView from 'react-native-webview';
import { Camera, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
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
  const [currentStep, setCurrentStep] = useState('Get Ready');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successOverlayAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef(null);
  
  // Audio
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRefs = useRef({
    success: null,
    tick: null,
    start: null,
    complete: null
  });

  // Initialize audio on component mount
  useEffect(() => {
    setupAudio();
    return () => {
      // Cleanup audio on unmount
      Object.values(audioRefs.current).forEach(audio => {
        if (audio && typeof audio.unloadAsync === 'function') {
          audio.unloadAsync().catch(e => console.log('Audio cleanup error:', e));
        }
      });
    };
  }, []);

  const setupAudio = async () => {
    try {
      // Set audio mode for better mobile compatibility
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch((e) => {
        console.log('Audio mode setup warning:', e.message);
      });

      // Load audio files from assets/sounds/ directory (static requires only)
      const audioFiles = {
        success: require('../assets/sounds/success.wav'),
        tick: require('../assets/sounds/tick.wav'),
        start: require('../assets/sounds/start.wav'),
        complete: require('../assets/sounds/complete.wav'),
      };

      // Load all audio files
      for (const [key, source] of Object.entries(audioFiles)) {
        try {
          const { sound } = await Audio.Sound.createAsync(source, {
            shouldPlay: false,
            volume: 1.0,
          });
          audioRefs.current[key] = sound;
          console.log(`✅ Loaded ${key} audio successfully`);
        } catch (error) {
          console.log(`❌ Failed to load ${key} audio:`, error.message);
        }
      }

      // Check if at least some audio files loaded
      const loadedSounds = Object.values(audioRefs.current).filter(sound => sound && !sound.fallback);
      if (loadedSounds.length > 0) {
        setAudioEnabled(true);
        console.log(`✅ Audio setup completed: ${loadedSounds.length}/4 sounds loaded`);
      } else {
        console.warn('⚠️ No audio files could be loaded - continuing without sound');
        setAudioEnabled(false);
        // Create fallback placeholders
        audioRefs.current = {
          success: { fallback: true },
          tick: { fallback: true },
          start: { fallback: true },
          complete: { fallback: true }
        };
      }
    } catch (error) {
      console.error('Audio setup failed:', error);
      setAudioEnabled(false);
      // Create fallback placeholders
      audioRefs.current = {
        success: { fallback: true },
        tick: { fallback: true },
        start: { fallback: true },
        complete: { fallback: true }
      };
    }
  };

  const playSound = async (soundType) => {
    if (!audioRefs.current[soundType]) {
      console.log(`❌ Sound not loaded: ${soundType}`);
      return;
    }

    try {
      const sound = audioRefs.current[soundType];
      
      // Check if it's a fallback placeholder
      if (sound.fallback) {
        console.log(`🔇 ${soundType} sound (fallback mode - no audio)`);
        return;
      }
      
      // Check if it's a valid Audio.Sound object
      if (sound && sound._loaded) {
        // Reset position and play
        await sound.setPositionAsync(0);
        await sound.playAsync();
        console.log(`🔊 Played sound: ${soundType}`);
      } else if (sound && typeof sound.replayAsync === 'function') {
        // Try replayAsync method
        await sound.replayAsync();
        console.log(`🔊 Played sound: ${soundType} (replay)`);
      } else {
        console.log(`❓ Sound object exists but can't play: ${soundType}`);
        // Try to reload the sound
        if (sound.unloadAsync && sound.loadAsync) {
          await sound.unloadAsync();
          await sound.loadAsync();
          await sound.playAsync();
          console.log(`🔊 Reloaded and played sound: ${soundType}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error playing sound ${soundType}:`, error.message);
      // Try to recover by resetting the sound
      try {
        const sound = audioRefs.current[soundType];
        if (sound && sound.stopAsync) {
          await sound.stopAsync();
          await sound.setPositionAsync(0);
          await sound.playAsync();
          console.log(`🔊 Recovered and played sound: ${soundType}`);
        }
      } catch (recoveryError) {
        console.log(`❌ Recovery failed for ${soundType}:`, recoveryError.message);
      }
    }
  };

  const showSuccessOverlay = () => {
    console.log('Showing success overlay animation');
    
    // Reset animation
    successOverlayAnim.setValue(0);
    
    // Start success animation
    Animated.sequence([
      Animated.timing(successOverlayAnim, {
        toValue: 0.7,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(successOverlayAnim, {
        toValue: 0.7,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(successOverlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

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
      
      setCameraReady(true);
      
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
        'Your progress will be lost. Are you sure you want to exit?',
        [
          { text: 'Continue Demo', style: 'cancel' },
          { 
            text: 'Exit', 
            style: 'destructive', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Build the demo URL with proper parameters
  const demoUrl = `${DEMO_API}?token=${API_CONFIG.API_KEY}&width=${width}&height=${height}&skeleton=true`;

  // Enhanced JavaScript bridge with better error handling
  const jsBridge = `
    (function() {
      // Set up message bridge
      window.ReactNativeWebView = window.ReactNativeWebView || {};
      
      // Override console for debugging
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = function(...args) {
        originalLog.apply(console, args);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'console',
          level: 'log',
          message: args.join(' ')
        }));
      };
      
      console.error = function(...args) {
        originalError.apply(console, args);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'console',
          level: 'error',
          message: args.join(' ')
        }));
      };
      
      // Set up message handling
      window.addEventListener('message', function(event) {
        if (event.data && window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
        }
      });
      
      // Set up callback
      window.webViewCallback = function(data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      };
      
      // Handle errors
      window.addEventListener('error', function(event) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: event.error ? event.error.message : 'Unknown error',
          stack: event.error ? event.error.stack : ''
        }));
      });
      
      // Notify when ready
      setTimeout(function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'webview_ready',
          message: 'WebView initialized'
        }));
      }, 100);
    })();
    
    true;
  `;

  // Handle messages from WebView
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Console logging for debugging
      if (data.type === 'console') {
        console.log(`[WebView ${data.level}]:`, data.message);
        return;
      }
      
      console.log('Demo message:', data);
      
      switch (data.type) {
        case 'webview_ready':
          console.log('WebView ready');
          break;
          
        case 'demo_ready':
          setIsLoading(false);
          setCurrentStep('Stand Naturally');
          break;

        // Handle audio/visual feedback messages from WebView
        case 'pose_detected':
          console.log('Pose detected - playing start sound');
          playSound('start');
          break;

        case 'pose_tick':
          console.log('Pose tick - playing tick sound');
          playSound('tick');
          break;

        case 'pose_success':
          console.log('Pose success - showing success feedback');
          playSound('success');
          showSuccessOverlay();
          break;

        case 'countdown_tick':
          console.log('Countdown tick');
          playSound('tick');
          break;

        case 'countdown_go':
          console.log('Countdown GO - playing start sound');
          playSound('start');
          break;

        case 'demo_completion_success':
          console.log('Demo completion - playing complete sound');
          playSound('complete');
          showSuccessOverlay();
          break;
          
        case 'demo_step_complete':
          handleStepCompletion(data);
          break;
          
        case 'demo_status':
          handleStatusUpdate(data);
          break;
          
        case 'demo_complete':
          handleDemoCompletion(data);
          break;
          
        case 'error':
          console.error('WebView error:', data.message);
          if (data.stack) console.error('Stack:', data.stack);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
      
    } catch (error) {
      console.log('Raw message:', event.nativeEvent.data);
    }
  };

  const handleStatusUpdate = (data) => {
    if (data.step) {
      const stepNames = {
        'idle': 'Stand Naturally',
        't_pose': 'T-Pose',
        'hands_up': 'Hands Up!'
      };
      
      setCurrentStep(stepNames[data.step] || data.step);
      setCurrentStepIndex(data.step_index || 0);
    }
  };

  const handleStepCompletion = (data) => {
    console.log('Step completed:', data);
    
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
    const stepsCompleted = data.steps_completed || 3;
    
    try {
      const finalScore = Math.min(80 + (stepsCompleted * 5), 100);
      
      const demoData = {
        exerciseType: 'demo_session',
        motionScore: finalScore,
        duration: Math.floor(totalDuration / 1000),
        perfectForms: stepsCompleted,
        date: new Date().toISOString(),
        stepsCompleted: stepsCompleted,
        isDemoSession: true
      };

      const xpGained = await addWorkoutSession(demoData);
      
      Alert.alert(
        '🎉 Demo Complete!',
        `Great job! You've completed the AI motion tracking demo!\n\n` +
        `✅ Steps: ${stepsCompleted}/3\n` +
        `📊 Score: ${finalScore}%\n` +
        `🆙 XP Gained: ${xpGained}`,
        [
          { 
            text: 'Try Live Tracking', 
            onPress: () => navigation.navigate('CameraScreen')
          },
          { 
            text: 'Done', 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving demo:', error);
      Alert.alert('Demo Complete!', 'Ready for live tracking!');
    }
  };

  const handleReload = () => {
    setWebViewError(null);
    setIsLoading(true);
    setCurrentStep('Get Ready');
    setCurrentStepIndex(0);
    setCompletedSteps([]);
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
              The demo session needs camera access to track your movements.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
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

  // WebView specific configuration for camera access
  const webViewProps = Platform.select({
    ios: {
      allowsInlineMediaPlaybook: true,
      mediaPlaybackRequiresUserAction: false,
      allowsAirPlayForMediaPlayback: true,
    },
    android: {
      javaScriptEnabled: true,
      domStorageEnabled: true,
      androidHardwareAccelerationDisabled: false,
      mixedContentMode: 'always',
      onPermissionRequest: (request) => {
        console.log('Permission requested:', request);
        request.grant();
      },
    },
  });

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
              <Text style={styles.headerTitle}>AI Demo Session</Text>
              <Text style={styles.headerSubtitle}>
                {currentStep} • Step {currentStepIndex + 1}/3
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <Text style={styles.stepCounter}>{completedSteps.length}/3</Text>
            </View>
          </View>

          {/* WebView Container */}
          <View style={styles.webViewContainer}>
            {cameraReady ? (
              <WebView
                ref={webViewRef}
                key={webViewKey}
                source={{ uri: demoUrl }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                injectedJavaScript={jsBridge}
                onMessage={onMessage}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error:', nativeEvent);
                  setWebViewError(nativeEvent.description);
                }}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => {
                  console.log('WebView loaded');
                  setTimeout(() => setIsLoading(false), 1000);
                }}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ff4c48" />
                    <Text style={styles.loadingText}>Initializing Demo...</Text>
                  </View>
                )}
                {...webViewProps}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff4c48" />
                <Text style={styles.loadingText}>Setting up camera...</Text>
              </View>
            )}
            
            {/* Success Overlay - Handled in React Native */}
            <Animated.View 
              style={[
                styles.successOverlay, 
                { 
                  opacity: successOverlayAnim,
                  pointerEvents: 'none' 
                }
              ]}
            />
            
            {/* Loading Overlay */}
            {isLoading && cameraReady && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color="#ff4c48" />
                  <Text style={styles.loadingTitle}>Loading Demo</Text>
                  <Text style={styles.loadingDescription}>
                    Preparing pose detection...
                  </Text>
                </View>
              </View>
            )}
            
            {/* Error display */}
            {webViewError && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorText}>Error: {webViewError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progress</Text>
            <View style={styles.progressDots}>
              {['Stand', 'T-Pose', 'Hands'].map((step, index) => (
                <View key={index} style={styles.progressItem}>
                  <View
                    style={[
                      styles.progressDot,
                      completedSteps.includes(index) && styles.progressDotCompleted,
                      index === currentStepIndex && styles.progressDotActive
                    ]}
                  />
                  <Text style={styles.progressStepName}>{step}</Text>
                </View>
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
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
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
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  loadingDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  errorOverlay: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
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
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 5,
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressDotActive: {
    backgroundColor: '#ff4c48',
    transform: [{ scale: 1.2 }],
  },
  progressStepName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
});