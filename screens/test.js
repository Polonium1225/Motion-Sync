import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const App = () => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>3D FBX Model</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js"></script>
      <style>
        body { margin: 0; overflow: hidden; }
        canvas { display: block; }
        #loading { 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%);
          color: white;
          font-family: Arial, sans-serif;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div id="loading">Loading model...</div>
      <script>
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x333333);

        // Set up camera
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 10);

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        // Add orbit controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 2, 0);
        controls.update();

        // Add lights
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 200, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(0, 200, 100);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 180;
        dirLight.shadow.camera.bottom = -100;
        dirLight.shadow.camera.left = -120;
        dirLight.shadow.camera.right = 120;
        scene.add(dirLight);

        // Add ground plane
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2000, 2000),
          new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Create grid helper
        const grid = new THREE.GridHelper(200, 20, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        scene.add(grid);

        // Create the FBXLoader
        const loader = new THREE.FBXLoader();

        // Load an FBX model - using a valid URL to an FBX file
        loader.load(
          'https://threejs.org/examples/models/fbx/Samba%20Dancing.fbx',
          function (object) {
            document.getElementById('loading').style.display = 'none';
            
            // Scale the model down if needed
            object.scale.set(0.05, 0.05, 0.05);
            
            // Position the model
            object.position.set(0, 0, 0);
            
            // Add the model to the scene
            scene.add(object);
            
            // Check if there's animation
            if (object.animations && object.animations.length > 0) {
              // Set up animation
              const mixer = new THREE.AnimationMixer(object);
              const action = mixer.clipAction(object.animations[0]);
              action.play();
              
              // Update the mixer in the animation loop
              const clock = new THREE.Clock();
              
              function animate() {
                requestAnimationFrame(animate);
                
                const delta = clock.getDelta();
                mixer.update(delta);
                
                controls.update();
                renderer.render(scene, camera);
              }
              
              animate();
            } else {
              // Simple animation loop without mixer
              function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
              }
              
              animate();
            }
            
            console.log('Model loaded successfully!');
          },
          function (xhr) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading').innerText = 'Loading model: ' + percent + '%';
            console.log(percent + '% loaded');
          },
          function (error) {
            document.getElementById('loading').innerText = 'Error loading model';
            console.error('Error loading the model:', error);
          }
        );

        // Adjust canvas size on window resize
        window.addEventListener('resize', function () {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});

export default App;