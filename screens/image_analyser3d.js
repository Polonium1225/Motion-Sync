import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const PoseEstimationApp = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [poseData, setPoseData] = useState(null);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const webViewRef = useRef(null);

  // Backend API URL - Your working ngrok URL
  const API_BASE_URL = 'https://3be2-160-166-59-89.ngrok-free.app';

  const showImagePickerModal = () => {
    setShowImagePicker(true);
  };

  const selectImageSource = async (source) => {
    setShowImagePicker(false);
    
    try {
      let result;
      
      if (source === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPermission.status !== 'granted') {
          Alert.alert('Permission denied', 'Sorry, we need camera permissions to make this work!');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });
      } else {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libraryPermission.status !== 'granted') {
          Alert.alert('Permission denied', 'Sorry, we need gallery permissions to make this work!');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64,
          type: 'image/jpeg',
          fileName: `image_${Date.now()}.jpg`,
        });
        
        setPoseData(null);
        setAnnotatedImage(null);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImageToPoseAPI = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      const fileUri = selectedImage.uri;
      const filename = selectedImage.fileName || 'image.jpg';
      const type = selectedImage.type || 'image/jpeg';

      formData.append('image', {
        uri: fileUri,
        type: type,
        name: filename,
      });

      console.log('Uploading to:', `${API_BASE_URL}/pose-estimation`);

      const response = await fetch(`${API_BASE_URL}/pose-estimation`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API Result:', result);

      if (result.success) {
        setPoseData(result);
        setAnnotatedImage(result.annotated_image);
        updateModelPose(result.landmarks);
        Alert.alert('Success', `Pose detected with ${result.landmark_count} landmarks!`);
      } else {
        console.log('Pose detection failed:', result);
        Alert.alert('Error', result.error || 'Failed to detect pose');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.message.includes('Network request failed')) {
        Alert.alert(
          'Network Error', 
          'Cannot connect to the server. Please check:\n\n' +
          '1. Your internet connection\n' +
          '2. If the backend server is running\n' +
          '3. If the ngrok URL is correct and active\n\n' +
          `Current URL: ${API_BASE_URL}`
        );
      } else {
        Alert.alert('Error', `Upload failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateModelPose = (landmarks) => {
    if (!webViewRef.current || !landmarks) return;

    const poseUpdate = {
      type: 'UPDATE_POSE',
      landmarks: landmarks,
    };

    webViewRef.current.postMessage(JSON.stringify(poseUpdate));
  };

  const resetPose = () => {
    if (!webViewRef.current) return;

    const resetMessage = {
      type: 'RESET_POSE',
    };

    webViewRef.current.postMessage(JSON.stringify(resetMessage));
  };

  const testBackendConnection = async () => {
    try {
      console.log('Testing connection to:', `${API_BASE_URL}/health`);
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      
      console.log('Health check status:', response.status);
      const result = await response.json();
      console.log('Health check result:', result);
      Alert.alert('Connection Test', `Status: ${result.status}\nService: ${result.service}`);
    } catch (error) {
      console.error('Connection test failed:', error);
      Alert.alert('Connection Failed', error.message);
    }
  };

  const html3DModel = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>3D Pose Model</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js"></script>
      <style>
        body { margin: 0; overflow: hidden; background: #1a1a1a; }
        canvas { display: block; }
        #debug { position: absolute; top: 10px; left: 10px; color: white; font-family: monospace; z-index: 1000; }
      </style>
    </head>
    <body>
      <div id="debug"></div>
      <script>
        let scene, camera, renderer, controls, model, mixer;
        let bones = {};
        let originalBoneData = {};

        init();
        animate();

        function init() {
          scene = new THREE.Scene();
          scene.background = new THREE.Color(0x1a1a1a);

          camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
          camera.position.set(0, 5, 10);

          renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.shadowMap.enabled = true;
          document.body.appendChild(renderer.domElement);

          controls = new THREE.OrbitControls(camera, renderer.domElement);
          controls.target.set(0, 2, 0);
          controls.enableDamping = true;
          controls.update();

          const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
          scene.add(ambientLight);

          const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
          directionalLight.position.set(5, 10, 5);
          directionalLight.castShadow = true;
          scene.add(directionalLight);

          const groundGeometry = new THREE.PlaneGeometry(20, 20);
          const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
          const ground = new THREE.Mesh(groundGeometry, groundMaterial);
          ground.rotation.x = -Math.PI / 2;
          ground.receiveShadow = true;
          scene.add(ground);

          loadModel();

          window.addEventListener('message', handleMessage);
          document.addEventListener('message', handleMessage);
        }

        function loadModel() {
          // Create a simple stick figure model since FBX loading might fail
          createStickFigureModel();
        }

        function createStickFigureModel() {
          const group = new THREE.Group();
          
          // Materials
          const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 });
          const jointMaterial = new THREE.MeshPhongMaterial({ color: 0xFF6B6B });
          
          // Store bone references for easier access
          const boneRefs = {};
          
          // Head
          const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
          const head = new THREE.Mesh(headGeometry, jointMaterial);
          head.position.set(0, 5, 0);
          head.name = 'head';
          group.add(head);
          boneRefs.head = head;
          
          // Torso (spine)
          const torsoGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.5);
          const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
          torso.position.set(0, 4, 0);
          torso.name = 'torso';
          group.add(torso);
          boneRefs.torso = torso;
          
          // Left shoulder
          const shoulderGeometry = new THREE.SphereGeometry(0.08, 6, 6);
          const leftShoulder = new THREE.Mesh(shoulderGeometry, jointMaterial);
          leftShoulder.position.set(-0.5, 4.5, 0);
          leftShoulder.name = 'leftShoulder';
          group.add(leftShoulder);
          boneRefs.leftShoulder = leftShoulder;
          
          // Right shoulder
          const rightShoulder = new THREE.Mesh(shoulderGeometry, jointMaterial);
          rightShoulder.position.set(0.5, 4.5, 0);
          rightShoulder.name = 'rightShoulder';
          group.add(rightShoulder);
          boneRefs.rightShoulder = rightShoulder;
          
          // Left upper arm
          const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
          const leftUpperArm = new THREE.Mesh(armGeometry, bodyMaterial);
          leftUpperArm.position.set(-0.8, 4, 0);
          leftUpperArm.name = 'leftUpperArm';
          group.add(leftUpperArm);
          boneRefs.leftUpperArm = leftUpperArm;
          
          // Right upper arm
          const rightUpperArm = new THREE.Mesh(armGeometry, bodyMaterial);
          rightUpperArm.position.set(0.8, 4, 0);
          rightUpperArm.name = 'rightUpperArm';
          group.add(rightUpperArm);
          boneRefs.rightUpperArm = rightUpperArm;
          
          // Left elbow
          const leftElbow = new THREE.Mesh(shoulderGeometry, jointMaterial);
          leftElbow.position.set(-1.2, 3.5, 0);
          leftElbow.name = 'leftElbow';
          group.add(leftElbow);
          boneRefs.leftElbow = leftElbow;
          
          // Right elbow
          const rightElbow = new THREE.Mesh(shoulderGeometry, jointMaterial);
          rightElbow.position.set(1.2, 3.5, 0);
          rightElbow.name = 'rightElbow';
          group.add(rightElbow);
          boneRefs.rightElbow = rightElbow;
          
          // Left forearm
          const leftForearm = new THREE.Mesh(armGeometry, bodyMaterial);
          leftForearm.position.set(-1.5, 3, 0);
          leftForearm.name = 'leftForearm';
          group.add(leftForearm);
          boneRefs.leftForearm = leftForearm;
          
          // Right forearm
          const rightForearm = new THREE.Mesh(armGeometry, bodyMaterial);
          rightForearm.position.set(1.5, 3, 0);
          rightForearm.name = 'rightForearm';
          group.add(rightForearm);
          boneRefs.rightForearm = rightForearm;
          
          // Left wrist
          const leftWrist = new THREE.Mesh(shoulderGeometry, jointMaterial);
          leftWrist.position.set(-1.8, 2.5, 0);
          leftWrist.name = 'leftWrist';
          group.add(leftWrist);
          boneRefs.leftWrist = leftWrist;
          
          // Right wrist
          const rightWrist = new THREE.Mesh(shoulderGeometry, jointMaterial);
          rightWrist.position.set(1.8, 2.5, 0);
          rightWrist.name = 'rightWrist';
          group.add(rightWrist);
          boneRefs.rightWrist = rightWrist;
          
          // Hips
          const hipGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6);
          const hips = new THREE.Mesh(hipGeometry, bodyMaterial);
          hips.position.set(0, 3.2, 0);
          hips.rotation.z = Math.PI / 2;
          hips.name = 'hips';
          group.add(hips);
          boneRefs.hips = hips;
          
          // Left hip
          const leftHip = new THREE.Mesh(shoulderGeometry, jointMaterial);
          leftHip.position.set(-0.3, 3.2, 0);
          leftHip.name = 'leftHip';
          group.add(leftHip);
          boneRefs.leftHip = leftHip;
          
          // Right hip
          const rightHip = new THREE.Mesh(shoulderGeometry, jointMaterial);
          rightHip.position.set(0.3, 3.2, 0);
          rightHip.name = 'rightHip';
          group.add(rightHip);
          boneRefs.rightHip = rightHip;
          
          // Left thigh
          const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1);
          const leftThigh = new THREE.Mesh(legGeometry, bodyMaterial);
          leftThigh.position.set(-0.3, 2.5, 0);
          leftThigh.name = 'leftThigh';
          group.add(leftThigh);
          boneRefs.leftThigh = leftThigh;
          
          // Right thigh
          const rightThigh = new THREE.Mesh(legGeometry, bodyMaterial);
          rightThigh.position.set(0.3, 2.5, 0);
          rightThigh.name = 'rightThigh';
          group.add(rightThigh);
          boneRefs.rightThigh = rightThigh;
          
          // Left knee
          const leftKnee = new THREE.Mesh(shoulderGeometry, jointMaterial);
          leftKnee.position.set(-0.3, 2, 0);
          leftKnee.name = 'leftKnee';
          group.add(leftKnee);
          boneRefs.leftKnee = leftKnee;
          
          // Right knee
          const rightKnee = new THREE.Mesh(shoulderGeometry, jointMaterial);
          rightKnee.position.set(0.3, 2, 0);
          rightKnee.name = 'rightKnee';
          group.add(rightKnee);
          boneRefs.rightKnee = rightKnee;
          
          // Left shin
          const leftShin = new THREE.Mesh(legGeometry, bodyMaterial);
          leftShin.position.set(-0.3, 1.5, 0);
          leftShin.name = 'leftShin';
          group.add(leftShin);
          boneRefs.leftShin = leftShin;
          
          // Right shin
          const rightShin = new THREE.Mesh(legGeometry, bodyMaterial);
          rightShin.position.set(0.3, 1.5, 0);
          rightShin.name = 'rightShin';
          group.add(rightShin);
          boneRefs.rightShin = rightShin;
          
          // Left ankle
          const leftAnkle = new THREE.Mesh(shoulderGeometry, jointMaterial);
          leftAnkle.position.set(-0.3, 1, 0);
          leftAnkle.name = 'leftAnkle';
          group.add(leftAnkle);
          boneRefs.leftAnkle = leftAnkle;
          
          // Right ankle
          const rightAnkle = new THREE.Mesh(shoulderGeometry, jointMaterial);
          rightAnkle.position.set(0.3, 1, 0);
          rightAnkle.name = 'rightAnkle';
          group.add(rightAnkle);
          boneRefs.rightAnkle = rightAnkle;
          
          // Store original positions
          group.traverse((child) => {
            if (child.isMesh) {
              originalBoneData[child.name] = {
                position: child.position.clone(),
                rotation: child.rotation.clone()
              };
            }
          });
          
          model = group;
          bones = boneRefs;
          scene.add(model);
          
          console.log('Stick figure model created with bones:', Object.keys(bones));
          updateDebug('Model loaded successfully');
        }

        function handleMessage(event) {
          try {
            const data = JSON.parse(event.data);
            
            console.log('Received message:', data.type);
            updateDebug('Message: ' + data.type);
            
            if (data.type === 'UPDATE_POSE') {
              updateDebug('Applying pose with ' + data.landmarks.length + ' landmarks');
              applyPoseToModel(data.landmarks);
            } else if (data.type === 'RESET_POSE') {
              updateDebug('Resetting pose');
              resetToTPose();
            }
          } catch (error) {
            console.error('Message handling error:', error);
            updateDebug('Error: ' + error.message);
          }
        }

        function applyPoseToModel(landmarks) {
          if (!model || !landmarks || landmarks.length === 0) {
            updateDebug('No model or landmarks available');
            return;
          }

          console.log('Applying pose with landmarks:', landmarks.length);
          updateDebug('Updating pose...');

          const landmarkDict = {};
          landmarks.forEach(lm => {
            landmarkDict[lm.id] = lm;
          });

          // Apply transformations
          applyArmMovements(landmarkDict);
          applyLegMovements(landmarkDict);
          applyTorsoMovement(landmarkDict);
          
          updateDebug('Pose applied');
        }

        function applyArmMovements(landmarks) {
          // Left arm: shoulder(11), elbow(13), wrist(15)
          if (landmarks[11] && landmarks[13] && landmarks[15]) {
            const shoulder = landmarks[11];
            const elbow = landmarks[13];
            const wrist = landmarks[15];
            
            // Position left shoulder
            if (bones.leftShoulder) {
              bones.leftShoulder.position.x = -0.5 + (shoulder.x - 0.5) * 2;
              bones.leftShoulder.position.y = 4.5 + (shoulder.y - 0.5) * 2;
            }
            
            // Position and rotate left upper arm
            if (bones.leftUpperArm) {
              const midX = (shoulder.x + elbow.x) / 2;
              const midY = (shoulder.y + elbow.y) / 2;
              bones.leftUpperArm.position.x = -0.5 + (midX - 0.5) * 2;
              bones.leftUpperArm.position.y = 4.5 + (midY - 0.5) * 2;
              
              const angle = Math.atan2(elbow.x - shoulder.x, elbow.y - shoulder.y);
              bones.leftUpperArm.rotation.z = angle;
            }
            
            // Position left elbow
            if (bones.leftElbow) {
              bones.leftElbow.position.x = -0.5 + (elbow.x - 0.5) * 2;
              bones.leftElbow.position.y = 4.5 + (elbow.y - 0.5) * 2;
            }
            
            // Position and rotate left forearm
            if (bones.leftForearm) {
              const midX = (elbow.x + wrist.x) / 2;
              const midY = (elbow.y + wrist.y) / 2;
              bones.leftForearm.position.x = -0.5 + (midX - 0.5) * 2;
              bones.leftForearm.position.y = 4.5 + (midY - 0.5) * 2;
              
              const angle = Math.atan2(wrist.x - elbow.x, wrist.y - elbow.y);
              bones.leftForearm.rotation.z = angle;
            }
            
            // Position left wrist
            if (bones.leftWrist) {
              bones.leftWrist.position.x = -0.5 + (wrist.x - 0.5) * 2;
              bones.leftWrist.position.y = 4.5 + (wrist.y - 0.5) * 2;
            }
          }

          // Right arm: shoulder(12), elbow(14), wrist(16)
          if (landmarks[12] && landmarks[14] && landmarks[16]) {
            const shoulder = landmarks[12];
            const elbow = landmarks[14];
            const wrist = landmarks[16];
            
            // Position right shoulder
            if (bones.rightShoulder) {
              bones.rightShoulder.position.x = 0.5 + (shoulder.x - 0.5) * 2;
              bones.rightShoulder.position.y = 4.5 + (shoulder.y - 0.5) * 2;
            }
            
            // Position and rotate right upper arm
            if (bones.rightUpperArm) {
              const midX = (shoulder.x + elbow.x) / 2;
              const midY = (shoulder.y + elbow.y) / 2;
              bones.rightUpperArm.position.x = 0.5 + (midX - 0.5) * 2;
              bones.rightUpperArm.position.y = 4.5 + (midY - 0.5) * 2;
              
              const angle = Math.atan2(elbow.x - shoulder.x, elbow.y - shoulder.y);
              bones.rightUpperArm.rotation.z = angle;
            }
            
            // Position right elbow
            if (bones.rightElbow) {
              bones.rightElbow.position.x = 0.5 + (elbow.x - 0.5) * 2;
              bones.rightElbow.position.y = 4.5 + (elbow.y - 0.5) * 2;
            }
            
            // Position and rotate right forearm
            if (bones.rightForearm) {
              const midX = (elbow.x + wrist.x) / 2;
              const midY = (elbow.y + wrist.y) / 2;
              bones.rightForearm.position.x = 0.5 + (midX - 0.5) * 2;
              bones.rightForearm.position.y = 4.5 + (midY - 0.5) * 2;
              
              const angle = Math.atan2(wrist.x - elbow.x, wrist.y - elbow.y);
              bones.rightForearm.rotation.z = angle;
            }
            
            // Position right wrist
            if (bones.rightWrist) {
              bones.rightWrist.position.x = 0.5 + (wrist.x - 0.5) * 2;
              bones.rightWrist.position.y = 4.5 + (wrist.y - 0.5) * 2;
            }
          }
        }

        function applyLegMovements(landmarks) {
          // Left leg: hip(23), knee(25), ankle(27)
          if (landmarks[23] && landmarks[25] && landmarks[27]) {
            const hip = landmarks[23];
            const knee = landmarks[25];
            const ankle = landmarks[27];
            
            // Position left hip
            if (bones.leftHip) {
              bones.leftHip.position.x = -0.3 + (hip.x - 0.5) * 1;
              bones.leftHip.position.y = 3.2 + (hip.y - 0.7) * 2;
            }
            
            // Position and rotate left thigh
            if (bones.leftThigh) {
              const midX = (hip.x + knee.x) / 2;
              const midY = (hip.y + knee.y) / 2;
              bones.leftThigh.position.x = -0.3 + (midX - 0.5) * 1;
              bones.leftThigh.position.y = 3.2 + (midY - 0.7) * 2;
              
              const angle = Math.atan2(knee.x - hip.x, knee.y - hip.y);
              bones.leftThigh.rotation.z = angle;
            }
            
            // Position left knee
            if (bones.leftKnee) {
              bones.leftKnee.position.x = -0.3 + (knee.x - 0.5) * 1;
              bones.leftKnee.position.y = 3.2 + (knee.y - 0.7) * 2;
            }
            
            // Position and rotate left shin
            if (bones.leftShin) {
              const midX = (knee.x + ankle.x) / 2;
              const midY = (knee.y + ankle.y) / 2;
              bones.leftShin.position.x = -0.3 + (midX - 0.5) * 1;
              bones.leftShin.position.y = 3.2 + (midY - 0.7) * 2;
              
              const angle = Math.atan2(ankle.x - knee.x, ankle.y - knee.y);
              bones.leftShin.rotation.z = angle;
            }
            
            // Position left ankle
            if (bones.leftAnkle) {
              bones.leftAnkle.position.x = -0.3 + (ankle.x - 0.5) * 1;
              bones.leftAnkle.position.y = 3.2 + (ankle.y - 0.7) * 2;
            }
          }

          // Right leg: hip(24), knee(26), ankle(28)
          if (landmarks[24] && landmarks[26] && landmarks[28]) {
            const hip = landmarks[24];
            const knee = landmarks[26];
            const ankle = landmarks[28];
            
            // Position right hip
            if (bones.rightHip) {
              bones.rightHip.position.x = 0.3 + (hip.x - 0.5) * 1;
              bones.rightHip.position.y = 3.2 + (hip.y - 0.7) * 2;
            }
            
            // Position and rotate right thigh
            if (bones.rightThigh) {
              const midX = (hip.x + knee.x) / 2;
              const midY = (hip.y + knee.y) / 2;
              bones.rightThigh.position.x = 0.3 + (midX - 0.5) * 1;
              bones.rightThigh.position.y = 3.2 + (midY - 0.7) * 2;
              
              const angle = Math.atan2(knee.x - hip.x, knee.y - hip.y);
              bones.rightThigh.rotation.z = angle;
            }
            
            // Position right knee
            if (bones.rightKnee) {
              bones.rightKnee.position.x = 0.3 + (knee.x - 0.5) * 1;
              bones.rightKnee.position.y = 3.2 + (knee.y - 0.7) * 2;
            }
            
            // Position and rotate right shin
            if (bones.rightShin) {
              const midX = (knee.x + ankle.x) / 2;
              const midY = (knee.y + ankle.y) / 2;
              bones.rightShin.position.x = 0.3 + (midX - 0.5) * 1;
              bones.rightShin.position.y = 3.2 + (midY - 0.7) * 2;
              
              const angle = Math.atan2(ankle.x - knee.x, ankle.y - knee.y);
              bones.rightShin.rotation.z = angle;
            }
            
            // Position right ankle
            if (bones.rightAnkle) {
              bones.rightAnkle.position.x = 0.3 + (ankle.x - 0.5) * 1;
              bones.rightAnkle.position.y = 3.2 + (ankle.y - 0.7) * 2;
            }
          }
        }

        function applyTorsoMovement(landmarks) {
          // Update torso based on shoulder and hip positions
          if (landmarks[11] && landmarks[12] && landmarks[23] && landmarks[24]) {
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            const leftHip = landmarks[23];
            const rightHip = landmarks[24];
            
            // Calculate center points
            const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
            const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
            const hipCenterX = (leftHip.x + rightHip.x) / 2;
            const hipCenterY = (leftHip.y + rightHip.y) / 2;
            
            // Update torso position and rotation
            if (bones.torso) {
              const torsoX = (shoulderCenterX + hipCenterX) / 2;
              const torsoY = (shoulderCenterY + hipCenterY) / 2;
              
              bones.torso.position.x = (torsoX - 0.5) * 2;
              bones.torso.position.y = 4 + (torsoY - 0.6) * 2;
              
              // Rotate torso based on shoulder-hip alignment
              const angle = Math.atan2(shoulderCenterX - hipCenterX, shoulderCenterY - hipCenterY);
              bones.torso.rotation.z = angle * 0.3; // Dampen the rotation
            }
          }
          
          // Update head position based on nose landmark
          if (landmarks[0] && bones.head) {
            const nose = landmarks[0];
            bones.head.position.x = (nose.x - 0.5) * 2;
            bones.head.position.y = 5 + (nose.y - 0.3) * 2;
          }
        }

        function resetToTPose() {
          if (!model || !originalBoneData) {
            updateDebug('Cannot reset - no original data');
            return;
          }
          
          console.log('Resetting to T-pose');
          updateDebug('Resetting to T-pose');
          
          // Reset all bones to original positions
          Object.keys(originalBoneData).forEach(boneName => {
            if (bones[boneName] && originalBoneData[boneName]) {
              bones[boneName].position.copy(originalBoneData[boneName].position);
              bones[boneName].rotation.copy(originalBoneData[boneName].rotation);
            }
          });
          
          updateDebug('Reset complete');
        }

        function calculateAngle(p1, p2, p3) {
          const a = { x: p1.x - p2.x, y: p1.y - p2.y };
          const b = { x: p3.x - p2.x, y: p3.y - p2.y };
          
          const dot = a.x * b.x + a.y * b.y;
          const magA = Math.sqrt(a.x * a.x + a.y * a.y);
          const magB = Math.sqrt(b.x * b.x + b.y * b.y);
          
          if (magA === 0 || magB === 0) return 0;
          
          const cosAngle = dot / (magA * magB);
          return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        }

        function updateDebug(message) {
          const debugElement = document.getElementById('debug');
          if (debugElement) {
            debugElement.innerHTML = message + '<br>' + debugElement.innerHTML.split('<br>').slice(0, 5).join('<br>');
          }
          console.log(message);
        }

        function animate() {
          requestAnimationFrame(animate);
          
          if (controls) {
            controls.update();
          }
          
          if (renderer && scene && camera) {
            renderer.render(scene, camera);
          }
        }

        window.addEventListener('resize', function() {
          if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
          }
        });

        // Send ready message
        setTimeout(() => {
          updateDebug('3D model ready');
        }, 1000);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🤖 Pose Estimation & 3D Matching</Text>
          <Text style={styles.subtitle}>Select an image to analyze pose and match with 3D model</Text>
        </View>

        {/* Image Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Image Selection</Text>
          
          <TouchableOpacity 
            style={styles.selectButton} 
            onPress={showImagePickerModal}
          >
            <Text style={styles.buttonText}>Select Image</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.selectButton, { backgroundColor: '#ff9800' }]} 
            onPress={testBackendConnection}
          >
            <Text style={styles.buttonText}>Test Connection</Text>
          </TouchableOpacity>

          {selectedImage && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
              <TouchableOpacity 
                style={[styles.analyzeButton, isLoading && styles.disabledButton]} 
                onPress={uploadImageToPoseAPI}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Analyze Pose</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pose Results Section */}
        {poseData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Pose Analysis Results</Text>
            
            {annotatedImage && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>
                  Detected {poseData.landmark_count} pose landmarks
                </Text>
                <Image 
                  source={{ uri: annotatedImage }} 
                  style={styles.annotatedImage} 
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        )}

        {/* 3D Model Section */}
        <View style={styles.section}>
          <View style={styles.modelHeader}>
            <Text style={styles.sectionTitle}>🎭 3D Model Matching</Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetPose}>
              <Text style={styles.resetButtonText}>Reset Pose</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modelContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: html3DModel }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              onMessage={(event) => {
                console.log('WebView message:', event.nativeEvent.data);
              }}
            />
          </View>
        </View>

      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Image Source</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => selectImageSource('camera')}
            >
              <Text style={styles.modalButtonText}>📷 Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => selectImageSource('gallery')}
            >
              <Text style={styles.modalButtonText}>🖼️ Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  selectButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
  },
  analyzeButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: width - 40,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  annotatedImage: {
    width: width - 40,
    height: 250,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modelContainer: {
    height: 400,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    padding: 30,
    borderRadius: 20,
    width: width * 0.8,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default PoseEstimationApp;