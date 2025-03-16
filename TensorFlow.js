import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native'; // This is important for Expo
import * as poseDetection from '@tensorflow-models/pose-detection';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Button, Platform } from 'react-native';
import { Camera } from 'expo-camera';

const PoseEstimationCamera = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [model, setModel] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    // Request camera permission
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Initialize the pose detection model
    const loadModel = async () => {
      await tf.ready();
      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
      setModel(detector);
    };
    loadModel();
  }, []);

  const handleFrame = async (cameraFrame) => {
    if (model) {
      const poses = await model.estimatePoses(cameraFrame);
      console.log(poses); // Do something with the pose data
    }
  };

  const startCamera = () => {
    // Start the camera feed and use the frame for pose estimation
    cameraRef.current?.startAsync();
  };

  if (hasPermission === null) {
    return <View />;
  } else if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.front}
        ref={cameraRef}
        onCameraReady={startCamera}
        onFrameProcessed={({ frame }) => handleFrame(frame)}
      >
        {/* Display any overlay for detected poses or objects here */}
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
});

export default PoseEstimationCamera;
