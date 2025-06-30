import React, { useState, useEffect } from 'react';
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
  StatusBar
} from 'react-native';
import WebView from 'react-native-webview';
import { Camera, useCameraPermissions } from 'expo-camera';
import { API_CONFIG } from './config';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';

// Construct the API URL using config
const POSETRACKER_API = `${API_CONFIG.BASE_URL}/pose_tracker/tracking`;

const { width, height } = Dimensions.get('window');

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(null);
  const [webViewKey, setWebViewKey] = useState(1);
  const [webViewStarted, setWebViewStarted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

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
            'This app needs camera access. Please grant permission in your settings.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setWebViewStarted(true);
      }
    }
    
    getCameraPermission();
  }, [permission, requestPermission]);

  // Configuration variables
  const exercise = "general";
  const difficulty = "easy";
  const skeleton = true;

  // Calculate proper dimensions
  const webViewWidth = width;
  const webViewHeight = Math.min(height * 0.7, width * 1.5);

  // Full URL with query parameters
  const posetracker_url = `${POSETRACKER_API}?token=${API_CONFIG.API_KEY}&exercise=${exercise}&difficulty=${difficulty}&width=${webViewWidth}&height=${webViewHeight}&skeleton=${skeleton}`;

  console.log("Connecting to: ", posetracker_url);

  // Enhanced JS Bridge
  const jsBridge = `
    window.addEventListener('message', function(event) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
      }
    });

    window.webViewCallback = function(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    };

    const originalPostMessage = window.postMessage;
    window.postMessage = function(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
      }
    };

    // Signal ready state to React Native
    setTimeout(() => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'status',
          message: 'WebView JS bridge initialized'
        }));
      }
    }, 100);

    true;
  `;

  // Process messages from WebView
  const onMessage = (event) => {
    try {
      let parsedData;
      const rawData = event.nativeEvent.data;
      
      if (typeof rawData === 'string') {
        // Try to parse JSON string
        if (rawData.startsWith('{') || rawData.startsWith('[')) {
          parsedData = JSON.parse(rawData);
        } else {
          // Handle non-JSON string messages
          console.log('Received non-JSON message:', rawData);
          return;
        }
      } else {
        parsedData = rawData;
      }

      // Validate parsed data
      if (parsedData && typeof parsedData === 'object') {
        if (parsedData.type === 'status') {
          setConnectionStatus('connected');
          console.log('Status update:', parsedData.message);
        }
        // Ignore other message types (counter, info, etc.) but don't error
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      console.log('Raw message data:', event.nativeEvent.data);
    }
  };

  // Reload function
  const handleReload = () => {
    setWebViewError(null);
    setIsLoading(true);
    setConnectionStatus('connecting');
    setWebViewKey(prevKey => prevKey + 1);
  };

  // Get status indicator color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#F44336';
      default: return '#FF9800';
    }
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
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
              {/* Camera Feed Container */}
              <View style={styles.webViewContainer}>
                <WebView
                  key={webViewKey}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
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
                  onLoadingError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView loading error:', nativeEvent);
                    setWebViewError(`Could not connect to server: ${nativeEvent.description || 'Connection failed'}`);
                  }}
                  onLoadStart={() => setIsLoading(true)}
                  onLoad={() => {
                    console.log('WebView loaded');
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
              
              {/* Simple Overlay */}
              <View style={styles.overlay}>
                {/* Connection Status */}
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                  <Text style={styles.statusText}>
                    {connectionStatus.toUpperCase()}
                  </Text>
                </View>

                {/* Reload Button */}
                <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
                  <Text style={styles.reloadButtonText}>↻</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webViewContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    margin: 10,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reloadButton: {
    position: 'absolute',
    top: 0,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
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
});