from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
from typing import Optional

# Router for high-performance pose tracking
pose_tracking_router = APIRouter()

@pose_tracking_router.get("/pose_tracker/tracking")
async def tracking_page(
    request: Request,
    token: str = None,
    width: Optional[float] = None,
    height: Optional[float] = None,
    skeleton: bool = True
):
    """High-performance pose tracking with client-side processing"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>High-Performance Pose Estimation</title>
        <style>
            body, html {{
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background-color: transparent;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }}
            .container {{
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
                aspect-ratio: 6/19;
                max-width: 100vw;
                max-height: 100vh;
                margin: 0 auto;
            }}
            #videoElement {{
                width: 100%;
                height: 100%;
                object-fit: contain;
                transform: scaleX(-1);
            }}
            #canvasOverlay {{
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                transform: scaleX(-1);
                pointer-events: none;
                background: transparent;
            }}
            .controls {{
                position: absolute;
                top: 10px;
                left: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 100;
            }}
            .control-row {{
                display: flex;
                gap: 8px;
                align-items: center;
            }}
            button {{
                background-color: rgba(0,0,0,0.7);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s;
                font-weight: 500;
            }}
            button:hover {{
                background-color: rgba(0,0,0,0.9);
                transform: translateY(-1px);
            }}
            button:disabled {{
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }}
            .performance-panel {{
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: rgba(0,0,0,0.7);
                color: white;
                padding: 8px;
                border-radius: 5px;
                font-size: 11px;
                font-family: monospace;
                z-index: 100;
                min-width: 120px;
            }}
            .status-bar {{
                position: absolute;
                bottom: 10px;
                left: 10px;
                right: 10px;
                background-color: rgba(0,0,0,0.5);
                color: white;
                padding: 8px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 100;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .quality-indicator {{
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .quality-dot {{
                width: 8px;
                height: 8px;
                border-radius: 50%;
                transition: all 0.3s;
            }}
            .quality-excellent {{ background-color: #4ade80; }}
            .quality-good {{ background-color: #fbbf24; }}
            .quality-fair {{ background-color: #f97316; }}
            .quality-poor {{ background-color: #ef4444; }}
            .loading {{
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                background-color: rgba(0,0,0,0.7);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                z-index: 200;
            }}
            .loading-spinner {{
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <video id="videoElement" autoplay playsinline muted></video>
            <canvas id="canvasOverlay"></canvas>
            
            <div class="loading" id="loadingIndicator">
                <div class="loading-spinner"></div>
                <div>Loading MediaPipe...</div>
            </div>
            
            <div class="controls">
                <div class="control-row">
                    <button id="flipCameraBtn">📷 Flip</button>
                    <button id="toggleSkeletonBtn">🦴 Skeleton ✓</button>
                    <button id="qualityBtn">⚡ Auto</button>
                </div>
                <div class="control-row">
                    <button id="gpuBtn">🖥️ GPU</button>
                    <button id="smoothBtn">✨ Smooth ✓</button>
                    <button id="roiBtn">🎯 ROI</button>
                </div>
            </div>
            
            <div class="performance-panel" id="performancePanel">
                <div>FPS: <span id="fpsDisplay">--</span></div>
                <div>Process: <span id="processTimeDisplay">--</span>ms</div>
                <div>Quality: <span id="qualityDisplay">--</span></div>
                <div>Mode: <span id="modeDisplay">Loading...</span></div>
            </div>
            
            <div class="status-bar">
                <div id="statusText">Initializing...</div>
                <div class="quality-indicator">
                    <div class="quality-dot" id="qualityDot"></div>
                    <span id="confidenceText">--</span>
                </div>
            </div>
        </div>

        <!-- MediaPipe CDN -->
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
        
        <script>
            // High-Performance Pose Tracking System
            class HighPerformancePoseTracker {{
                constructor() {{
                    this.showSkeleton = {str(skeleton).lower()};
                    this.initializeElements();
                    this.initializeSettings();
                    this.initializePerformanceMonitoring();
                    this.initializeWorkers();
                    this.setupEventListeners();
                }}
                
                initializeElements() {{
                    this.video = document.getElementById('videoElement');
                    this.canvas = document.getElementById('canvasOverlay');
                    this.ctx = this.canvas.getContext('2d');
                    this.container = this.canvas.parentElement;
                    
                    // Control elements
                    this.flipCameraBtn = document.getElementById('flipCameraBtn');
                    this.toggleSkeletonBtn = document.getElementById('toggleSkeletonBtn');
                    this.qualityBtn = document.getElementById('qualityBtn');
                    this.gpuBtn = document.getElementById('gpuBtn');
                    this.smoothBtn = document.getElementById('smoothBtn');
                    this.roiBtn = document.getElementById('roiBtn');
                    
                    // Display elements
                    this.loadingIndicator = document.getElementById('loadingIndicator');
                    this.fpsDisplay = document.getElementById('fpsDisplay');
                    this.processTimeDisplay = document.getElementById('processTimeDisplay');
                    this.qualityDisplay = document.getElementById('qualityDisplay');
                    this.modeDisplay = document.getElementById('modeDisplay');
                    this.statusText = document.getElementById('statusText');
                    this.qualityDot = document.getElementById('qualityDot');
                    this.confidenceText = document.getElementById('confidenceText');
                }}
                
                initializeSettings() {{
                    this.currentFacingMode = 'user';
                    this.currentStream = null;
                    this.poseDetector = null;
                    this.isProcessing = false;
                    this.lastLandmarks = null;
                    
                    // Performance settings
                    this.settings = {{
                        qualityMode: 'auto', // auto, high, medium, low
                        useGPU: true,
                        useSmoothing: true,
                        useROI: false,
                        targetFPS: 30,
                        skipFrames: 0,
                        adaptiveQuality: true
                    }};
                    
                    // Initialize button states
                    this.smoothBtn.textContent = '✨ Smooth ✓';
                    this.toggleSkeletonBtn.textContent = '🦴 Skeleton ✓';
                    
                    // Processing modes based on device capability
                    this.modes = {{
                        'high': {{ resolution: {{ width: 640, height: 480 }}, skipFrames: 0, modelComplexity: 2 }},
                        'medium': {{ resolution: {{ width: 480, height: 360 }}, skipFrames: 1, modelComplexity: 1 }},
                        'low': {{ resolution: {{ width: 320, height: 240 }}, skipFrames: 2, modelComplexity: 0 }}
                    }};
                    
                    this.currentMode = 'medium';
                    
                    // Landmark smoothing
                    this.landmarkHistory = [];
                    this.maxHistory = 5;
                    
                    // ROI tracking
                    this.roi = null;
                    this.expandROI = 1.2;
                    
                    console.log('Settings initialized - Skeleton enabled by default:', this.showSkeleton);
                }}
                
                initializePerformanceMonitoring() {{
                    this.performance = {{
                        frameCount: 0,
                        lastFPSTime: performance.now(),
                        currentFPS: 0,
                        lastProcessTime: 0,
                        averageProcessTime: 0,
                        processTimes: [],
                        lastFrameTime: 0,
                        frameSkipCounter: 0
                    }};
                }}
                
                async initializeWorkers() {{
                    // Initialize Web Worker for background processing
                    try {{
                        this.worker = new Worker(URL.createObjectURL(new Blob([`
                            // Web Worker for background pose processing
                            let landmarkHistory = [];
                            const maxHistory = 5;
                            
                            function smoothLandmarks(landmarks) {{
                                landmarkHistory.push(landmarks);
                                if (landmarkHistory.length > maxHistory) {{
                                    landmarkHistory.shift();
                                }}
                                
                                if (landmarkHistory.length < 2) return landmarks;
                                
                                const smoothed = [];
                                const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
                                const activeWeights = weights.slice(-landmarkHistory.length);
                                const weightSum = activeWeights.reduce((a, b) => a + b, 0);
                                
                                for (let i = 0; i < landmarks.length; i++) {{
                                    let x = 0, y = 0, z = 0, visibility = 0;
                                    
                                    for (let j = 0; j < landmarkHistory.length; j++) {{
                                        const weight = activeWeights[j] / weightSum;
                                        const landmark = landmarkHistory[j][i];
                                        x += landmark.x * weight;
                                        y += landmark.y * weight;
                                        z += landmark.z * weight;
                                        visibility += landmark.visibility * weight;
                                    }}
                                    
                                    smoothed.push({{ x, y, z, visibility }});
                                }}
                                
                                return smoothed;
                            }}
                            
                            function calculateROI(landmarks) {{
                                const visibleLandmarks = landmarks.filter(l => l.visibility > 0.5);
                                if (visibleLandmarks.length < 4) return null;
                                
                                const xs = visibleLandmarks.map(l => l.x);
                                const ys = visibleLandmarks.map(l => l.y);
                                
                                return {{
                                    x: Math.min(...xs),
                                    y: Math.min(...ys),
                                    width: Math.max(...xs) - Math.min(...xs),
                                    height: Math.max(...ys) - Math.min(...ys)
                                }};
                            }}
                            
                            self.onmessage = function(e) {{
                                const {{ type, data }} = e.data;
                                
                                if (type === 'smoothLandmarks') {{
                                    const smoothed = smoothLandmarks(data);
                                    self.postMessage({{ type: 'smoothed', data: smoothed }});
                                }} else if (type === 'calculateROI') {{
                                    const roi = calculateROI(data);
                                    self.postMessage({{ type: 'roi', data: roi }});
                                }}
                            }};
                        `], {{ type: 'application/javascript' }})));
                        
                        this.worker.onmessage = (e) => this.handleWorkerMessage(e);
                    }} catch (error) {{
                        console.warn('Web Worker not supported, using main thread');
                        this.worker = null;
                    }}
                }}
                
                handleWorkerMessage(e) {{
                    const {{ type, data }} = e.data;
                    
                    if (type === 'smoothed') {{
                        this.lastSmoothedLandmarks = data;
                    }} else if (type === 'roi') {{
                        this.roi = data;
                    }}
                }}
                
                setupEventListeners() {{
                    this.flipCameraBtn.addEventListener('click', () => this.flipCamera());
                    this.toggleSkeletonBtn.addEventListener('click', () => this.toggleSkeleton());
                    this.qualityBtn.addEventListener('click', () => this.cycleQuality());
                    this.gpuBtn.addEventListener('click', () => this.toggleGPU());
                    this.smoothBtn.addEventListener('click', () => this.toggleSmoothing());
                    this.roiBtn.addEventListener('click', () => this.toggleROI());
                    
                    window.addEventListener('resize', () => {{
                        this.updateCanvasSize();
                        // Recalculate video content rect after resize
                        setTimeout(() => this.calculateVideoContentRect(), 100);
                    }});
                    window.addEventListener('beforeunload', () => this.cleanup());
                }}
                
                async initialize() {{
                    try {{
                        this.updateStatus('Loading MediaPipe models...');
                        await this.initializeMediaPipe();
                        
                        this.updateStatus('Requesting camera access...');
                        await this.startCamera();
                        
                        this.updateStatus('Optimizing performance...');
                        await this.optimizePerformance();
                        
                        this.hideLoading();
                        this.updateStatus('High-performance pose tracking active');
                        this.startProcessing();
                    }} catch (error) {{
                        console.error('Initialization error:', error);
                        this.updateStatus(`Error: ${{error.message}}`);
                        this.hideLoading();
                    }}
                }}
                
                async initializeMediaPipe() {{
                    try {{
                        // Check if MediaPipe is available
                        if (typeof Pose === 'undefined') {{
                            console.warn('MediaPipe not available, using fallback');
                            await this.initializeTensorFlowPose();
                            return;
                        }}
                        
                        // Initialize MediaPipe Pose
                        this.pose = new Pose({{
                            locateFile: (file) => {{
                                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${{file}}`;
                            }}
                        }});
                        
                        this.pose.setOptions({{
                            modelComplexity: this.modes[this.currentMode].modelComplexity,
                            smoothLandmarks: true,
                            enableSegmentation: false,
                            smoothSegmentation: false,
                            minDetectionConfidence: 0.5,
                            minTrackingConfidence: 0.5
                        }});
                        
                        this.pose.onResults((results) => this.onPoseResults(results));
                        
                        // Set up pose connections for drawing
                        this.connections = POSE_CONNECTIONS || this.getDefaultConnections();
                        this.modeDisplay.textContent = 'MediaPipe';
                        
                        console.log('MediaPipe initialized successfully');
                        
                    }} catch (error) {{
                        console.error('MediaPipe initialization failed:', error);
                        await this.initializeFallback();
                    }}
                }}
                
                async initializeFallback() {{
                    // Simple fallback pose detection without external libraries
                    this.modeDisplay.textContent = 'Fallback Mode';
                    this.connections = this.getDefaultConnections();
                    
                    // Create a simple pose detector for testing
                    this.pose = {{
                        send: async (input) => {{
                            // Generate mock pose data for testing skeleton display
                            setTimeout(() => {{
                                this.onPoseResults({{
                                    poseLandmarks: this.generateMockPose()
                                }});
                            }}, 16); // ~60 FPS
                        }}
                    }};
                    
                    console.log('Using fallback pose detection');
                }}
                
                generateMockPose() {{
                    // Generate 33 mock landmarks for testing
                    const landmarks = [];
                    const centerX = 0.5;
                    const centerY = 0.5;
                    
                    // Create a basic human pose shape
                    const poseTemplate = [
                        // Face (0-10)
                        {{x: centerX, y: centerY - 0.25, z: 0}}, // nose
                        {{x: centerX - 0.02, y: centerY - 0.27, z: 0}}, // left eye inner
                        {{x: centerX - 0.04, y: centerY - 0.27, z: 0}}, // left eye
                        {{x: centerX - 0.06, y: centerY - 0.27, z: 0}}, // left eye outer
                        {{x: centerX + 0.02, y: centerY - 0.27, z: 0}}, // right eye inner
                        {{x: centerX + 0.04, y: centerY - 0.27, z: 0}}, // right eye
                        {{x: centerX + 0.06, y: centerY - 0.27, z: 0}}, // right eye outer
                        {{x: centerX - 0.03, y: centerY - 0.22, z: 0}}, // left ear
                        {{x: centerX + 0.03, y: centerY - 0.22, z: 0}}, // right ear
                        {{x: centerX - 0.02, y: centerY - 0.2, z: 0}}, // mouth left
                        {{x: centerX + 0.02, y: centerY - 0.2, z: 0}}, // mouth right
                        
                        // Shoulders and arms (11-22)
                        {{x: centerX - 0.1, y: centerY - 0.1, z: 0}}, // left shoulder
                        {{x: centerX + 0.1, y: centerY - 0.1, z: 0}}, // right shoulder
                        {{x: centerX - 0.15, y: centerY + 0.05, z: 0}}, // left elbow
                        {{x: centerX + 0.15, y: centerY + 0.05, z: 0}}, // right elbow
                        {{x: centerX - 0.18, y: centerY + 0.15, z: 0}}, // left wrist
                        {{x: centerX + 0.18, y: centerY + 0.15, z: 0}}, // right wrist
                        {{x: centerX - 0.19, y: centerY + 0.17, z: 0}}, // left pinky
                        {{x: centerX + 0.19, y: centerY + 0.17, z: 0}}, // right pinky
                        {{x: centerX - 0.185, y: centerY + 0.19, z: 0}}, // left index
                        {{x: centerX + 0.185, y: centerY + 0.19, z: 0}}, // right index
                        {{x: centerX - 0.18, y: centerY + 0.16, z: 0}}, // left thumb
                        {{x: centerX + 0.18, y: centerY + 0.16, z: 0}}, // right thumb
                        
                        // Hips and legs (23-32)
                        {{x: centerX - 0.08, y: centerY + 0.2, z: 0}}, // left hip
                        {{x: centerX + 0.08, y: centerY + 0.2, z: 0}}, // right hip
                        {{x: centerX - 0.08, y: centerY + 0.35, z: 0}}, // left knee
                        {{x: centerX + 0.08, y: centerY + 0.35, z: 0}}, // right knee
                        {{x: centerX - 0.08, y: centerY + 0.5, z: 0}}, // left ankle
                        {{x: centerX + 0.08, y: centerY + 0.5, z: 0}}, // right ankle
                        {{x: centerX - 0.1, y: centerY + 0.52, z: 0}}, // left heel
                        {{x: centerX + 0.1, y: centerY + 0.52, z: 0}}, // right heel
                        {{x: centerX - 0.06, y: centerY + 0.52, z: 0}}, // left foot index
                        {{x: centerX + 0.06, y: centerY + 0.52, z: 0}}  // right foot index
                    ];
                    
                    // Add some animation
                    const time = Date.now() * 0.001;
                    return poseTemplate.map((landmark, i) => ({{
                        x: landmark.x + Math.sin(time + i * 0.1) * 0.01,
                        y: landmark.y + Math.cos(time + i * 0.15) * 0.005,
                        z: landmark.z,
                        visibility: 0.9
                    }}));
                }}
                
                async initializeTensorFlowPose() {{
                    // Placeholder for TensorFlow.js implementation
                    console.log('TensorFlow.js pose detection not implemented yet');
                    await this.initializeFallback();
                }}
                
                getDefaultConnections() {{
                    return [
                        [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
                        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
                        [15, 17], [15, 19], [15, 21], [17, 19],
                        [16, 18], [16, 20], [16, 22], [18, 20],
                        [11, 23], [12, 24], [23, 24],
                        [23, 25], [24, 26], [25, 27], [26, 28],
                        [27, 29], [27, 31], [28, 30], [28, 32],
                        [29, 31], [30, 32]
                    ];
                }}
                
                async optimizePerformance() {{
                    // Detect device capabilities
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    
                    if (gl) {{
                        this.settings.useGPU = true;
                        this.gpuBtn.textContent = '🖥️ GPU ✓';
                    }} else {{
                        this.settings.useGPU = false;
                        this.gpuBtn.textContent = '🖥️ CPU';
                        this.gpuBtn.disabled = true;
                    }}
                    
                    // Auto-detect optimal settings
                    if (this.settings.qualityMode === 'auto') {{
                        const deviceMemory = navigator.deviceMemory || 4;
                        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
                        
                        if (deviceMemory >= 8 && hardwareConcurrency >= 8) {{
                            this.currentMode = 'high';
                        }} else if (deviceMemory >= 4 && hardwareConcurrency >= 4) {{
                            this.currentMode = 'medium';
                        }} else {{
                            this.currentMode = 'low';
                        }}
                    }}
                    
                    this.updateModeDisplay();
                }}
                
                async startCamera() {{
                    const mode = this.modes[this.currentMode];
                    
                    const constraints = {{
                        video: {{
                            facingMode: this.currentFacingMode,
                            width: {{ ideal: mode.resolution.width }},
                            height: {{ ideal: mode.resolution.height }},
                            frameRate: {{ ideal: this.settings.targetFPS }}
                        }},
                        audio: false
                    }};
                    
                    if (this.currentStream) {{
                        this.currentStream.getTracks().forEach(track => track.stop());
                    }}
                    
                    this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                    this.video.srcObject = this.currentStream;
                    
                    return new Promise(resolve => {{
                        this.video.onloadedmetadata = () => {{
                            console.log('Video metadata loaded:', this.video.videoWidth, 'x', this.video.videoHeight);
                            this.updateCanvasSize();
                            
                            // Wait a bit more for the video to be fully ready
                            this.video.onloadeddata = () => {{
                                console.log('Video data loaded, calculating content rect');
                                this.calculateVideoContentRect();
                                resolve();
                            }};
                        }};
                    }});
                }}
                
                updateCanvasSize() {{
                    const rect = this.container.getBoundingClientRect();
                    this.canvas.width = rect.width;
                    this.canvas.height = rect.height;
                    
                    // Calculate video content area for coordinate transformation
                    this.calculateVideoContentRect();
                    
                    console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
                }}
                
                calculateVideoContentRect() {{
                    if (!this.video.videoWidth || !this.video.videoHeight) {{
                        // Default values if video not ready
                        this.videoContentRect = {{
                            x: 0,
                            y: 0,
                            width: this.canvas.width,
                            height: this.canvas.height
                        }};
                        return;
                    }}
                    
                    const containerRect = this.container.getBoundingClientRect();
                    const videoAspectRatio = this.video.videoWidth / this.video.videoHeight;
                    const containerAspectRatio = containerRect.width / containerRect.height;
                    
                    let contentWidth, contentHeight, contentX, contentY;
                    
                    if (videoAspectRatio > containerAspectRatio) {{
                        // Video is wider than container - letterbox top/bottom
                        contentWidth = containerRect.width;
                        contentHeight = containerRect.width / videoAspectRatio;
                        contentX = 0;
                        contentY = (containerRect.height - contentHeight) / 2;
                    }} else {{
                        // Video is taller than container - letterbox left/right
                        contentWidth = containerRect.height * videoAspectRatio;
                        contentHeight = containerRect.height;
                        contentX = (containerRect.width - contentWidth) / 2;
                        contentY = 0;
                    }}
                    
                    this.videoContentRect = {{
                        x: contentX,
                        y: contentY,
                        width: contentWidth,
                        height: contentHeight
                    }};
                    
                    console.log('Video content rect:', this.videoContentRect);
                    console.log('Video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
                    console.log('Container dimensions:', containerRect.width, 'x', containerRect.height);
                }}
                
                transformLandmarkCoordinates(landmark) {{
                    if (!this.videoContentRect) {{
                        this.calculateVideoContentRect();
                    }}
                    
                    return {{
                        x: this.videoContentRect.x + (landmark.x * this.videoContentRect.width),
                        y: this.videoContentRect.y + (landmark.y * this.videoContentRect.height),
                        z: landmark.z,
                        visibility: landmark.visibility
                    }};
                }}
                
                startProcessing() {{
                    const processFrame = async () => {{
                        if (!this.video.videoWidth) {{
                            requestAnimationFrame(processFrame);
                            return;
                        }}
                        
                        const now = performance.now();
                        const shouldSkip = this.shouldSkipFrame();
                        
                        if (!shouldSkip && !this.isProcessing) {{
                            this.isProcessing = true;
                            const startTime = performance.now();
                            
                            try {{
                                await this.processCurrentFrame();
                                this.updatePerformanceMetrics(performance.now() - startTime);
                            }} catch (error) {{
                                console.error('Processing error:', error);
                            }} finally {{
                                this.isProcessing = false;
                            }}
                        }}
                        
                        this.updateFPS();
                        requestAnimationFrame(processFrame);
                    }};
                    
                    processFrame();
                }}
                
                shouldSkipFrame() {{
                    const mode = this.modes[this.currentMode];
                    this.performance.frameSkipCounter++;
                    
                    if (this.performance.frameSkipCounter <= mode.skipFrames) {{
                        return true;
                    }}
                    
                    this.performance.frameSkipCounter = 0;
                    return false;
                }}
                
                async processCurrentFrame() {{
                    if (!this.pose) return;
                    
                    // Create processing canvas
                    const processCanvas = document.createElement('canvas');
                    const processCtx = processCanvas.getContext('2d');
                    
                    const mode = this.modes[this.currentMode];
                    processCanvas.width = mode.resolution.width;
                    processCanvas.height = mode.resolution.height;
                    
                    // Apply ROI if enabled
                    if (this.settings.useROI && this.roi) {{
                        const roi = this.roi;
                        const expandedROI = {{
                            x: Math.max(0, roi.x - roi.width * (this.expandROI - 1) / 2),
                            y: Math.max(0, roi.y - roi.height * (this.expandROI - 1) / 2),
                            width: Math.min(1, roi.width * this.expandROI),
                            height: Math.min(1, roi.height * this.expandROI)
                        }};
                        
                        processCtx.drawImage(
                            this.video,
                            expandedROI.x * this.video.videoWidth,
                            expandedROI.y * this.video.videoHeight,
                            expandedROI.width * this.video.videoWidth,
                            expandedROI.height * this.video.videoHeight,
                            0, 0, processCanvas.width, processCanvas.height
                        );
                    }} else {{
                        processCtx.drawImage(this.video, 0, 0, processCanvas.width, processCanvas.height);
                    }}
                    
                    // Send to MediaPipe
                    await this.pose.send({{ image: processCanvas }});
                }}
                
                onPoseResults(results) {{
                    let landmarks = null;
                    
                    // Handle different result formats
                    if (results.poseLandmarks) {{
                        landmarks = results.poseLandmarks;
                    }} else if (results.landmarks) {{
                        landmarks = results.landmarks;
                    }}
                    
                    if (!landmarks || landmarks.length === 0) {{
                        this.updateQualityIndicator(0, 'none');
                        if (this.showSkeleton) {{
                            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        }}
                        return;
                    }}
                    
                    console.log('Pose detected with', landmarks.length, 'landmarks');
                    
                    // Store landmarks for debugging
                    this.lastLandmarks = landmarks;
                    
                    // Apply smoothing
                    if (this.settings.useSmoothing) {{
                        if (this.worker) {{
                            this.worker.postMessage({{ type: 'smoothLandmarks', data: landmarks }});
                            landmarks = this.lastSmoothedLandmarks || landmarks;
                        }} else {{
                            landmarks = this.applySmoothingMainThread(landmarks);
                        }}
                    }}
                    
                    // Calculate ROI for next frame
                    if (this.settings.useROI && this.worker) {{
                        this.worker.postMessage({{ type: 'calculateROI', data: landmarks }});
                    }}
                    
                    // Calculate quality metrics
                    const confidence = this.calculateConfidence(landmarks);
                    const quality = this.determineQuality(confidence);
                    
                    // Draw results - ALWAYS try to draw if skeleton is enabled
                    if (this.showSkeleton) {{
                        console.log('Drawing skeleton with', landmarks.length, 'landmarks');
                        this.drawPoseResults(landmarks);
                    }}
                    
                    // Update UI
                    this.updateQualityIndicator(confidence, quality);
                    
                    // Adaptive quality adjustment
                    if (this.settings.adaptiveQuality) {{
                        this.adjustQualityBasedOnPerformance();
                    }}
                    
                    // Send to React Native
                    this.sendToReactNative({{
                        type: 'pose_data',
                        landmarks: landmarks,
                        confidence: confidence,
                        quality: quality,
                        performance: this.performance
                    }});
                }}
                
                applySmoothingMainThread(landmarks) {{
                    this.landmarkHistory.push(landmarks);
                    if (this.landmarkHistory.length > this.maxHistory) {{
                        this.landmarkHistory.shift();
                    }}
                    
                    if (this.landmarkHistory.length < 2) return landmarks;
                    
                    const smoothed = [];
                    const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
                    const activeWeights = weights.slice(-this.landmarkHistory.length);
                    const weightSum = activeWeights.reduce((a, b) => a + b, 0);
                    
                    for (let i = 0; i < landmarks.length; i++) {{
                        let x = 0, y = 0, z = 0, visibility = 0;
                        
                        for (let j = 0; j < this.landmarkHistory.length; j++) {{
                            const weight = activeWeights[j] / weightSum;
                            const landmark = this.landmarkHistory[j][i];
                            x += landmark.x * weight;
                            y += landmark.y * weight;
                            z += landmark.z * weight;
                            visibility += landmark.visibility * weight;
                        }}
                        
                        smoothed.push({{ x, y, z, visibility }});
                    }}
                    
                    return smoothed;
                }}
                
                calculateConfidence(landmarks) {{
                    const visibleLandmarks = landmarks.filter(l => l.visibility > 0.5);
                    return visibleLandmarks.length / landmarks.length;
                }}
                
                determineQuality(confidence) {{
                    if (confidence > 0.8) return 'excellent';
                    if (confidence > 0.6) return 'good';
                    if (confidence > 0.4) return 'fair';
                    return 'poor';
                }}
                
                drawPoseResults(landmarks) {{
                    try {{
                        console.log('Drawing pose with', landmarks.length, 'landmarks, canvas size:', this.canvas.width, 'x', this.canvas.height);
                        
                        // Clear canvas
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        
                        if (!landmarks || landmarks.length < 10) {{
                            console.warn('Insufficient landmarks for drawing:', landmarks?.length || 0);
                            return;
                        }}
                        
                        // Update video content rectangle for current frame
                        this.calculateVideoContentRect();
                        
                        // Debug: Draw video content area border (optional)
                        if (this.videoContentRect && false) {{ // Set to true to debug
                            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                            this.ctx.lineWidth = 2;
                            this.ctx.strokeRect(
                                this.videoContentRect.x, 
                                this.videoContentRect.y, 
                                this.videoContentRect.width, 
                                this.videoContentRect.height
                            );
                        }}
                        
                        // Transform all landmarks to screen coordinates
                        const transformedLandmarks = landmarks.map(landmark => this.transformLandmarkCoordinates(landmark));
                        
                        // Draw connections first
                        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                        this.ctx.lineWidth = 3;
                        this.ctx.lineCap = 'round';
                        
                        let drawnConnections = 0;
                        this.connections.forEach(([startIdx, endIdx]) => {{
                            const startLandmark = transformedLandmarks[startIdx];
                            const endLandmark = transformedLandmarks[endIdx];
                            const originalStart = landmarks[startIdx];
                            const originalEnd = landmarks[endIdx];
                            
                            if (startLandmark && endLandmark && originalStart && originalEnd) {{
                                const startVis = originalStart.visibility || 1;
                                const endVis = originalEnd.visibility || 1;
                                
                                if (startVis > 0.3 && endVis > 0.3) {{
                                    const startX = startLandmark.x;
                                    const startY = startLandmark.y;
                                    const endX = endLandmark.x;
                                    const endY = endLandmark.y;
                                    
                                    // Only draw if coordinates are valid
                                    if (startX >= 0 && startY >= 0 && endX >= 0 && endY >= 0 &&
                                        startX <= this.canvas.width && startY <= this.canvas.height &&
                                        endX <= this.canvas.width && endY <= this.canvas.height) {{
                                        
                                        this.ctx.beginPath();
                                        this.ctx.moveTo(startX, startY);
                                        this.ctx.lineTo(endX, endY);
                                        this.ctx.stroke();
                                        drawnConnections++;
                                    }}
                                }}
                            }}
                        }});
                        
                        console.log('Drew', drawnConnections, 'connections');
                        
                        // Draw landmarks as circles using transformed coordinates
                        let drawnLandmarks = 0;
                        transformedLandmarks.forEach((transformedLandmark, idx) => {{
                            const originalLandmark = landmarks[idx];
                            if (transformedLandmark && originalLandmark) {{
                                const visibility = originalLandmark.visibility || 1;
                                
                                if (visibility > 0.3) {{
                                    const x = transformedLandmark.x;
                                    const y = transformedLandmark.y;
                                    
                                    // Only draw if coordinates are valid
                                    if (x >= 0 && y >= 0 && x <= this.canvas.width && y <= this.canvas.height) {{
                                        // Different colors for different body parts
                                        if (idx < 11) {{
                                            this.ctx.fillStyle = '#FF6B6B'; // Face - red
                                        }} else if (idx < 23) {{
                                            this.ctx.fillStyle = '#4ECDC4'; // Arms - teal
                                        }} else {{
                                            this.ctx.fillStyle = '#45B7D1'; // Legs - blue
                                        }}
                                        
                                        this.ctx.beginPath();
                                        this.ctx.arc(x, y, idx < 11 ? 4 : 6, 0, Math.PI * 2);
                                        this.ctx.fill();
                                        
                                        // Add a white border
                                        this.ctx.strokeStyle = 'white';
                                        this.ctx.lineWidth = 1;
                                        this.ctx.stroke();
                                        
                                        drawnLandmarks++;
                                    }}
                                }}
                            }}
                        }});
                        
                        console.log('Drew', drawnLandmarks, 'landmarks');
                        console.log('Video content area:', this.videoContentRect);
                        
                        // Debug: Show first landmark transformation
                        if (landmarks.length > 0 && transformedLandmarks.length > 0) {{
                            const original = landmarks[0];
                            const transformed = transformedLandmarks[0];
                            console.log('First landmark transform:', 
                                'original:', original.x.toFixed(3), ',', original.y.toFixed(3),
                                'transformed:', transformed.x.toFixed(1), ',', transformed.y.toFixed(1)
                            );
                        }}
                        
                        if (drawnLandmarks === 0 && drawnConnections === 0) {{
                            console.warn('No landmarks or connections were drawn - check landmark data and video content rect');
                        }}
                        
                    }} catch (error) {{
                        console.error('Error drawing pose results:', error);
                        // Draw a simple indicator to show the system is working
                        this.ctx.fillStyle = 'red';
                        this.ctx.fillRect(10, 10, 20, 20);
                    }}
                }}
                
                updatePerformanceMetrics(processTime) {{
                    this.performance.lastProcessTime = processTime;
                    this.performance.processTimes.push(processTime);
                    
                    if (this.performance.processTimes.length > 30) {{
                        this.performance.processTimes.shift();
                    }}
                    
                    this.performance.averageProcessTime = 
                        this.performance.processTimes.reduce((a, b) => a + b, 0) / 
                        this.performance.processTimes.length;
                    
                    this.processTimeDisplay.textContent = Math.round(processTime);
                }}
                
                updateFPS() {{
                    this.performance.frameCount++;
                    const now = performance.now();
                    
                    if (now - this.performance.lastFPSTime >= 1000) {{
                        this.performance.currentFPS = this.performance.frameCount;
                        this.performance.frameCount = 0;
                        this.performance.lastFPSTime = now;
                        
                        this.fpsDisplay.textContent = this.performance.currentFPS;
                    }}
                }}
                
                updateQualityIndicator(confidence, quality) {{
                    this.qualityDisplay.textContent = quality;
                    this.confidenceText.textContent = `${{Math.round(confidence * 100)}}%`;
                    
                    this.qualityDot.className = `quality-dot quality-${{quality}}`;
                }}
                
                adjustQualityBasedOnPerformance() {{
                    const targetFPS = this.settings.targetFPS;
                    const currentFPS = this.performance.currentFPS;
                    const avgProcessTime = this.performance.averageProcessTime;
                    
                    if (currentFPS < targetFPS * 0.8 || avgProcessTime > 33) {{
                        // Performance is poor, lower quality
                        if (this.currentMode === 'high') {{
                            this.currentMode = 'medium';
                            this.updateModeDisplay();
                        }} else if (this.currentMode === 'medium') {{
                            this.currentMode = 'low';
                            this.updateModeDisplay();
                        }}
                    }} else if (currentFPS > targetFPS * 1.2 && avgProcessTime < 16) {{
                        // Performance is good, try higher quality
                        if (this.currentMode === 'low') {{
                            this.currentMode = 'medium';
                            this.updateModeDisplay();
                        }} else if (this.currentMode === 'medium') {{
                            this.currentMode = 'high';
                            this.updateModeDisplay();
                        }}
                    }}
                }}
                
                updateModeDisplay() {{
                    const mode = this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
                    this.modeDisplay.textContent = `MediaPipe (${{mode}})`;
                }}
                
                // Control methods
                async flipCamera() {{
                    this.flipCameraBtn.disabled = true;
                    this.updateStatus('Switching camera...');
                    
                    try {{
                        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
                        this.flipCameraBtn.textContent = this.currentFacingMode === 'user' ? '📷 Flip' : '📱 Flip';
                        
                        await this.startCamera();
                        this.updateStatus('Camera switched successfully');
                    }} catch (error) {{
                        this.updateStatus(`Camera switch failed: ${{error.message}}`);
                        this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
                        this.flipCameraBtn.textContent = this.currentFacingMode === 'user' ? '📷 Flip' : '📱 Flip';
                    }} finally {{
                        this.flipCameraBtn.disabled = false;
                    }}
                }}
                
                toggleSkeleton() {{
                    this.showSkeleton = !this.showSkeleton;
                    this.toggleSkeletonBtn.textContent = this.showSkeleton ? '🦴 Skeleton ✓' : '🦴 Skeleton';
                    
                    console.log('Skeleton toggled:', this.showSkeleton ? 'ON' : 'OFF');
                    
                    if (!this.showSkeleton) {{
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        console.log('Cleared canvas');
                    }} else {{
                        // Force a redraw if we have recent landmarks
                        if (this.lastLandmarks) {{
                            console.log('Forcing redraw with last landmarks');
                            this.drawPoseResults(this.lastLandmarks);
                        }}
                    }}
                    
                    this.updateStatus(`Skeleton display: ${{this.showSkeleton ? 'enabled' : 'disabled'}}`);
                }}
                
                cycleQuality() {{
                    const modes = ['auto', 'high', 'medium', 'low'];
                    const currentIndex = modes.indexOf(this.settings.qualityMode);
                    const nextIndex = (currentIndex + 1) % modes.length;
                    
                    this.settings.qualityMode = modes[nextIndex];
                    this.qualityBtn.textContent = `⚡ ${{this.settings.qualityMode.charAt(0).toUpperCase() + this.settings.qualityMode.slice(1)}}`;
                    
                    if (this.settings.qualityMode !== 'auto') {{
                        this.currentMode = this.settings.qualityMode;
                        this.settings.adaptiveQuality = false;
                    }} else {{
                        this.settings.adaptiveQuality = true;
                    }}
                    
                    this.updateModeDisplay();
                }}
                
                toggleGPU() {{
                    this.settings.useGPU = !this.settings.useGPU;
                    this.gpuBtn.textContent = this.settings.useGPU ? '🖥️ GPU ✓' : '🖥️ CPU';
                }}
                
                toggleSmoothing() {{
                    this.settings.useSmoothing = !this.settings.useSmoothing;
                    this.smoothBtn.textContent = this.settings.useSmoothing ? '✨ Smooth ✓' : '✨ Smooth';
                    
                    if (!this.settings.useSmoothing) {{
                        this.landmarkHistory = [];
                    }}
                }}
                
                toggleROI() {{
                    this.settings.useROI = !this.settings.useROI;
                    this.roiBtn.textContent = this.settings.useROI ? '🎯 ROI ✓' : '🎯 ROI';
                    
                    if (!this.settings.useROI) {{
                        this.roi = null;
                    }}
                }}
                
                // Utility methods
                updateStatus(message) {{
                    this.statusText.textContent = message;
                    console.log(`[PoseTracker] ${{message}}`);
                }}
                
                hideLoading() {{
                    this.loadingIndicator.style.display = 'none';
                }}
                
                sendToReactNative(data) {{
                    try {{
                        const messageData = JSON.stringify(data);
                        
                        if (window.ReactNativeWebView?.postMessage) {{
                            window.ReactNativeWebView.postMessage(messageData);
                        }} else if (window.postMessage) {{
                            window.postMessage(messageData, '*');
                        }}
                        
                        if (typeof window.webViewCallback === 'function') {{
                            window.webViewCallback(data);
                        }}
                    }} catch (error) {{
                        console.error('Error sending message to React Native:', error);
                    }}
                }}
                
                cleanup() {{
                    if (this.currentStream) {{
                        this.currentStream.getTracks().forEach(track => track.stop());
                    }}
                    
                    if (this.worker) {{
                        this.worker.terminate();
                    }}
                    
                    if (this.pose) {{
                        this.pose.close();
                    }}
                }}
            }}
            
            // Initialize the high-performance pose tracker
            const poseTracker = new HighPerformancePoseTracker();
            
            // Start when DOM is ready
            if (document.readyState === 'complete' || document.readyState === 'interactive') {{
                setTimeout(() => poseTracker.initialize(), 100);
            }} else {{
                document.addEventListener('DOMContentLoaded', () => poseTracker.initialize());
            }}
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)