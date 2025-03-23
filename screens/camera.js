import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import WebView from 'react-native-webview';
import { Camera } from 'expo-camera';

const POSETRACKER_API = "http://192.168.231.253:8000";  
const WS_URL = "ws://192.168.231.253:8000/ws";
const { width, height } = Dimensions.get('window');

export default function App() {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [isConnected, setIsConnected] = useState(false);
  const [debugText, setDebugText] = useState('Initializing...');
  const cameraRef = useRef(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, []);

  const posetracker_url = `${POSETRACKER_API}/`;

  const jsBridge = `
    function debugLog(message) {
      console.log(message);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: message }));
    }

    function setupWebSocket() {
      debugLog('Setting up WebSocket to ${WS_URL}');
      window.ws = new WebSocket('${WS_URL}');
      
      window.ws.onopen = function() {
        debugLog('WebSocket connected');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'connection', status: 'connected' }));
      };
      
      window.ws.onclose = function(event) {
        debugLog('WebSocket closed: ' + event.code + ' ' + event.reason);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'connection', status: 'disconnected' }));
        setTimeout(setupWebSocket, 3000);
      };
      
      window.ws.onerror = function(error) {
        debugLog('WebSocket error: ' + JSON.stringify(error));
      };
      
      window.ws.onmessage = function(event) {
        debugLog('Received message: ' + event.data.length + ' characters');
        window.ReactNativeWebView.postMessage(event.data);
      };
    }
    
    setupWebSocket();

    window.addEventListener('message', function(event) {
      try {
        let data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.image) {
          debugLog('Received image data, length: ' + data.image.length);
          
          let fixedBase64 = data.image.replace(/\\s/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
          
          if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(fixedBase64);
            debugLog('Sent image to WebSocket');
          } else {
            debugLog('WebSocket not ready, cannot send image');
          }
        }
      } catch (error) {
        debugLog('Error processing message: ' + error.message);
      }
    });

    window.webViewCallback = function(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    };

    window.addEventListener('load', function() {
      debugLog('Page fully loaded');
    });

    debugLog('JS Bridge initialized');
    true;
  `;

  const sendFrame = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'image', image: "${photo.base64}" }));
        `);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(sendFrame, 1000); // Capture every 1 second
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Camera ref={cameraRef} style={styles.camera} type={Camera.Constants.Type.front} />
      <WebView
        ref={webViewRef}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        style={styles.webView}
        source={{ uri: posetracker_url }}
        originWhitelist={['*']}
        injectedJavaScript={jsBridge}
        onMessage={(event) => console.log("Received:", event.nativeEvent.data)}
      />
      <View style={styles.infoContainer}>
        <Text>Debug: {debugText}</Text>
        <Text>Connection: {isConnected ? "Connected" : "Disconnected"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { width: '100%', height: '50%', position: 'absolute' },
  webView: { width: '100%', height: '100%' },
  infoContainer: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', padding: 10 },
});
