import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

// Your FastAPI server URL - update this to your actual server URL
const API_URL = 'https://517d-196-75-131-42.ngrok-free.app'; // Replace with your server IP

export default function Pose3D() {
  const [loading, setLoading] = useState(false);
  const [pose3DData, setPose3DData] = useState(null);
  const [showGallery, setShowGallery] = useState(true);

  const pickImage = async () => {
    // Request permission to access media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        await sendImageToServer(result.assets[0].base64);
      } catch (error) {
        Alert.alert('Error', 'Failed to process image');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const sendImageToServer = async (base64Image) => {
    try {
      const response = await fetch(`${API_URL}/pose3d`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const data = await response.json();
      setPose3DData(data.landmarks);
      setShowGallery(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to process image on server');
      console.error(error);
    }
  };

  const generate3DVisualizationHTML = () => {
    if (!pose3DData) return '';

    // Convert landmarks to Three.js format
    const landmarks = pose3DData.map(point => ({
      x: point.x * 10, // Scale for better visualization
      y: -point.y * 10, // Flip Y axis
      z: point.z * 10,
    }));

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>3D Pose Visualization</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                margin: 0; 
                overflow: hidden; 
                background: #f5f5f5;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }
            canvas { display: block; }
            #controls {
                position: absolute;
                top: 20px;
                left: 20px;
                z-index: 100;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(0, 0, 0, 0.05);
            }
            #controls h3 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
            button {
                margin: 0 8px 8px 0;
                padding: 8px 16px;
                background: #007AFF;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            button:hover {
                background: #0056CC;
                transform: translateY(-1px);
            }
            button:active {
                transform: translateY(0);
            }
            .secondary-btn {
                background: #8E8E93 !important;
            }
            .secondary-btn:hover {
                background: #6D6D70 !important;
            }
            #info {
                position: absolute;
                bottom: 20px;
                left: 20px;
                color: #666;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 8px;
                padding: 12px;
                font-size: 13px;
                max-width: 280px;
                border: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            @media (max-width: 768px) {
                #controls {
                    top: 10px;
                    left: 10px;
                    right: 10px;
                    padding: 12px;
                }
                button {
                    padding: 6px 12px;
                    font-size: 13px;
                    margin: 0 4px 6px 0;
                }
                #info {
                    bottom: 10px;
                    left: 10px;
                    right: 10px;
                    max-width: none;
                    font-size: 12px;
                }
            }
        </style>
    </head>
    <body>
        <div id="controls">
            <h3>Controls</h3>
            <button onclick="resetView()">Reset View</button>
            <button onclick="toggleAutoRotate()" class="secondary-btn">Auto Rotate</button>
        </div>
        
        <div id="info">
            <strong>Navigation:</strong><br>
            • Drag to rotate view<br>
            • Scroll/pinch to zoom<br>
            • Touch controls enabled
        </div>
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script>
            let scene, camera, renderer, poseGroup, world;
            let landmarks = ${JSON.stringify(landmarks)};
            let autoRotate = false;

            // MediaPipe pose connections
            const connections = [
                // Face connections
                [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
                // Torso connections
                [11, 12], [11, 23], [12, 24], [23, 24],
                // Left arm
                [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
                // Right arm
                [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
                // Left leg
                [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
                // Right leg
                [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
            ];

            init();
            animate();

            function init() {
                // Scene with simple background
                scene = new THREE.Scene();
                scene.background = new THREE.Color(0xf0f0f0);

                // Camera
                camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                camera.position.set(0, 0, 30);

                // Renderer
                renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                document.body.appendChild(renderer.domElement);

                // Create world group (this will rotate instead of the pose)
                world = new THREE.Group();
                scene.add(world);

                // Simple lighting
                const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
                world.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(10, 10, 5);
                world.add(directionalLight);

                // Simple ground plane
                const groundGeometry = new THREE.PlaneGeometry(50, 50);
                const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
                const ground = new THREE.Mesh(groundGeometry, groundMaterial);
                ground.rotation.x = -Math.PI / 2;
                ground.position.y = -10;
                world.add(ground);

                // Create pose group
                poseGroup = new THREE.Group();
                world.add(poseGroup);

                // Create pose visualization
                createPoseVisualization();

                // Setup controls
                setupControls();

                // Handle window resize
                window.addEventListener('resize', onWindowResize);
            }

            function createPoseVisualization() {
                // Simple landmarks with basic colors
                landmarks.forEach((landmark, index) => {
                    const geometry = new THREE.SphereGeometry(0.2, 12, 8);
                    const color = getColorForLandmark(index);
                    const material = new THREE.MeshLambertMaterial({ color: color });
                    
                    const sphere = new THREE.Mesh(geometry, material);
                    sphere.position.set(landmark.x, landmark.y, landmark.z);
                    poseGroup.add(sphere);
                });

                // Simple connections
                connections.forEach(connection => {
                    const [start, end] = connection;
                    if (landmarks[start] && landmarks[end]) {
                        const startPos = new THREE.Vector3(
                            landmarks[start].x, 
                            landmarks[start].y, 
                            landmarks[start].z
                        );
                        const endPos = new THREE.Vector3(
                            landmarks[end].x, 
                            landmarks[end].y, 
                            landmarks[end].z
                        );

                        // Create line geometry
                        const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
                        const material = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 2 });
                        const line = new THREE.Line(geometry, material);
                        poseGroup.add(line);
                    }
                });

                // Center the pose
                const box = new THREE.Box3().setFromObject(poseGroup);
                const center = box.getCenter(new THREE.Vector3());
                poseGroup.position.sub(center);
            }

            function getColorForLandmark(index) {
                // Simple color scheme
                if (index <= 10) return 0xff6b6b; // Face - red
                if (index === 11 || index === 12) return 0x4ecdc4; // Shoulders - teal
                if ([13, 15, 17, 19, 21].includes(index)) return 0x45b7d1; // Left arm - blue
                if ([14, 16, 18, 20, 22].includes(index)) return 0x96ceb4; // Right arm - green
                if (index === 23 || index === 24) return 0xfeca57; // Torso - yellow
                if ([25, 27, 29, 31].includes(index)) return 0xff9ff3; // Left leg - pink
                if ([26, 28, 30, 32].includes(index)) return 0x54a0ff; // Right leg - light blue
                return 0x888888; // Default gray
            }

            function setupControls() {
                let mouseX = 0, mouseY = 0;
                let isMouseDown = false;

                // Mouse controls
                document.addEventListener('mousedown', onMouseDown);
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('wheel', onWheel);

                // Touch controls
                document.addEventListener('touchstart', onTouchStart);
                document.addEventListener('touchmove', onTouchMove);
                document.addEventListener('touchend', onTouchEnd);

                function onMouseDown(event) {
                    isMouseDown = true;
                    mouseX = event.clientX;
                    mouseY = event.clientY;
                }

                function onMouseMove(event) {
                    if (!isMouseDown) return;
                    
                    const deltaX = event.clientX - mouseX;
                    const deltaY = event.clientY - mouseY;
                    
                    // Rotate the world instead of the pose
                    world.rotation.y += deltaX * 0.01;
                    world.rotation.x += deltaY * 0.01;
                    
                    mouseX = event.clientX;
                    mouseY = event.clientY;
                }

                function onMouseUp() {
                    isMouseDown = false;
                }

                function onWheel(event) {
                    event.preventDefault();
                    camera.position.z += event.deltaY * 0.02;
                    camera.position.z = Math.max(10, Math.min(60, camera.position.z));
                }

                let touchX = 0, touchY = 0;

                function onTouchStart(event) {
                    if (event.touches.length === 1) {
                        touchX = event.touches[0].clientX;
                        touchY = event.touches[0].clientY;
                    }
                }

                function onTouchMove(event) {
                    event.preventDefault();
                    if (event.touches.length === 1) {
                        const deltaX = event.touches[0].clientX - touchX;
                        const deltaY = event.touches[0].clientY - touchY;
                        
                        // Rotate the world instead of the pose
                        world.rotation.y += deltaX * 0.01;
                        world.rotation.x += deltaY * 0.01;
                        
                        touchX = event.touches[0].clientX;
                        touchY = event.touches[0].clientY;
                    }
                }

                function onTouchEnd(event) {
                    // Handle touch end
                }
            }

            function animate() {
                requestAnimationFrame(animate);
                
                // Auto-rotate the world if enabled
                if (autoRotate) {
                    world.rotation.y += 0.005;
                }
                
                renderer.render(scene, camera);
            }

            // Control functions
            function resetView() {
                camera.position.set(0, 0, 30);
                world.rotation.set(0, 0, 0);
            }

            function toggleAutoRotate() {
                autoRotate = !autoRotate;
            }

            function onWindowResize() {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        </script>
    </body>
    </html>
    `;
  };

  // Show 3D visualization if we have pose data
  if (!showGallery && pose3DData) {
    return (
      <View style={styles.container}>
        <WebView
          source={{ html: generate3DVisualizationHTML() }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlaybook={true}
        />
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            setShowGallery(true);
            setPose3DData(null);
          }}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simplified modern gallery selection screen
  return (
    <View style={styles.container}>
      <View style={styles.welcomeContainer}>
        <View style={styles.iconContainer}>
          <Text style={styles.mainIcon}>🧘‍♀️</Text>
        </View>
        
        <Text style={styles.welcomeTitle}>3D Pose Detection</Text>
        <Text style={styles.welcomeSubtitle}>AI-Powered Human Pose Analysis</Text>
        
        <Text style={styles.welcomeText}>
          Transform any photo into an interactive 3D pose visualization.
        </Text>
        
        <TouchableOpacity
          style={[styles.galleryButton, loading && styles.galleryButtonDisabled]}
          onPress={pickImage}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.loadingButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.galleryButtonText}>Select Photo</Text>
          )}
        </TouchableOpacity>
        
        {loading && (
          <Text style={styles.loadingText}>Analyzing your image...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainIcon: {
    fontSize: 40,
    textAlign: 'center',
  },
  welcomeTitle: {
    color: '#333',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    maxWidth: 300,
  },
  galleryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  galleryButtonDisabled: {
    backgroundColor: '#B0B0B0',
    shadowOpacity: 0.1,
  },
  loadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  galleryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  webview: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});