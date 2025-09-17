from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import os

demo_session_router = APIRouter()

# Note: Static files should be mounted in the main FastAPI app, not in the router

@demo_session_router.get("/pose_tracker/demo")
async def demo_page(
    request: Request,
    token: str = None,
    width: Optional[float] = 480,
    height: Optional[float] = 640,
    skeleton: bool = True
):
    width = int(width)
    height = int(height)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>AI Demo Session</title>
        <style>
            body, html {{
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%);
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
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }}
            
            video, canvas {{
                position: absolute; 
                top: 0; 
                left: 0;
                width: 100%; 
                height: 100%; 
                object-fit: contain; /* Changed from cover to contain for better mobile view */
                border-radius: 20px;
            }}
            
            .mirror {{
                transform: scaleX(-1);
            }}
            
            #poseImage {{
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90vw;
                height: 90vw;
                max-width: 400px;
                max-height: 400px;
                object-fit: contain;
                z-index: 30;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                border: 3px solid rgba(255, 76, 72, 0.6);
                display: none;
                animation: poseImageShow 0.3s ease-in-out;
            }}
            
            @keyframes poseImageShow {{
                0% {{ 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8); 
                }}
                100% {{ 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1); 
                }}
            }}
            
            #instruction {{
                position: absolute; 
                top: 15%; 
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 36px; 
                font-weight: bold;
                text-align: center; 
                color: #fff;
                text-shadow: 3px 3px 12px rgba(0, 0, 0, 0.9);
                z-index: 10;
                padding: 20px 30px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                border-radius: 20px;
                border: 2px solid rgba(255, 76, 72, 0.4);
                max-width: 90%;
                line-height: 1.2;
                box-shadow: 0 8px 32px rgba(255, 76, 72, 0.15);
                display: none;
            }}
            
            #countdown {{
                position: absolute;
                top: 20%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                font-weight: bold;
                color: #ff4c48;
                text-shadow: 0 0 20px rgba(255, 76, 72, 0.5);
                z-index: 25;
                display: none;
                animation: countdownPulse 1s ease-in-out infinite;
            }}
            
            @keyframes countdownPulse {{
                0%, 100% {{ transform: translate(-50%, -50%) scale(1); }}
                50% {{ transform: translate(-50%, -50%) scale(1.1); }}
            }}
            
            #feedback {{
                position: absolute; 
                top: 50%; 
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 80px; 
                font-weight: bold;
                color: #4CAF50; 
                display: none;
                z-index: 20;
                text-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
                animation: feedbackPulse 1.2s ease-in-out;
            }}
            
            #successOverlay {{
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(76, 175, 80, 0.7);
                display: none;
                z-index: 50;
                animation: successFade 1.5s ease-in-out;
                pointer-events: none;
            }}
            
            @keyframes successFade {{
                0% {{ 
                    opacity: 0; 
                }}
                25% {{ 
                    opacity: 0.6; 
                }}
                75% {{ 
                    opacity: 0.6; 
                }}
                100% {{ 
                    opacity: 0; 
                }}
            }}
            
            #poseStatus {{
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                color: white;
                padding: 18px 24px;
                border-radius: 15px;
                font-size: 18px;
                font-weight: 600;
                z-index: 15;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                max-width: 280px;
                text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.8);
            }}
            
            .pose-detected {{
                background: rgba(76, 175, 80, 0.2) !important;
                border-color: rgba(76, 175, 80, 0.5) !important;
                box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3) !important;
            }}
            
            .pose-not-detected {{
                background: rgba(244, 67, 54, 0.2) !important;
                border-color: rgba(244, 67, 54, 0.5) !important;
                box-shadow: 0 8px 32px rgba(244, 67, 54, 0.3) !important;
            }}
            
            #holdTimer {{
                position: absolute;
                bottom: 130px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                color: white;
                padding: 20px 35px;
                border-radius: 30px;
                font-size: 28px;
                font-weight: bold;
                display: none;
                z-index: 20;
                border: 3px solid rgba(255, 76, 72, 0.4);
                animation: pulse 1.5s infinite;
                text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
                box-shadow: 0 8px 32px rgba(255, 76, 72, 0.4);
            }}
            
            @keyframes pulse {{
                0%, 100% {{ transform: translateX(-50%) scale(1); }}
                50% {{ transform: translateX(-50%) scale(1.05); }}
            }}
            
            @keyframes feedbackPulse {{
                0% {{ transform: translate(-50%, -50%) scale(0.5); opacity: 0; }}
                50% {{ transform: translate(-50%, -50%) scale(1.2); opacity: 1; }}
                100% {{ transform: translate(-50%, -50%) scale(1); opacity: 1; }}
            }}
            
            #loadingIndicator {{
                position: absolute; 
                top: 50%; 
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                color: white; 
                padding: 40px 50px;
                border-radius: 20px; 
                font-size: 18px;
                z-index: 100;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }}
            
            .loading-spinner {{
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid #ff4c48;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }}
            
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
            
            .step-progress {{
                position: absolute;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 15px;
                z-index: 15;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                padding: 15px 25px;
                border-radius: 50px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }}
            
            .step-dot {{
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
                position: relative;
            }}
            
            .step-dot.completed {{
                background: #4CAF50;
                box-shadow: 0 0 15px rgba(76, 175, 80, 0.6);
                transform: scale(1.1);
            }}
            
            .step-dot.current {{
                background: #ff4c48;
                transform: scale(1.3);
                box-shadow: 0 0 15px rgba(255, 76, 72, 0.6);
                animation: currentStep 2s infinite;
            }}
            
            .step-dot.showing-demo {{
                background: #fbbf24;
                transform: scale(1.2);
                box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
                animation: showingDemo 1s ease-in-out infinite;
            }}
            
            @keyframes currentStep {{
                0%, 100% {{ opacity: 1; }}
                50% {{ opacity: 0.6; }}
            }}
            
            @keyframes showingDemo {{
                0%, 100% {{ opacity: 0.7; }}
                50% {{ opacity: 1; }}
            }}
            
            .performance-panel {{
                position: absolute;
                bottom: 20px;
                left: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                color: white;
                padding: 15px;
                border-radius: 15px;
                font-size: 11px;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                z-index: 120;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                display: flex;
                justify-content: space-around;
                align-items: center;
            }}
            
            .metric-item {{
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                min-width: 80px;
            }}
            
            .metric-value {{
                font-size: 18px;
                font-weight: 700;
                color: #ff4c48;
                text-shadow: 0 0 8px rgba(255, 76, 72, 0.3);
            }}
            
            .metric-label {{
                font-size: 11px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.8);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            
            .quality-indicator {{
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
            }}
            
            .quality-dot {{
                width: 10px;
                height: 10px;
                border-radius: 50%;
                transition: all 0.3s ease;
                box-shadow: 0 0 8px currentColor;
            }}
            
            .quality-excellent {{ 
                background-color: #4ade80;
                color: #4ade80;
            }}
            
            .quality-good {{ 
                background-color: #fbbf24;
                color: #fbbf24;
            }}
            
            .quality-fair {{ 
                background-color: #f97316;
                color: #f97316;
            }}
            
            .quality-poor {{ 
                background-color: #ef4444;
                color: #ef4444;
            }}
            
            .quality-demo {{ 
                background-color: #a855f7;
                color: #a855f7;
            }}
            
            /* Responsive adjustments */
            @media (max-width: 768px) {{
                #poseImage {{
                    width: 85vw;
                    height: 85vw;
                    max-width: 350px;
                    max-height: 350px;
                }}
                
                #instruction {{
                    font-size: 28px;
                    padding: 15px 25px;
                }}
                
                #countdown {{
                    font-size: 40px;
                }}
                
                #poseStatus {{
                    top: 15px;
                    left: 15px;
                    padding: 15px 20px;
                    font-size: 16px;
                    max-width: 250px;
                }}
                
                #holdTimer {{
                    bottom: 110px;
                    padding: 15px 25px;
                    font-size: 24px;
                }}
                
                .step-progress {{
                    bottom: 60px;
                    padding: 12px 20px;
                    gap: 12px;
                }}
                
                .step-dot {{
                    width: 14px;
                    height: 14px;
                }}
                
                .performance-panel {{
                    bottom: 15px;
                    left: 15px;
                    right: 15px;
                    padding: 12px;
                    font-size: 10px;
                }}
                
                .metric-value {{
                    font-size: 16px;
                }}
                
                .metric-item {{
                    min-width: 60px;
                }}
            }}
        </style>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
    </head>
    <body>
        <div class="container">
            <video id="video" autoplay playsinline muted></video>
            <canvas id="canvas"></canvas>
            <img id="poseImage" alt="Pose demonstration" />
            <div id="instruction">Get Ready...</div>
            <div id="countdown">3</div>
            <div id="feedback">✅</div>
            <div id="successOverlay"></div>
            <div id="loadingIndicator">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div id="loadingText">Loading AI Demo...</div>
                    <div id="loadingSubtext">Initializing pose detection...</div>
                </div>
            </div>
            <div class="step-progress">
                <div class="step-dot current" id="step0"></div>
                <div class="step-dot" id="step1"></div>
                <div class="step-dot" id="step2"></div>
            </div>
            <div id="poseStatus" class="pose-not-detected">
                Detecting pose...
            </div>
            <div id="holdTimer">Hold: 3s</div>
            
            <!-- Enhanced audio system -->
            <audio id="ding" preload="auto" crossorigin="anonymous">
                <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIdCSCG3/DHeyMFMIzP8OCRR" type="audio/wav">
            </audio>
            <audio id="startSound" preload="auto" crossorigin="anonymous">
                <source src="data:audio/wav;base64,UklGRjIEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4EAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIdCVqFhYKfHzNgOpOhpJFfNSxdo9vdqmEWAjiV2fLLeSEFKnnC8eGNP" type="audio/wav">
            </audio>
            <audio id="holdSound" preload="auto" crossorigin="anonymous">
                <source src="data:audio/wav;base64,UklGRkoFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSYFAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2+LDcSUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIdCSCG3/DHeyMFMIzP8OCRRA" type="audio/wav">
            </audio>
            <audio id="successSound" preload="auto" crossorigin="anonymous">
                <source src="data:audio/wav;base64,UklGRl4GAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YToGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2+LDcSUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIdCSCG3/DHeyMFMIzP8OCRRAI+ytjmhkQSClc=" type="audio/wav">
            </audio>
            
            <!-- Performance panel -->
            <div class="performance-panel" id="performancePanel">
                <div class="metric-item">
                    <div class="metric-value" id="stepDisplay">1/3</div>
                    <div class="metric-label">Step</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value" id="accuracyDisplay">--</div>
                    <div class="metric-label">Accuracy</div>
                </div>
                <div class="metric-item">
                    <div class="quality-indicator">
                        <div class="quality-dot quality-demo" id="qualityDot"></div>
                        <span id="qualityText">Demo</span>
                    </div>
                    <div class="metric-label">Status</div>
                </div>
            </div>
        </div>

        <script>
            class ImageGuidedDemoController {{
                constructor() {{
                    this.initializeElements();
                    this.initializeSettings();
                    this.setupPoseDetection();
                    this.initializeAudio();
                    this.startDemo();
                }}
                
                initializeElements() {{
                    this.video = document.getElementById('video');
                    this.canvas = document.getElementById('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    this.container = this.canvas.parentElement;
                    this.instruction = document.getElementById('instruction');
                    this.poseImage = document.getElementById('poseImage');
                    this.countdown = document.getElementById('countdown');
                    this.feedback = document.getElementById('feedback');
                    this.successOverlay = document.getElementById('successOverlay');
                    this.loading = document.getElementById('loadingIndicator');
                    this.poseStatus = document.getElementById('poseStatus');
                    this.holdTimer = document.getElementById('holdTimer');
                    
                    // Audio elements
                    this.ding = document.getElementById('ding');
                    this.startSound = document.getElementById('startSound');
                    this.holdSound = document.getElementById('holdSound');
                    this.successSound = document.getElementById('successSound');
                    
                    // Performance elements
                    this.stepDisplay = document.getElementById('stepDisplay');
                    this.accuracyDisplay = document.getElementById('accuracyDisplay');
                    this.qualityDot = document.getElementById('qualityDot');
                    this.qualityText = document.getElementById('qualityText');
                    
                    // Set initial canvas size
                    this.updateCanvasSize();
                    
                    // Add resize listener for proper video content calculation
                    window.addEventListener('resize', () => {{
                        this.updateCanvasSize();
                        setTimeout(() => this.calculateVideoContentRect(), 100);
                    }});
                }}
                
                initializeAudio() {{
                    const audioElements = [this.ding, this.startSound, this.holdSound, this.successSound];
                    
                    audioElements.forEach((audio, index) => {{
                        if (audio) {{
                            audio.volume = 1.0; // Increased volume
                            audio.preload = 'auto';
                            audio.crossOrigin = 'anonymous';
                            
                            audio.addEventListener('canplaythrough', () => {{
                                console.log(`Audio ${{index}} ready`);
                            }});
                            
                            audio.addEventListener('error', (e) => {{
                                console.warn(`Audio ${{index}} error:`, e);
                            }});
                        }}
                    }});
                    
                    this.audioReady = false;
                    this.audioEnabled = false;
                    
                    // Enable audio on any user interaction
                    const enableAudio = () => {{
                        this.enableAudio();
                        document.removeEventListener('click', enableAudio);
                        document.removeEventListener('touchstart', enableAudio);
                        document.removeEventListener('touchend', enableAudio);
                    }};
                    
                    document.addEventListener('click', enableAudio);
                    document.addEventListener('touchstart', enableAudio);
                    document.addEventListener('touchend', enableAudio);
                }}
                
                enableAudio() {{
                    if (!this.audioEnabled) {{
                        const audioElements = [this.ding, this.startSound, this.holdSound, this.successSound];
                        
                        // Try to play and pause each audio to unlock them
                        audioElements.forEach((audio, index) => {{
                            if (audio) {{
                                const playPromise = audio.play();
                                if (playPromise !== undefined) {{
                                    playPromise.then(() => {{
                                        audio.pause();
                                        audio.currentTime = 0;
                                        console.log(`Audio ${{index}} unlocked`);
                                    }}).catch(e => {{
                                        console.log(`Audio ${{index}} unlock failed:`, e);
                                    }});
                                }}
                            }}
                        }});
                        
                        this.audioEnabled = true;
                        this.audioReady = true;
                        console.log('Audio context enabled and unlocked');
                    }}
                }}
                
                initializeSettings() {{
                    this.steps = [
                        {{ 
                            name: 'idle', 
                            displayName: 'Stand Naturally', 
                            instruction: 'Stand in a relaxed, natural position',
                            holdDuration: 3000,
                            imageUrl: '/static/idle.png'
                        }},
                        {{ 
                            name: 't_pose', 
                            displayName: 'T-Pose', 
                            instruction: 'Stretch your arms out to form a T shape',
                            holdDuration: 4000,
                            imageUrl: '/static/tpose.png'
                        }},
                        {{ 
                            name: 'hands_up', 
                            displayName: 'Hands Up!', 
                            instruction: 'Raise both hands high above your head',
                            holdDuration: 3000,
                            imageUrl: '/static/handsup.png'
                        }}
                    ];
                    
                    this.currentStep = 0;
                    this.completedSteps = [];
                    this.showSkeleton = {str(skeleton).lower()};
                    this.isProcessing = false;
                    this.stepStartTime = Date.now();
                    this.currentFacingMode = 'user';
                    this.demoCompleted = false;
                    
                    // Phase management
                    this.currentPhase = 'demo'; // 'demo' or 'detect'
                    this.demoImageDuration = 5000; // 5 seconds - increased from 2 seconds
                    
                    // Enhanced pose detection state
                    this.poseDetectedStart = null;
                    this.currentPoseDetected = false;
                    this.poseDetectionBuffer = [];
                    this.bufferSize = 6;
                    this.confidenceThreshold = 0.75;
                    this.stabilityThreshold = 0.8;
                    
                    // Sound feedback tracking
                    this.lastSoundTime = 0;
                    this.soundCooldown = 500;
                    this.consecutiveDetections = 0;
                    this.lastTickSecond = -1;
                }}
                
                notify(type, data) {{
                    const messageData = {{ type, ...data }};
                    
                    try {{
                        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {{
                            window.ReactNativeWebView.postMessage(JSON.stringify(messageData));
                        }}
                        
                        if (window.postMessage) {{
                            window.postMessage(messageData, '*');
                        }}
                        
                        if (typeof window.webViewCallback === 'function') {{
                            window.webViewCallback(messageData);
                        }}
                    }} catch (error) {{
                        console.error('Error sending notification:', error);
                    }}
                }}
                
                setupPoseDetection() {{
                    try {{
                        if (typeof Pose === 'undefined') {{
                            throw new Error('MediaPipe not loaded');
                        }}
                        
                        this.pose = new Pose({{
                            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${{file}}`
                        }});

                        this.pose.setOptions({{
                            modelComplexity: 1,
                            smoothLandmarks: true,
                            enableSegmentation: false,
                            minDetectionConfidence: 0.7,
                            minTrackingConfidence: 0.6
                        }});

                        this.pose.onResults((results) => this.onPoseResults(results));
                        
                        // Set up pose connections for drawing
                        this.connections = POSE_CONNECTIONS || this.getDefaultConnections();
                        
                        console.log('MediaPipe Pose initialized successfully');
                    }} catch (error) {{
                        console.error('Failed to initialize MediaPipe:', error);
                        this.notify('error', {{ message: 'Failed to load pose detection' }});
                    }}
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
                
                async startDemo() {{
                    try {{
                        console.log('Starting image-guided demo session');
                        
                        // Mobile-optimized camera constraints for wider field of view
                        const constraints = {{
                            video: {{
                                facingMode: this.currentFacingMode,
                                width: {{ min: 480, ideal: 720, max: 1280 }}, // Wider range for better mobile support
                                height: {{ min: 360, ideal: 480, max: 720 }},
                                aspectRatio: {{ ideal: 4/3 }}, // Better aspect ratio for full body view
                                frameRate: {{ ideal: 30, max: 60 }}
                            }}
                        }};
                        
                        const stream = await navigator.mediaDevices.getUserMedia(constraints);
                        
                        this.video.srcObject = stream;
                        
                        await new Promise(resolve => {{
                            this.video.onloadedmetadata = () => {{
                                console.log('Video metadata loaded - Resolution:', this.video.videoWidth, 'x', this.video.videoHeight);
                                this.video.play();
                                
                                if (this.currentFacingMode === 'user') {{
                                    this.video.classList.add('mirror');
                                    this.canvas.classList.add('mirror');
                                }}
                                
                                // Update canvas size and calculate video content area
                                this.updateCanvasSize();
                                
                                // Wait for video data to be fully loaded
                                this.video.onloadeddata = () => {{
                                    console.log('Video data loaded, calculating content rect');
                                    this.calculateVideoContentRect();
                                    resolve();
                                }};
                            }};
                        }});
                        
                        this.camera = new Camera(this.video, {{
                            onFrame: async () => {{
                                if (!this.isProcessing && this.pose && !this.demoCompleted && this.currentPhase === 'detect') {{
                                    await this.pose.send({{ image: this.video }});
                                }}
                            }},
                            width: {width},
                            height: {height}
                        }});
                        
                        await this.camera.start();
                        
                        this.loading.style.display = "none";
                        this.startCurrentStep();
                        
                        this.notify('demo_ready', {{ message: 'Image-guided demo initialized successfully' }});
                        
                    }} catch (error) {{
                        console.error('Camera initialization error:', error);
                        this.instruction.textContent = "Camera Error - Check Permissions";
                        this.loading.style.display = "none";
                        this.notify('error', {{ message: error.message }});
                    }}
                }}
                
                startCurrentStep() {{
                    if (this.currentStep >= this.steps.length) {{
                        this.completeDemo();
                        return;
                    }}
                    
                    const step = this.steps[this.currentStep];
                    console.log(`Starting step ${{this.currentStep}}: ${{step.displayName}}`);
                    
                    // Reset all states
                    this.resetPoseDetection();
                    this.poseDetectionBuffer = [];
                    this.currentPoseDetected = false;
                    this.consecutiveDetections = 0;
                    this.lastTickSecond = -1;
                    this.currentPhase = 'demo';
                    
                    // Update UI
                    this.updateStepIndicators();
                    this.updatePerformanceDisplay();
                    
                    // Start with demo phase
                    this.showDemoImage(step);
                    
                    this.notify('demo_status', {{ 
                        step: step.name, 
                        step_index: this.currentStep,
                        display_name: step.displayName,
                        phase: 'demo'
                    }});
                }}
                
                showDemoImage(step) {{
                    console.log(`Showing demo image for: ${{step.displayName}}`);
                    
                    // Update status to show we're in demo phase
                    this.poseStatus.textContent = `Watch the demonstration: ${{step.displayName}}`;
                    this.poseStatus.className = 'pose-not-detected';
                    this.qualityDot.className = 'quality-dot quality-demo';
                    this.qualityText.textContent = 'Demo';
                    
                    // Show image
                    this.poseImage.src = step.imageUrl;
                    this.poseImage.style.display = 'block';
                    
                    // Update step indicator to show demo phase
                    const currentDot = document.getElementById(`step${{this.currentStep}}`);
                    if (currentDot) {{
                        currentDot.className = 'step-dot showing-demo';
                    }}
                    
                    // Hide image after 2 seconds and start detection
                    setTimeout(() => {{
                        this.hideDemoImageAndStartDetection(step);
                    }}, this.demoImageDuration);
                }}
                
                hideDemoImageAndStartDetection(step) {{
                    console.log(`Hiding demo image, starting detection for: ${{step.displayName}}`);
                    
                    // Hide image
                    this.poseImage.style.display = 'none';
                    
                    // Switch to detection phase
                    this.currentPhase = 'detect';
                    this.stepStartTime = Date.now();
                    
                    // Update status
                    this.poseStatus.textContent = `Now try: ${{step.displayName}}`;
                    this.poseStatus.className = 'pose-not-detected';
                    this.qualityDot.className = 'quality-dot quality-poor';
                    this.qualityText.textContent = 'Detecting';
                    
                    // Update step indicator to show detection phase
                    const currentDot = document.getElementById(`step${{this.currentStep}}`);
                    if (currentDot) {{
                        currentDot.className = 'step-dot current';
                    }}
                    
                    // Show a quick countdown
                    this.showCountdown(() => {{
                        console.log(`Detection started for step: ${{step.displayName}}`);
                    }});
                }}
                
                showCountdown(callback) {{
                    let count = 3;
                    this.countdown.textContent = count;
                    this.countdown.style.display = 'block';
                    
                    const countdownInterval = setInterval(() => {{
                        count--;
                        if (count > 0) {{
                            this.countdown.textContent = count;
                            // Send tick message to React Native
                            this.notify('countdown_tick', {{
                                message: 'Countdown tick',
                                count: count,
                                timestamp: Date.now()
                            }});
                        }} else {{
                            this.countdown.textContent = 'GO!';
                            // Send start message to React Native
                            this.notify('countdown_go', {{
                                message: 'Countdown finished',
                                timestamp: Date.now()
                            }});
                            setTimeout(() => {{
                                this.countdown.style.display = 'none';
                                if (callback) callback();
                            }}, 500);
                            clearInterval(countdownInterval);
                        }}
                    }}, 1000);
                }}
                
                updateStepIndicators() {{
                    for (let i = 0; i < this.steps.length; i++) {{
                        const dot = document.getElementById(`step${{i}}`);
                        if (dot) {{
                            dot.className = 'step-dot';
                            
                            if (this.completedSteps.includes(i)) {{
                                dot.classList.add('completed');
                            }} else if (i === this.currentStep) {{
                                if (this.currentPhase === 'demo') {{
                                    dot.classList.add('showing-demo');
                                }} else {{
                                    dot.classList.add('current');
                                }}
                            }}
                        }}
                    }}
                }}
                
                updatePerformanceDisplay() {{
                    this.stepDisplay.textContent = `${{this.currentStep + 1}}/${{this.steps.length}}`;
                    
                    const accuracy = this.consecutiveDetections > 0 ? 
                        Math.min(100, Math.round((this.consecutiveDetections / 10) * 100)) : 0;
                    this.accuracyDisplay.textContent = `${{accuracy}}%`;
                }}
                
                onPoseResults(results) {{
                    if (this.demoCompleted || this.currentPhase !== 'detect') return;
                    
                    this.isProcessing = true;
                    
                    try {{
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        
                        if (results.poseLandmarks && results.poseLandmarks.length > 0) {{
                            if (this.showSkeleton) {{
                                this.drawPose(results.poseLandmarks);
                            }}
                            
                            this.checkStepCompletion(results.poseLandmarks);
                        }} else {{
                            this.updatePoseStatus(false, "No pose detected - stand in view", 'poor');
                            this.resetPoseDetection();
                            this.consecutiveDetections = Math.max(0, this.consecutiveDetections - 1);
                        }}
                        
                        this.updatePerformanceDisplay();
                    }} catch (error) {{
                        console.error('Error processing pose results:', error);
                    }} finally {{
                        this.isProcessing = false;
                    }}
                }}
                
                drawPose(landmarks) {{
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
                        
                        // Transform all landmarks to screen coordinates
                        const transformedLandmarks = landmarks.map(landmark => this.transformLandmarkCoordinates(landmark));
                        
                        // Draw connections first
                        this.ctx.strokeStyle = '#ff4c48';
                        this.ctx.lineWidth = 3;
                        this.ctx.lineCap = 'round';
                        this.ctx.shadowColor = 'rgba(255, 76, 72, 0.3)';
                        this.ctx.shadowBlur = 5;
                        
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
                        
                        // Reset shadow for landmarks
                        this.ctx.shadowBlur = 0;
                        
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
                                            this.ctx.fillStyle = '#ff4c48'; // Face - red
                                        }} else if (idx < 23) {{
                                            this.ctx.fillStyle = '#4CAF50'; // Arms - green
                                        }} else {{
                                            this.ctx.fillStyle = '#2196F3'; // Legs - blue
                                        }}
                                        
                                        this.ctx.beginPath();
                                        this.ctx.arc(x, y, idx < 11 ? 3 : 4, 0, Math.PI * 2);
                                        this.ctx.fill();
                                        
                                        // Add a white border
                                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                                        this.ctx.lineWidth = 1;
                                        this.ctx.stroke();
                                        
                                        drawnLandmarks++;
                                    }}
                                }}
                            }}
                        }});
                        
                        console.log('Drew', drawnLandmarks, 'landmarks');
                        
                        if (drawnLandmarks === 0 && drawnConnections === 0) {{
                            console.warn('No landmarks or connections were drawn - check landmark data and video content rect');
                        }}
                        
                    }} catch (error) {{
                        console.error('Error drawing pose results:', error);
                        // Draw a simple indicator to show the system is working
                        this.ctx.fillStyle = '#ff4c48';
                        this.ctx.fillRect(10, 10, 20, 20);
                    }}
                }}
                
                checkStepCompletion(landmarks) {{
                    if (this.currentStep >= this.steps.length || this.demoCompleted || this.currentPhase !== 'detect') return;
                    
                    const step = this.steps[this.currentStep];
                    let poseResult = {{ detected: false, message: "Checking pose...", quality: 'poor' }};
                    
                    try {{
                        switch (step.name) {{
                            case 'idle':
                                poseResult = this.checkIdlePose(landmarks);
                                break;
                            case 't_pose':
                                poseResult = this.checkTPose(landmarks);
                                break;
                            case 'hands_up':
                                poseResult = this.checkHandsUp(landmarks);
                                break;
                        }}
                        
                        // Add to detection buffer for stability
                        this.poseDetectionBuffer.push(poseResult.detected);
                        if (this.poseDetectionBuffer.length > this.bufferSize) {{
                            this.poseDetectionBuffer.shift();
                        }}
                        
                        // Check for consistent detection
                        const detectionRate = this.poseDetectionBuffer.length > 0 ? 
                            this.poseDetectionBuffer.filter(d => d).length / this.poseDetectionBuffer.length : 0;
                        const isStableDetection = this.poseDetectionBuffer.length >= this.bufferSize && 
                                                detectionRate >= this.stabilityThreshold;
                        
                        this.updatePoseStatus(isStableDetection, poseResult.message, poseResult.quality);
                        
                        if (isStableDetection) {{
                            this.consecutiveDetections++;
                            this.handlePoseDetected(step);
                        }} else {{
                            this.resetPoseDetection();
                            if (poseResult.detected) {{
                                this.consecutiveDetections = Math.max(0, this.consecutiveDetections - 0.5);
                            }} else {{
                                this.consecutiveDetections = Math.max(0, this.consecutiveDetections - 1);
                            }}
                        }}
                        
                    }} catch (error) {{
                        console.error('Error checking step completion:', error);
                        this.updatePoseStatus(false, "Detection error - try again", 'poor');
                    }}
                }}
                
                updatePoseStatus(detected, message, quality = 'poor') {{
                    this.currentPoseDetected = detected;
                    this.poseStatus.textContent = message;
                    this.poseStatus.className = detected ? 'pose-detected' : 'pose-not-detected';
                    
                    // Update quality indicator
                    this.qualityDot.className = `quality-dot quality-${{quality}}`;
                    this.qualityText.textContent = detected ? 'Detected' : 'Searching';
                }}
                
                handlePoseDetected(step) {{
                    const now = Date.now();
                    
                    if (!this.poseDetectedStart) {{
                        this.poseDetectedStart = now;
                        this.holdTimer.style.display = 'block';
                        console.log(`Started holding pose for step: ${{step.name}}`);
                        
                        // Send pose detection start message to React Native
                        this.notify('pose_detected', {{
                            message: 'Pose detected, starting hold timer',
                            step: step.name,
                            step_index: this.currentStep,
                            timestamp: now
                        }});
                    }}
                    
                    const holdTime = now - this.poseDetectedStart;
                    const remainingTime = Math.max(0, step.holdDuration - holdTime);
                    const secondsRemaining = Math.ceil(remainingTime / 1000);
                    
                    this.holdTimer.textContent = `Hold: ${{secondsRemaining}}s`;
                    
                    // Send tick sound message to React Native every second
                    if (secondsRemaining !== this.lastTickSecond && secondsRemaining > 0 && secondsRemaining <= 4) {{
                        if (now - this.lastSoundTime > this.soundCooldown) {{
                            this.notify('pose_tick', {{
                                message: 'Hold countdown tick',
                                seconds_remaining: secondsRemaining,
                                timestamp: now
                            }});
                            this.lastSoundTime = now;
                            this.lastTickSecond = secondsRemaining;
                        }}
                    }}
                    
                    if (holdTime >= step.holdDuration) {{
                        console.log(`Completing step ${{this.currentStep}}: ${{step.name}}`);
                        this.completeCurrentStep();
                    }}
                }}
                
                playSound(soundId, forcePlay = false) {{
                    try {{
                        const sound = document.getElementById(soundId);
                        if (sound && (this.audioEnabled || forcePlay)) {{
                            // Stop current playback if any
                            sound.pause();
                            sound.currentTime = 0;
                            
                            const playPromise = sound.play();
                            
                            if (playPromise !== undefined) {{
                                playPromise
                                    .then(() => {{
                                        console.log(`Successfully played sound: ${{soundId}}`);
                                    }})
                                    .catch(e => {{
                                        console.log(`Could not play ${{soundId}}:`, e);
                                        // Try to enable audio if not already enabled
                                        if (!this.audioEnabled) {{
                                            this.enableAudio();
                                        }}
                                    }});
                            }}
                        }} else {{
                            console.log(`Audio not ready or sound not found: ${{soundId}}`);
                        }}
                    }} catch (error) {{
                        console.log(`Error playing sound ${{soundId}}:`, error);
                    }}
                }}
                
                resetPoseDetection() {{
                    this.poseDetectedStart = null;
                    this.holdTimer.style.display = 'none';
                    this.lastTickSecond = -1;
                }}
                
                checkIdlePose(landmarks) {{
                    try {{
                        const requiredPoints = [0, 11, 12, 23, 24]; // nose, shoulders, hips
                        const missingPoints = requiredPoints.filter(i => !landmarks[i] || landmarks[i].visibility < 0.5);
                        
                        if (missingPoints.length > 0) {{
                            return {{ detected: false, message: "Stand fully in camera view", quality: 'poor' }};
                        }}
                        
                        const nose = landmarks[0];
                        const leftShoulder = landmarks[11];
                        const rightShoulder = landmarks[12];
                        const leftHip = landmarks[23];
                        const rightHip = landmarks[24];
                        
                        // Check upright posture
                        const avgHipY = (leftHip.y + rightHip.y) / 2;
                        if (nose.y >= avgHipY - 0.1) {{
                            return {{ detected: false, message: "Stand up straight", quality: 'fair' }};
                        }}
                        
                        // Check shoulder level
                        const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
                        if (shoulderTilt > 0.08) {{
                            return {{ detected: false, message: "Level your shoulders", quality: 'fair' }};
                        }}
                        
                        // Check body is centered
                        const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
                        if (Math.abs(shoulderCenter - 0.5) > 0.2) {{
                            return {{ detected: false, message: "Center yourself in frame", quality: 'good' }};
                        }}
                        
                        return {{ detected: true, message: "Perfect posture! Hold steady", quality: 'excellent' }};
                        
                    }} catch (error) {{
                        return {{ detected: false, message: "Stand naturally in view", quality: 'poor' }};
                    }}
                }}
                
                checkTPose(landmarks) {{
                    try {{
                        const requiredPoints = [11, 12, 13, 14, 15, 16]; // shoulders, elbows, wrists
                        const missingPoints = requiredPoints.filter(i => !landmarks[i] || landmarks[i].visibility < 0.5);
                        
                        if (missingPoints.length > 0) {{
                            return {{ detected: false, message: "Extend both arms out to sides", quality: 'poor' }};
                        }}
                        
                        const leftShoulder = landmarks[11];
                        const rightShoulder = landmarks[12];
                        const leftElbow = landmarks[13];
                        const rightElbow = landmarks[14];
                        const leftWrist = landmarks[15];
                        const rightWrist = landmarks[16];
                        
                        // Check wrist height relative to shoulders (more lenient)
                        const leftWristLevel = Math.abs(leftWrist.y - leftShoulder.y) < 0.12;
                        const rightWristLevel = Math.abs(rightWrist.y - rightShoulder.y) < 0.12;
                        
                        if (!leftWristLevel && !rightWristLevel) {{
                            return {{ detected: false, message: "Raise both arms to shoulder level", quality: 'poor' }};
                        }} else if (!leftWristLevel) {{
                            return {{ detected: false, message: "Raise left arm to shoulder level", quality: 'fair' }};
                        }} else if (!rightWristLevel) {{
                            return {{ detected: false, message: "Raise right arm to shoulder level", quality: 'fair' }};
                        }}
                        
                        // Check arm extension (more lenient)
                        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
                        const leftExtension = Math.abs(leftShoulder.x - leftWrist.x) / shoulderWidth;
                        const rightExtension = Math.abs(rightWrist.x - rightShoulder.x) / shoulderWidth;
                        
                        if (leftExtension < 0.7 && rightExtension < 0.7) {{
                            return {{ detected: false, message: "Extend both arms out wider", quality: 'fair' }};
                        }} else if (leftExtension < 0.7) {{
                            return {{ detected: false, message: "Extend left arm out more", quality: 'good' }};
                        }} else if (rightExtension < 0.7) {{
                            return {{ detected: false, message: "Extend right arm out more", quality: 'good' }};
                        }}
                        
                        return {{ detected: true, message: "Perfect T-Pose! Hold it steady", quality: 'excellent' }};
                        
                    }} catch (error) {{
                        return {{ detected: false, message: "Make T-shape with your arms", quality: 'poor' }};
                    }}
                }}
                
                checkHandsUp(landmarks) {{
                    try {{
                        const requiredPoints = [0, 11, 12, 15, 16]; // nose, shoulders, wrists
                        const missingPoints = requiredPoints.filter(i => !landmarks[i] || landmarks[i].visibility < 0.5);
                        
                        if (missingPoints.length > 0) {{
                            return {{ detected: false, message: "Raise both hands up high", quality: 'poor' }};
                        }}
                        
                        const nose = landmarks[0];
                        const leftShoulder = landmarks[11];
                        const rightShoulder = landmarks[12];
                        const leftWrist = landmarks[15];
                        const rightWrist = landmarks[16];
                        
                        // Check if hands are above shoulders
                        const leftHandAboveShoulder = leftWrist.y < leftShoulder.y - 0.08;
                        const rightHandAboveShoulder = rightWrist.y < rightShoulder.y - 0.08;
                        
                        if (!leftHandAboveShoulder && !rightHandAboveShoulder) {{
                            return {{ detected: false, message: "Raise both hands higher", quality: 'poor' }};
                        }} else if (!leftHandAboveShoulder) {{
                            return {{ detected: false, message: "Raise left hand higher", quality: 'fair' }};
                        }} else if (!rightHandAboveShoulder) {{
                            return {{ detected: false, message: "Raise right hand higher", quality: 'fair' }};
                        }}
                        
                        // Check if hands are above head (more lenient)
                        const leftHandAboveHead = leftWrist.y < nose.y - 0.05;
                        const rightHandAboveHead = rightWrist.y < nose.y - 0.05;
                        
                        if (!leftHandAboveHead || !rightHandAboveHead) {{
                            return {{ detected: false, message: "Raise hands above your head!", quality: 'good' }};
                        }}
                        
                        return {{ detected: true, message: "Excellent! Hands up high!", quality: 'excellent' }};
                        
                    }} catch (error) {{
                        return {{ detected: false, message: "Raise both hands up high", quality: 'poor' }};
                    }}
                }}
                
                completeCurrentStep() {{
                    if (this.demoCompleted) return;
                    
                    console.log(`Step ${{this.currentStep}} completed successfully`);
                    
                    // Play success sound immediately
                    this.playSound('successSound', true);
                    
                    // Add to completed steps
                    this.completedSteps.push(this.currentStep);
                    this.holdTimer.style.display = 'none';
                    this.showFeedback();
                    
                    // Clear detection state immediately
                    this.resetPoseDetection();
                    this.poseDetectionBuffer = [];
                    this.currentPoseDetected = false;
                    
                    this.notify('demo_step_complete', {{ 
                        step: this.steps[this.currentStep].name,
                        step_index: this.currentStep,
                        steps_completed: this.completedSteps.length,
                        accuracy: Math.round((this.consecutiveDetections / 10) * 100)
                    }});
                    
                    // Move to next step after feedback
                    setTimeout(() => {{
                        this.currentStep++;
                        console.log(`Moving to step ${{this.currentStep}}`);
                        this.startCurrentStep();
                    }}, 2000);
                }}
                
                showFeedback() {{
                    console.log('Step completed - sending success message to React Native');
                    
                    // Send success message to React Native for audio/visual feedback
                    this.notify('pose_success', {{
                        message: 'Pose completed successfully',
                        step: this.steps[this.currentStep].name,
                        step_index: this.currentStep,
                        timestamp: Date.now()
                    }});
                }}
                
                completeDemo() {{
                    if (this.demoCompleted) return;
                    
                    this.demoCompleted = true;
                    console.log('Image-guided demo session completed successfully!');
                    
                    this.poseStatus.textContent = "🎉 All poses completed successfully! 🎉";
                    this.poseStatus.className = 'pose-detected';
                    this.poseStatus.style.fontSize = "20px";
                    
                    // Hide image if still showing
                    this.poseImage.style.display = 'none';
                    
                    // Update performance display
                    this.stepDisplay.textContent = "Done!";
                    this.accuracyDisplay.textContent = "100%";
                    this.qualityText.textContent = "Perfect";
                    this.qualityDot.className = 'quality-dot quality-excellent';
                    
                    // Send completion success message to React Native
                    this.notify('demo_completion_success', {{
                        message: 'Demo completed successfully',
                        timestamp: Date.now()
                    }});
                    
                    // Stop camera processing
                    if (this.camera) {{
                        this.camera.stop();
                    }}
                    
                    this.notify('demo_complete', {{ 
                        steps_completed: this.completedSteps.length,
                        total_steps: this.steps.length,
                        completion_time: Date.now() - this.stepStartTime,
                        final_accuracy: 100
                    }});
                }}
            }}

            // Initialize demo when page loads
            document.addEventListener('DOMContentLoaded', () => {{
                console.log('Initializing image-guided pose detection demo');
                try {{
                    new ImageGuidedDemoController();
                }} catch (error) {{
                    console.error('Failed to initialize demo:', error);
                    document.getElementById('loadingText').textContent = 'Initialization Error';
                    document.getElementById('loadingSubtext').textContent = error.message;
                }}
            }});

            // Handle page visibility changes
            document.addEventListener('visibilitychange', () => {{
                if (document.hidden) {{
                    console.log('Page hidden - pausing demo');
                }} else {{
                    console.log('Page visible - resuming demo');
                }}
            }});

            // Error handling for MediaPipe loading
            window.addEventListener('error', (event) => {{
                console.error('Global error:', event.error);
                if (event.error && event.error.message.includes('MediaPipe')) {{
                    document.getElementById('loadingText').textContent = 'MediaPipe Loading Error';
                    document.getElementById('loadingSubtext').textContent = 'Please refresh the page';
                }}
            }});
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)