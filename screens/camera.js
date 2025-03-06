import React, { useState,useEffect,useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Button,SafeAreaView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen({ navigation }) {
  const cameraRef = useRef(null); 
  const [facing, setFacing] = useState('back'); // Remove TypeScript notation
  const [flash, setFlash] = useState('off');
  const [hasGalleryPermission, setHasGalleryPermission] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasGalleryPermission(status === 'granted');
    })();
  }, []);

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container}>
      <Text>Loading camera permissions...</Text>
    </View>;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }
  const takePicture = async () => {
    if (camera) {
      const options = { quality: 1, base64: true };
      const data = await camera.takePictureAsync(options);
      if (hasGalleryPermission) {
        await MediaLibrary.saveToLibraryAsync(data.uri);
      }
    }
  };
  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.cameraContainer}>
      {/* Use CameraView instead of Camera */}
      <CameraView
        facing={facing}
        style={styles.camera}
        ref={cameraRef} // Assign the ref to the camera
        type={facing} // Use CameraType values
        flashMode={flash}
        ratio="16:9"
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={toggleFlash}>
              <Ionicons name="flash" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    cameraContainer: {
      flex: 1,
    },
    camera: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      justifyContent: 'space-between',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    button: {
      padding: 10,
      borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.3)',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    bottomControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 30,
    },
    captureButton: {
      width: 70,
      height: 70,
      borderRadius: 50,
      backgroundColor: '#05907A',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    captureInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#fff',
    },
  });