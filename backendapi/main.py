from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json
import cv2
import numpy as np
import base64
import mediapipe as mp
import uvicorn
import os
import shutil
import uuid
import socket
from dotenv import load_dotenv
from typing import Dict, Optional, Any, List, Tuple
import asyncio

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Pose Tracker and Comparison API")

# Add CORS middleware to allow React Native WebView and frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create uploads directory
os.makedirs("uploads", exist_ok=True)

# Get server URL
SERVER_URL = os.getenv("SERVER_URL")
if not SERVER_URL:
    def get_local_ip():
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "localhost"
    SERVER_URL = f"http://{get_local_ip()}:8000"
    print(f"Using dynamically detected SERVER_URL: {SERVER_URL}")

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=0,
    smooth_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Store active sessions for WebSocket tracking
active_sessions: Dict[str, Any] = {}

class PoseTracker:
    def __init__(self):
        self.rep_count = 0
        self.is_down = False
        self.ready_position = False
        self.posture_direction = "center"
        self.last_frame_time = 0
        
    def reset(self):
        self.rep_count = 0
        self.is_down = False
        self.ready_position = False
        
    def process_frame(self, frame):
        """Process a frame and return pose data"""
        height, width = frame.shape[:2]
        if height > 240:
            scale_factor = 240 / height
            frame = cv2.resize(frame, (int(width * scale_factor), 240))
            
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)
        
        if not results.pose_landmarks:
            return {
                "type": "info",
                "ready": False,
                "postureDirection": "not detected",
            }
        
        ready, direction = self._check_positioning(results.pose_landmarks)
        
        if ready:
            return self._track_exercise(results.pose_landmarks)
        else:
            return {
                "type": "info",
                "ready": False,
                "postureDirection": direction
            }
    
    def _check_positioning(self, landmarks):
        """Check if person is positioned correctly in frame"""
        hip = landmarks.landmark[mp_pose.PoseLandmark.LEFT_HIP]
        shoulder = landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
        
        if hip.visibility < 0.5:
            return False, "move closer"
            
        if hip.x < 0.3:
            return False, "right"
        elif hip.x > 0.7:
            return False, "left"
            
        self.ready_position = True
        return True, "center"
    
    def _track_exercise(self, landmarks):
        """Track the exercise and count reps"""
        hip = landmarks.landmark[mp_pose.PoseLandmark.LEFT_HIP]
        knee = landmarks.landmark[mp_pose.PoseLandmark.LEFT_KNEE]
        ankle = landmarks.landmark[mp_pose.PoseLandmark.LEFT_ANKLE]
        
        knee_angle = self._calculate_angle(
            (hip.x, hip.y),
            (knee.x, knee.y),
            (ankle.x, ankle.y)
        )
        
        if knee_angle < 110 and not self.is_down:
            self.is_down = True
        elif knee_angle > 160 and self.is_down:
            self.is_down = False
            self.rep_count += 1
            
        return {
            "type": "counter",
            "current_count": self.rep_count,
            "ready": True
        }
    
    def _calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        
        if angle > 180.0:
            angle = 360 - angle
            
        return angle

def process_video(video_path: str, output_path: str) -> List[List[dict]]:
    """
    Process a video to extract pose landmarks and save a new video with landmarks drawn.
    Returns a list of frames, each containing a list of landmark dictionaries.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    landmarks_per_frame = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2, circle_radius=2),
                mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=2)
            )

            landmarks = [
                {
                    'x': lm.x * width,
                    'y': lm.y * height,
                    'z': lm.z * width,
                    'visibility': lm.visibility
                } for lm in results.pose_landmarks.landmark
            ]
            landmarks_per_frame.append(landmarks)
        else:
            landmarks_per_frame.append([])

        out.write(frame)

    cap.release()
    out.release()
    return landmarks_per_frame

def compute_similarity(landmarks1: List[List[dict]], landmarks2: List[List[dict]]) -> float:
    """
    Compute similarity as 1 minus normalized Euclidean distance between landmark positions.
    Ensures low similarity (close to 0) for dissimilar poses.
    """
    if not landmarks1 or not landmarks2:
        return 0.0

    distances = []
    min_frames = min(len(landmarks1), len(landmarks2))
    key_joints = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

    for i in range(min_frames):
        if landmarks1[i] and landmarks2[i]:
            frame_dist = 0.0
            count = 0
            for idx in key_joints:
                lm1 = landmarks1[i][idx]
                lm2 = landmarks2[i][idx]
                if lm1['visibility'] > 0.5 and lm2['visibility'] > 0.5:
                    dist = np.sqrt(
                        (lm1['x'] - lm2['x'])**2 +
                        (lm1['y'] - lm2['y'])**2 +
                        (lm1['z'] - lm2['z'])**2
                    )
                    frame_dist += dist
                    count += 1
            if count > 0:
                body_size = max(
                    np.sqrt(
                        (landmarks1[i][11]['x'] - landmarks1[i][23]['x'])**2 +
                        (landmarks1[i][11]['y'] - landmarks1[i][23]['y'])**2
                    ) if landmarks1[i][11]['visibility'] > 0.5 and landmarks1[i][23]['visibility'] > 0.5 else 1.0,
                    1.0
                )
                normalized_dist = (frame_dist / count) / body_size
                distances.append(1.0 - min(normalized_dist, 1.0))
    
    return np.mean(distances) * 100 if distances else 0.0

def compute_smoothness(landmarks_per_frame: List[List[dict]]) -> float:
    """
    Compute smoothness as the inverse of velocity variance for key joints.
    """
    if len(landmarks_per_frame) < 2:
        return 0.0
    velocities = []
    key_joints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
    for i in range(1, len(landmarks_per_frame)):
        if landmarks_per_frame[i] and landmarks_per_frame[i-1]:
            frame_vel = 0.0
            count = 0
            for idx in key_joints:
                lm1 = landmarks_per_frame[i][idx]
                lm2 = landmarks_per_frame[i-1][idx]
                if lm1['visibility'] > 0.5 and lm2['visibility'] > 0.5:
                    dx = lm1['x'] - lm2['x']
                    dy = lm1['y'] - lm2['y']
                    dz = lm1['z'] - lm2['z']
                    velocity = np.sqrt(dx**2 + dy**2 + dz**2)
                    frame_vel += velocity
                    count += 1
            if count > 0:
                velocities.append(frame_vel / count)
    
    if not velocities:
        return 0.0
    variance = np.var(velocities)
    normalized_variance = min(variance / 100.0, 1.0)
    return (1.0 - normalized_variance) * 100

def compute_speed(landmarks_per_frame: List[List[dict]], fps: float) -> float:
    """
    Compute speed as average keypoint displacement per second, normalized to human movement range.
    """
    if len(landmarks_per_frame) < 2:
        return 0.0
    displacements = []
    key_joints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
    for i in range(1, len(landmarks_per_frame)):
        if landmarks_per_frame[i] and landmarks_per_frame[i-1]:
            frame_dist = 0.0
            count = 0
            for idx in key_joints:
                lm1 = landmarks_per_frame[i][idx]
                lm2 = landmarks_per_frame[i-1][idx]
                if lm1['visibility'] > 0.5 and lm2['visibility'] > 0.5:
                    dist = np.sqrt(
                        (lm1['x'] - lm2['x'])**2 +
                        (lm1['y'] - lm2['y'])**2 +
                        (lm1['z'] - lm2['z'])**2
                    )
                    frame_dist += dist
                    count += 1
            if count > 0:
                displacements.append((frame_dist / count) * fps)
    
    if not displacements:
        return 0.0
    avg_speed = np.mean(displacements)
    return min(avg_speed / 10.0, 100.0)

def compute_cohesion(landmarks_per_frame: List[List[dict]]) -> float:
    """
    Compute cohesion as the inverse of variance of keypoint distances from body center.
    """
    if not landmarks_per_frame:
        return 0.0
    variances = []
    key_joints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
    for landmarks in landmarks_per_frame:
        if landmarks:
            valid_landmarks = [lm for idx, lm in enumerate(landmarks) if idx in [11, 12, 23, 24] and lm['visibility'] > 0.5]
            if valid_landmarks:
                center_x = np.mean([lm['x'] for lm in valid_landmarks])
                center_y = np.mean([lm['y'] for lm in valid_landmarks])
                distances = []
                for idx in key_joints:
                    lm = landmarks[idx]
                    if lm['visibility'] > 0.5:
                        dist = np.sqrt((lm['x'] - center_x)**2 + (lm['y'] - center_y)**2)
                        distances.append(dist)
                if distances:
                    variances.append(np.var(distances))
    
    if not variances:
        return 0.0
    avg_variance = np.mean(variances)
    normalized_variance = min(avg_variance / 1000.0, 1.0)
    return (1.0 - normalized_variance) * 100

def compute_accuracy(landmarks_per_frame: List[List[dict]], reference_landmarks: List[List[dict]]) -> float:
    """
    Compute accuracy as the average similarity to the reference (past) video's poses.
    """
    if not landmarks_per_frame or not reference_landmarks:
        return 0.0
    similarities = []
    min_frames = min(len(landmarks_per_frame), len(reference_landmarks))
    key_joints = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
    
    for i in range(min_frames):
        if landmarks_per_frame[i] and reference_landmarks[i]:
            frame_dist = 0.0
            count = 0
            for idx in key_joints:
                lm1 = landmarks_per_frame[i][idx]
                lm2 = reference_landmarks[i][idx]
                if lm1['visibility'] > 0.5 and lm2['visibility'] > 0.5:
                    dist = np.sqrt(
                        (lm1['x'] - lm2['x'])**2 +
                        (lm1['y'] - lm2['y'])**2 +
                        (lm1['z'] - lm2['z'])**2
                    )
                    frame_dist += dist
                    count += 1
            if count > 0:
                body_size = max(
                    np.sqrt(
                        (landmarks_per_frame[i][11]['x'] - landmarks_per_frame[i][23]['x'])**2 +
                        (landmarks_per_frame[i][11]['y'] - landmarks_per_frame[i][23]['y'])**2
                    ) if landmarks_per_frame[i][11]['visibility'] > 0.5 and landmarks_per_frame[i][23]['visibility'] > 0.5 else 1.0,
                    1.0
                )
                normalized_dist = (frame_dist / count) / body_size
                similarities.append(1.0 - min(normalized_dist, 1.0))
    
    return np.mean(similarities) * 100 if similarities else 0.0

def detect_improvements_regressions(past_metrics: dict, new_metrics: dict) -> Tuple[int, int]:
    """
    Detect improvements and regressions based on significant metric differences.
    """
    improvements = 0
    regressions = 0
    threshold = 5.0
    for key in ['similarity', 'smoothness', 'speed', 'cohesion', 'accuracy']:
        diff = new_metrics[key] - past_metrics.get(key, 0)
        if diff > threshold:
            improvements += 1
        elif diff < -threshold:
            regressions += 1
    return improvements, regressions

@app.get("/")
async def root():
    return {"message": "Pose Tracker and Comparison API is running"}

@app.get("/pose_tracker/tracking")
async def tracking_page(
    request: Request,
    token: str = None,
    exercise: str = "squat",
    difficulty: str = "easy",
    width: Optional[float] = None,
    height: Optional[float] = None,
    skeleton: bool = True
):
    """Return HTML page with camera access and WebSocket connection."""
    if width and height:
        aspect_ratio = 19/6
        if width/height > aspect_ratio:
            width_val = height * aspect_ratio
            height_val = height
        else:
            width_val = width
            height_val = width / aspect_ratio
    else:
        width_val = 360
        height_val = 360 * (19/6)
    
    host = request.headers.get("host", "localhost:8000")
    scheme = request.headers.get("x-forwarded-proto", "http")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Pose Tracker</title>
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
                object-fit: cover;
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
            }}
            #status {{
                position: absolute;
                bottom: 10px;
                left: 10px;
                background-color: rgba(0,0,0,0.5);
                color: white;
                padding: 5px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                z-index: 100;
            }}
            #fpsCounter {{
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: rgba(0,0,0,0.5);
                color: white;
                padding: 3px;
                border-radius: 3px;
                font-family: monospace;
                font-size: 12px;
                z-index: 100;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <video id="videoElement" autoplay playsinline></video>
            <canvas id="canvasOverlay"></canvas>
            <div id="status">Initializing camera...</div>
            <div id="fpsCounter">FPS: --</div>
        </div>
        
        <script>
            const exercise = "{exercise}";
            const difficulty = "{difficulty}";
            const showSkeleton = {str(skeleton).lower()};
            const serverURL = "{scheme}://{host}";
            
            const video = document.getElementById('videoElement');
            const canvas = document.getElementById('canvasOverlay');
            const ctx = canvas.getContext('2d');
            const statusDiv = document.getElementById('status');
            const fpsCounter = document.getElementById('fpsCounter');
            const container = document.querySelector('.container');
            
            let frameCount = 0;
            let lastFpsTime = Date.now();
            let lastFrameTime = 0;
            let processingPending = false;
            
            function updateCanvasSize() {{
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
                console.log(`Canvas size updated to: ${{canvas.width}}x${{canvas.height}}`);
            }}
            
            updateCanvasSize();
            window.addEventListener('resize', updateCanvasSize);
            
            let ws = null;
            let isConnected = false;
            let reconnectAttempts = 0;
            const MAX_RECONNECT_ATTEMPTS = 5;
            
            const connections = [
                [11, 12], [12, 24], [24, 23], [23, 11],
                [12, 14], [14, 16],
                [11, 13], [13, 15],
                [24, 26], [26, 28], [28, 32], [32, 30], [30, 28],
                [23, 25], [25, 27], [27, 31], [31, 29], [29, 27]
            ];
            
            function sendMessageToReactNative(data) {{
                try {{
                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {{
                        window.ReactNativeWebView.postMessage(JSON.stringify(data));
                    }} else {{
                        window.postMessage(JSON.stringify(data), '*');
                        if (typeof window.webViewCallback === 'function') {{
                            window.webViewCallback(data);
                        }}
                    }}
                }} catch (e) {{
                    console.error('Error sending message:', e);
                }}
            }}
            
            function drawLandmarks(landmarks) {{
                if (!showSkeleton) return;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'cyan';
                ctx.fillStyle = 'yellow';
                
                ctx.beginPath();
                
                for (const [p1, p2] of connections) {{
                    const landmark1 = landmarks[p1];
                    const landmark2 = landmarks[p2];
                    
                    if (landmark1.visibility < 0.5 || landmark2.visibility < 0.5) continue;
                    
                    ctx.moveTo(landmark1.x * canvas.width, landmark1.y * canvas.height);
                    ctx.lineTo(landmark2.x * canvas.width, landmark2.y * canvas.height);
                }}
                
                ctx.stroke();
                
                ctx.beginPath();
                
                landmarks.forEach(landmark => {{
                    if (landmark.visibility < 0.5) return;
                    
                    ctx.moveTo(landmark.x * canvas.width, landmark.y * canvas.height);
                    ctx.arc(
                        landmark.x * canvas.width,
                        landmark.y * canvas.height,
                        5,
                        0,
                        2 * Math.PI
                    );
                }});
                
                ctx.fill();
                
                frameCount++;
                const now = Date.now();
                if (now - lastFpsTime >= 1000) {{
                    fpsCounter.textContent = `FPS: ${{frameCount}}`;
                    frameCount = 0;
                    lastFpsTime = now;
                }}
            }}
            
            async function startCamera() {{
                try {{
                    updateStatus("Requesting camera permission...");
                    
                    const constraints = {{
                        video: {{ 
                            facingMode: 'user',
                            width: {{ ideal: {width_val} }},
                            height: {{ ideal: {height_val} }},
                            aspectRatio: {{ ideal: 6/19 }},
                            frameRate: {{ ideal: 30, max: 30 }}
                        }},
                        audio: false
                    }};
                    
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {{
                        if (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) ||
                            /Android.*Version\\/[\\d.]+\\s+Mobile\\s+Safari/i.test(navigator.userAgent)) {{
                            throw new Error("Camera API not available in this WebView context. Please ensure camera permissions are granted in the app.");
                        }} else {{
                            throw new Error("Camera API not available. Try using HTTPS.");
                        }}
                    }}
                    
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    updateStatus("Camera connected!");
                    video.srcObject = stream;
                    
                    video.onloadedmetadata = () => {{
                        updateStatus("Camera ready, connecting to server...");
                        
                        video.onloadeddata = () => {{
                            updateCanvasSize();
                            console.log(`Video dimensions: ${{video.videoWidth}}x${{video.videoHeight}}`);
                        }};
                        
                        connectWebSocket();
                    }};
                }} catch (err) {{
                    console.error('Camera error:', err);
                    updateStatus(`Camera error: ${{err.message}}`);
                    
                    sendMessageToReactNative({{
                        type: 'error',
                        message: `Camera error: ${{err.message}}`,
                        details: err.toString()
                    }});
                }}
            }}
            
            function updateStatus(message) {{
                statusDiv.textContent = message;
                console.log(message);
                
                sendMessageToReactNative({{
                    type: 'status',
                    message: message
                }});
            }}
            
            function connectWebSocket() {{
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${{protocol}}//${{window.location.host}}/ws/pose_tracking`;
                
                updateStatus(`Connecting to WebSocket at ${{wsUrl}}...`);
                
                if (ws) {{
                    ws.close();
                }}
                
                try {{
                    ws = new WebSocket(wsUrl);
                    
                    ws.onopen = () => {{
                        updateStatus("WebSocket connected! Starting tracking...");
                        isConnected = true;
                        reconnectAttempts = 0;
                        
                        requestAnimationFrame(monitorVideoFrame);
                        
                        sendMessageToReactNative({{
                            type: 'status',
                            status: 'connected'
                        }});
                    }};
                    
                    ws.onclose = (event) => {{
                        isConnected = false;
                        updateStatus(`WebSocket disconnected (code: ${{event.code}})`);
                        
                        sendMessageToReactNative({{
                            type: 'status',
                            status: 'disconnected',
                            code: event.code
                        }});
                        
                        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {{
                            reconnectAttempts++;
                            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                            updateStatus(`Reconnecting in ${{delay/1000}} seconds... (attempt ${{reconnectAttempts}})`);
                            
                            setTimeout(() => {{
                                if (!isConnected) connectWebSocket();
                            }}, delay);
                        }} else {{
                            updateStatus("Failed to connect. Please reload the page.");
                            sendMessageToReactNative({{
                                type: 'error',
                                message: 'Maximum reconnection attempts reached'
                            }});
                        }}
                    }};
                    
                    ws.onerror = (error) => {{
                        console.error('WebSocket error:', error);
                        updateStatus("WebSocket error occurred");
                        
                        sendMessageToReactNative({{
                            type: 'error',
                            message: 'WebSocket connection error',
                            details: 'Connection failed or was rejected by the server'
                        }});
                    }};
                    
                    ws.onmessage = (event) => {{
                        try {{
                            const data = JSON.parse(event.data);
                            
                            if (data.type === 'counter') {{
                                updateStatus(`Reps: ${{data.current_count}}`);
                                sendMessageToReactNative(data);
                            }} else if (data.type === 'info') {{
                                updateStatus(`Position: ${{data.postureDirection}}`);
                                sendMessageToReactNative(data);
                            }} else if (data.type === 'error') {{
                                updateStatus(`Error: ${{data.message}}`);
                                sendMessageToReactNative(data);
                            }}
                            
                            if (data.landmarks && showSkeleton) {{
                                drawLandmarks(data.landmarks);
                            }}
                            
                            processingPending = false;
                            
                        }} catch (e) {{
                            console.error('Error processing message:', e);
                            processingPending = false;
                            sendMessageToReactNative({{
                                type: 'error',
                                message: 'Error processing server message',
                                details: e.toString()
                            }});
                        }}
                    }};
                }} catch (err) {{
                    console.error('WebSocket initialization error:', err);
                    updateStatus(`WebSocket creation error: ${{err.message}}`);
                    
                    sendMessageToReactNative({{
                        type: 'error',
                        message: 'Failed to initialize WebSocket',
                        details: err.toString()
                    }});
                    
                    setTimeout(() => {{
                        if (!isConnected && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {{
                            reconnectAttempts++;
                            connectWebSocket();
                        }}
                    }}, 3000);
                }}
            }}
            
            function monitorVideoFrame() {{
                if (!isConnected || !video.videoWidth) {{
                    requestAnimationFrame(monitorVideoFrame);
                    return;
                }}
                
                if (!processingPending) {{
                    const now = Date.now();
                    
                    if (now - lastFrameTime >= 33) {{
                        captureAndSendFrame();
                        lastFrameTime = now;
                    }}
                }}
                
                requestAnimationFrame(monitorVideoFrame);
            }}
            
            function captureAndSendFrame() {{
                try {{
                    const captureCanvas = document.createElement('canvas');
                    const captureCtx = captureCanvas.getContext('2d');
                    
                    captureCanvas.width = 240;
                    captureCanvas.height = 240 * (19/6);
                    
                    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
                    
                    const imageData = captureCanvas.toDataURL('image/jpeg', 0.6);
                    const base64Data = imageData.split(',')[1];
                    
                    if (ws && ws.readyState === WebSocket.OPEN) {{
                        ws.send(JSON.stringify({{
                            frame: base64Data
                        }}));
                        processingPending = true;
                    }}
                }} catch (e) {{
                    console.error('Error capturing frame:', e);
                    processingPending = false;
                    
                    sendMessageToReactNative({{
                        type: 'error',
                        message: 'Error capturing video frame',
                        details: e.toString()
                    }});
                }}
            }}
            
            function startPingInterval() {{
                setInterval(() => {{
                    if (ws && ws.readyState === WebSocket.OPEN && !processingPending) {{
                        ws.send(JSON.stringify({{ type: 'ping' }}));
                    }}
                }}, 30000);
            }}
            
            if (document.readyState === 'complete' || document.readyState === 'interactive') {{
                setTimeout(startCamera, 100);
                startPingInterval();
            }} else {{
                document.addEventListener('DOMContentLoaded', () => {{
                    startCamera();
                    startPingInterval();
                }});
            }}
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)

@app.websocket("/ws/pose_tracking")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time pose tracking"""
    session_id = f"session_{id(websocket)}"
    tracker = PoseTracker()
    active_sessions[session_id] = tracker
    
    try:
        await websocket.accept()
        
        await websocket.send_json({
            "type": "info",
            "message": "WebSocket connection established",
            "ready": False,
            "postureDirection": "waiting"
        })
        
        while True:
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            if frame_data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
                
            if "frame" not in frame_data:
                await websocket.send_json({
                    "type": "error",
                    "message": "No frame data received"
                })
                continue
                
            try:
                img_data = base64.b64decode(frame_data["frame"])
                nparr = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img is None:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Could not decode image"
                    })
                    continue
                
                result = tracker.process_frame(img)
                
                rgb_frame = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                pose_results = pose.process(rgb_frame)
                
                if pose_results and pose_results.pose_landmarks:
                    landmarks = []
                    for idx, landmark in enumerate(pose_results.pose_landmarks.landmark):
                        landmarks.append({
                            "x": landmark.x,
                            "y": landmark.y,
                            "z": landmark.z,
                            "visibility": landmark.visibility
                        })
                    result["landmarks"] = landmarks
                
                await websocket.send_json(result)
                
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Processing error: {str(e)}"
                })
                
    except WebSocketDisconnect:
        if session_id in active_sessions:
            del active_sessions[session_id]
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        if session_id in active_sessions:
            del active_sessions[session_id]

@app.post("/uploads")
async def upload_video(file: UploadFile = File(...)):
    try:
        file_extension = file.filename.split(".")[-1].lower()
        if file_extension not in ["mp4", "mov", "avi"]:
            raise HTTPException(status_code=400, detail="Unsupported file format. Only .mp4, .mov, .avi are allowed.")
        
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join("uploads", unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_url = f"{SERVER_URL}/uploads/{unique_filename}"
        return {"filename": unique_filename, "url": file_url}
    
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while uploading the file: {str(e)}")

@app.post("/compare")
async def compare_videos(
    past_video_url: str = Form(...),
    new_video_url: str = Form(...)
):
    try:
        for url in [past_video_url, new_video_url]:
            if not url.startswith(f"{SERVER_URL}/uploads/"):
                raise HTTPException(status_code=400, detail=f"Invalid video URL: {url}")
            filename = url.split("/")[-1]
            file_path = os.path.join("uploads", filename)
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail=f"Video file not found: {filename}")

        past_filename = past_video_url.split("/")[-1]
        new_filename = new_video_url.split("/")[-1]
        past_file_path = os.path.join("uploads", past_filename)
        new_file_path = os.path.join("uploads", new_filename)

        past_output_filename = f"processed_{uuid.uuid4()}_{past_filename}"
        new_output_filename = f"processed_{uuid.uuid4()}_{new_filename}"
        past_output_path = os.path.join("uploads", past_output_filename)
        new_output_path = os.path.join("uploads", new_output_filename)

        past_landmarks = process_video(past_file_path, past_output_path)
        new_landmarks = process_video(new_file_path, new_output_path)

        cap = cv2.VideoCapture(past_file_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        cap.release()

        past_metrics = {
            'smoothness': compute_smoothness(past_landmarks),
            'speed': compute_speed(past_landmarks, fps),
            'cohesion': compute_cohesion(past_landmarks),
            'accuracy': compute_accuracy(past_landmarks, past_landmarks)
        }

        new_metrics = {
            'smoothness': compute_smoothness(new_landmarks),
            'speed': compute_speed(new_landmarks, fps),
            'cohesion': compute_cohesion(new_landmarks),
            'accuracy': compute_accuracy(new_landmarks, past_landmarks)
        }

        similarity = compute_similarity(past_landmarks, new_landmarks)
        new_metrics['similarity'] = similarity

        improvements, regressions = detect_improvements_regressions(past_metrics, new_metrics)

        response = {
            "similarity": round(min(max(similarity, 0), 100), 2),
            "smoothness": round(min(max(new_metrics['smoothness'], 0), 100), 2),
            "speed": round(min(max(new_metrics['speed'], 0), 100), 2),
            "cohesion": round(min(max(new_metrics['cohesion'], 0), 100), 2),
            "accuracy": round(min(max(new_metrics['accuracy'], 0), 100), 2),
            "improvements": improvements,
            "regressions": regressions,
            "past_video_url": f"{SERVER_URL}/uploads/{past_output_filename}",
            "new_video_url": f"{SERVER_URL}/uploads/{new_output_filename}"
        }

        return JSONResponse(content=response)

    except Exception as e:
        print(f"Error in compare_videos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred during comparison: {str(e)}")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, workers=4, reload=False)