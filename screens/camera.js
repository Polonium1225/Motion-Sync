import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity
} from 'react-native';
import WebView from 'react-native-webview';
import { Camera, useCameraPermissions } from 'expo-camera';

// API key and configuration
const API_KEY = "b747416a-bf1b-4417-af5a-25c2996507af";

// For local testing, use localhost on an emulator or your machine's local IP for a physical device
const API_HOST = "poseapi-zvlf.onrender.com"; // Change this to your server's IP if testing on physical device

// Construct the API URL - use HTTPS in production
const PROTOCOL = "https"; // Change to "https" for production
const POSETRACKER_API = `${PROTOCOL}://${API_HOST}/pose_tracker/tracking`;

const { width, height } = Dimensions.get('window');

export default function App() {
  const [poseTrackerInfos, setCurrentPoseTrackerInfos] = useState(null);
  const [repsCounter, setRepsCounter] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(null);
  const [webViewKey, setWebViewKey] = useState(1); // For forcing WebView reload
  const [webViewStarted, setWebViewStarted] = useState(false);

  // Force-request camera permissions on app load
  useEffect(() => {
    async function getCameraPermission() {
      if (!permission?.granted) {
        const { status } = await requestPermission();
        if (status === 'granted') {
          // Reload WebView after permissions granted
          setWebViewKey(prevKey => prevKey + 1);
        } else {
          Alert.alert(
            'Camera Permission Required',
            'This app needs camera access to track your exercises. Please grant permission in your settings.',
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
  const exercise = "squat";
  const difficulty = "easy";
  const skeleton = true;

  // Full URL with query parameters
  const posetracker_url = `${POSETRACKER_API}?token=${API_KEY}&exercise=${exercise}&difficulty=${difficulty}&width=${width}&height=${height}&skeleton=${skeleton}`;

  // Debug the URL being accessed
  console.log("Connecting to: ", posetracker_url);

  // Simplified JS Bridge based on working example
  const jsBridge = `
    window.addEventListener('message', function(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
    });

    window.webViewCallback = function(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    };

    const originalPostMessage = window.postMessage;
    window.postMessage = function(data) {
      window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
    };

    // Signal ready state to React Native
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'status',
      message: 'WebView JS bridge initialized'
    }));

    true; // Important for a correct injection
  `;

  // Process counter updates from WebView
  const handleCounter = (count) => {
    setRepsCounter(count);
  };

  // Process info updates from WebView
  const handleInfos = (infos) => {
    setCurrentPoseTrackerInfos(infos);
    
    // Log but filter frequent messages to avoid console spam
    if (infos?.type !== 'counter') {
      console.log('Received infos:', infos);
    }
    
    // Mark loading complete when we get first message
    if (isLoading) {
      setIsLoading(false);
    }
  };

  // Process all messages from WebView
  const webViewCallback = (info) => {
    // Handle specific message types
    if (info?.type === 'counter') {
      handleCounter(info.current_count);
    } else if (info?.type === 'error') {
      console.error('Error from WebView:', info.message);
      // Optional: Set error state if serious error
      if (info.message.includes('Camera error') || info.message.includes('not available')) {
        setWebViewError(info.message);
      }
    } else if (info?.type === 'connection') {
      console.log('Connection status:', info.status);
    } else {
      // Handle other message types
      handleInfos(info);
    }
  };

  // Process raw messages from WebView
  const onMessage = (event) => {
    // try {
    //   let parsedData;
    //   if (typeof event.nativeEvent.data === 'string') {
    //     parsedData = JSON.parse(event.nativeEvent.data);
    //   } else {
    //     parsedData = event.nativeEvent.data;
    //   }

    //   webViewCallback(parsedData);
    // } catch (error) {
    //   console.error('Error processing message:', error);
    //   console.log('Problematic data:', event.nativeEvent.data);
    // }
  };

  // Reload WebView function
  const handleReload = () => {
    setWebViewError(null);
    setIsLoading(true);
    setWebViewKey(prevKey => prevKey + 1); // Force WebView recreation
  };

  return (
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
            debuggingEnabled={true}
            mixedContentMode="compatibility" // Changed from "always" to "compatibility"
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
          
          <View style={styles.infoContainer}>
            {isLoading ? (
              <Text>Initializing camera and tracking...</Text>
            ) : (
              <>
                <Text style={styles.statusLabel}>Status: {!poseTrackerInfos ? "Loading AI..." : "AI Running"}</Text>
                <Text style={styles.infoLabel}>Info type: {!poseTrackerInfos ? "Loading..." : poseTrackerInfos.type}</Text>
                <Text style={styles.counterLabel}>Squats: {repsCounter}</Text>
                {poseTrackerInfos?.ready === false ? (
                  <View style={styles.placementContainer}>
                    <Text style={styles.readyLabel}>Not ready</Text>
                    <Text style={styles.directionLabel}>
                      Please move {poseTrackerInfos?.postureDirection}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.placementContainer}>
                    <Text style={styles.readyLabel}>Ready!</Text>
                    <Text style={styles.directionLabel}>You can start doing squats 🏋️</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  webView: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  infoContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 10,
  },
  statusLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoLabel: {
    marginBottom: 5,
  },
  counterLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  placementContainer: {
    alignItems: 'center',
  },
  readyLabel: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  directionLabel: {
    marginTop: 5,
  },
});