import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import WebView from 'react-native-webview';
import { Camera, useCameraPermissions } from 'expo-camera';
import { API_CONFIG } from './config';
import Colors from '../constants/Colors';

// Construct the API URL using config
const POSETRACKER_API = `${API_CONFIG.BASE_URL}/pose_tracker/tracking`;

const { width, height } = Dimensions.get('window');

export default function OptimizedCameraApp() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(null);
  const [webViewKey, setWebViewKey] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [currentCamera, setCurrentCamera] = useState('Front');
  
  // WebView reference for optimization
  const webViewRef = useRef(null);

  // Force-request camera permissions on app load
  useEffect(() => {
    async function getCameraPermission() {
      if (!permission?.granted) {
        const { status } = await requestPermission();
        if (status === 'granted') {
          setWebViewKey(prevKey => prevKey + 1);
        } else {
          Alert.alert(
            'Camera Permission Required',
            'This app needs camera access for pose tracking. Please grant permission in your settings.',
            [{ text: 'OK' }]
          );
        }
      }
    }
    
    getCameraPermission();
  }, [permission, requestPermission]);

  // Optimized configuration
  const exercise = "general";
  const difficulty = "easy";
  const skeleton = true;

  // Calculate optimized dimensions for performance
  const webViewWidth = Math.min(width, 480);
  const webViewHeight = Math.min(height * 0.75, webViewWidth * 0.75);

  // Enhanced URL with performance parameters
  const posetracker_url = `${POSETRACKER_API}?token=${API_CONFIG.API_KEY}&exercise=${exercise}&difficulty=${difficulty}&width=${webViewWidth}&height=${webViewHeight}&skeleton=${skeleton}&optimize=true`;

  console.log("Connecting to optimized endpoint: ", posetracker_url);

  // Simplified and robust JS Bridge
  const jsBridge = `
    (function() {
      console.log('Initializing WebView bridge...');
      
      // Simple, safe message posting
      function sendToReactNative(data) {
        try {
          if (window.ReactNativeWebView) {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            window.ReactNativeWebView.postMessage(message);
          }
        } catch (error) {
          console.error('Bridge error:', error);
        }
      }
      
      // Override all message functions with the safe version
      window.webViewCallback = sendToReactNative;
      window.postMessage = sendToReactNative;
      
      // Handle incoming messages safely
      window.addEventListener('message', function(event) {
        if (event.data) {
          sendToReactNative(event.data);
        }
      });
      
      // Signal ready
      setTimeout(function() {
        sendToReactNative({
          type: 'status',
          message: 'WebView bridge ready'
        });
      }, 500);
      
      console.log('WebView bridge initialized');
      return true;
    })();
  `;

  // Simplified message handler
  const onMessage = useCallback((event) => {
    try {
      const data = event?.nativeEvent?.data;
      if (!data || typeof data !== 'string') {
        return;
      }
      
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        console.log('Received non-JSON message:', data);
        return;
      }
      
      if (parsed && parsed.type) {
        switch (parsed.type) {
          case 'status':
            console.log('Status:', parsed.message);
            if (parsed.message === 'WebView bridge ready') {
              setConnectionStatus('connected');
              setIsLoading(false);
            }
            break;
          case 'camera_switch':
            console.log('Camera switching to:', parsed.camera);
            setCurrentCamera(parsed.camera);
            break;
          case 'camera_switch_success':
            console.log('Camera switch successful:', parsed.message);
            setCurrentCamera(parsed.camera);
            break;
          case 'camera_switch_error':
            console.error('Camera switch failed:', parsed.message);
            Alert.alert('Camera Error', parsed.message);
            break;
          case 'pose_data':
            setConnectionStatus('active');
            break;
          case 'error':
            console.error('WebView error:', parsed.message);
            setConnectionStatus('error');
            setWebViewError(parsed.message);
            break;
        }
      }
    } catch (error) {
      console.error('Message handler error:', error);
    }
  }, []);

  // Reload function (keep this for React Native level errors)
  const handleReload = useCallback(() => {
    setWebViewError(null);
    setIsLoading(true);
    setConnectionStatus('connecting');
    setCurrentCamera('Front');
    setWebViewKey(prevKey => prevKey + 1);
  }, []);

  // Get status indicator color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'active': return '#8BC34A';
      case 'disconnected': return '#F44336';
      case 'error': return '#FF5722';
      default: return '#FF9800';
    }
  };

  // WebView configuration
  const webViewConfig = {
    javaScriptEnabled: true,
    domStorageEnabled: true,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    mixedContentMode: 'compatibility',
    scrollEnabled: false,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
    bounces: false,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {webViewError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorText}>{webViewError}</Text>
            <TouchableOpacity style={styles.button} onPress={handleReload}>
              <Text style={styles.buttonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.webViewContainer}>
              <WebView
                ref={webViewRef}
                key={webViewKey}
                {...webViewConfig}
                style={styles.webView}
                source={{ uri: posetracker_url }}
                originWhitelist={['*']}
                injectedJavaScript={jsBridge}
                onMessage={onMessage}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView error:', nativeEvent);
                  setWebViewError(`Failed to load pose tracker: ${nativeEvent.description || 'Unknown error'}`);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView HTTP error:', nativeEvent);
                  setWebViewError(`Server error: ${nativeEvent.statusCode || 'Connection failed'}`);
                }}
                onLoadingError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView loading error:', nativeEvent);
                  setWebViewError(`Could not connect to server: ${nativeEvent.description || 'Connection failed'}`);
                }}
                onLoadStart={() => setIsLoading(true)}
                onLoad={() => {
                  console.log('Optimized WebView loaded');
                  setIsLoading(false);
                }}
                onLoadEnd={() => {
                  setIsLoading(false);
                }}
                renderLoading={() => (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={styles.loadingText}>Loading pose tracker...</Text>
                  </View>
                )}
                startInLoadingState={true}
              />
            </View>
            
            {/* Simplified overlay - only React Native specific info */}
            <View style={styles.overlay}>
              <View style={styles.leftControls}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                  <Text style={styles.statusText}>
                    RN: {connectionStatus.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cameraModeIndicator}>
                  <Text style={styles.cameraModeText}>
                    Current: {currentCamera}
                  </Text>
                </View>
              </View>

              {/* Only show reload button in top right for emergencies */}
              <View style={styles.rightControls}>
                <TouchableOpacity 
                  style={styles.reloadButton} 
                  onPress={handleReload}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reloadButtonText}>↻</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingOverlayText}>Initializing...</Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    margin: 10,
    backgroundColor: '#000',
    shouldRasterizeIOS: true,
    rasterizationScale: Platform.OS === 'ios' ? 2 : 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftControls: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightControls: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cameraModeIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    marginTop:-80,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    elevation: 3,
  },
  cameraModeText: {
    color: 'white',
    top:5,
    fontSize: 10,
    fontWeight: '600',
  },
  reloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reloadButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    margin: 20,
    borderRadius: 15,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#F44336',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  loadingOverlayText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});