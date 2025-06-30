from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json
import cv2
import numpy as np
import base64
import asyncio
from typing import Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor
import time
from pose_processor import pose, mp_pose

# Router for pose tracking endpoints
pose_tracking_router = APIRouter()

# Store active sessions for WebSocket tracking
active_sessions: Dict[str, Any] = {}

# Thread pool for CPU-intensive tasks
executor = ThreadPoolExecutor(max_workers=4)

# Performance monitoring
frame_times = []
MAX_FRAME_HISTORY = 30

def process_frame_cpu_intensive(img_data):
    """CPU-intensive frame processing in separate thread"""
    try:
        # Decode image
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return None
            
        # Don't resize - MediaPipe handles various resolutions well
        # This preserves the original aspect ratio
        
        # Process pose landmarks
        rgb_frame = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pose_results = pose.process(rgb_frame)
        
        return pose_results
    except Exception as e:
        print(f"Frame processing error: {e}")
        return None

@pose_tracking_router.get("/debug/test_message")
async def test_message():
    """Test endpoint to verify message formatting"""
    test_message = {
        "type": "info",
        "message": "Test message",
        "ready": True,
        "landmarks": [
            {
                "x": 0.5,
                "y": 0.5,
                "z": 0.0,
                "visibility": 0.9
            } for _ in range(33)
        ]
    }
    return test_message

@pose_tracking_router.get("/pose_tracker/tracking")
async def tracking_page(
    request: Request,
    token: str = None,
    width: Optional[float] = None,
    height: Optional[float] = None,
    skeleton: bool = True
):
    """Return optimized HTML page with camera access and WebSocket connection for live pose estimation."""
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
        <title>Live Pose Estimation</title>
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
                object-fit: contain;  /* Changed from cover to contain */
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
            <video id="videoElement" autoplay playsinline muted></video>
            <canvas id="canvasOverlay"></canvas>
            <div id="status">Initializing camera...</div>
            <div id="fpsCounter">FPS: --</div>
        </div>
        
        <script>
            const showSkeleton = {str(skeleton).lower()};
            const serverURL = "{scheme}://{host}";
            
            const video = document.getElementById('videoElement');
            const canvas = document.getElementById('canvasOverlay');
            const ctx = canvas.getContext('2d');
            const statusDiv = document.getElementById('status');
            const fpsCounter = document.getElementById('fpsCounter');
            const container = document.querySelector('.container');
            
            // Performance optimization variables
            let frameCount = 0;
            let lastFpsTime = performance.now();
            let lastFrameTime = 0;
            let processingFrame = false;
            
            // Original connections array for better skeleton
            const connections = [
                // Face
                [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
                // Arms
                [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
                [15, 17], [15, 19], [15, 21], [17, 19],
                [16, 18], [16, 20], [16, 22], [18, 20],
                // Torso
                [11, 23], [12, 24], [23, 24],
                // Legs
                [23, 25], [24, 26], [25, 27], [26, 28],
                [27, 29], [27, 31], [28, 30], [28, 32],
                [29, 31], [30, 32]
            ];
            
            function updateCanvasSize() {{
                const rect = container.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                console.log(`Canvas size: ${{canvas.width}}x${{canvas.height}}`);
            }}
            
            updateCanvasSize();
            window.addEventListener('resize', updateCanvasSize);
            
            let ws = null;
            let isConnected = false;
            let reconnectAttempts = 0;
            const MAX_RECONNECT_ATTEMPTS = 5;
            
            function sendMessageToReactNative(data) {{
                try {{
                    let messageData;
                    
                    if (typeof data === 'string') {{
                        messageData = data;
                    }} else if (typeof data === 'object' && data !== null) {{
                        messageData = JSON.stringify(data);
                    }} else {{
                        messageData = String(data);
                    }}
                    
                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {{
                        window.ReactNativeWebView.postMessage(messageData);
                    }} else if (window.postMessage) {{
                        window.postMessage(messageData, '*');
                    }}
                    
                    if (typeof window.webViewCallback === 'function') {{
                        try {{
                            window.webViewCallback(JSON.parse(messageData));
                        }} catch (e) {{
                            window.webViewCallback(data);
                        }}
                    }}
                }} catch (e) {{
                    console.error('Error sending message to React Native:', e);
                }}
            }}
            
            // Simplified drawing function
            function drawLandmarks(landmarks) {{
                if (!showSkeleton || !Array.isArray(landmarks)) return;
                
                try {{
                    // Clear canvas with transparent background
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (landmarks.length < 33) {{
                        console.warn('Insufficient landmarks for drawing');
                        return;
                    }}
                    
                    // Draw connections
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = 2;
                    
                    connections.forEach(([p1, p2]) => {{
                        const landmark1 = landmarks[p1];
                        const landmark2 = landmarks[p2];
                        
                        if (landmark1 && landmark2 && 
                            landmark1.visibility > 0.5 && landmark2.visibility > 0.5) {{
                            ctx.beginPath();
                            ctx.moveTo(landmark1.x * canvas.width, landmark1.y * canvas.height);
                            ctx.lineTo(landmark2.x * canvas.width, landmark2.y * canvas.height);
                            ctx.stroke();
                        }}
                    }});
                    
                    // Draw landmarks
                    landmarks.forEach((landmark, idx) => {{
                        if (landmark && landmark.visibility > 0.5) {{
                            ctx.fillStyle = idx < 11 ? '#FF6B6B' : '#4ECDC4';
                            ctx.beginPath();
                            ctx.arc(
                                landmark.x * canvas.width,
                                landmark.y * canvas.height,
                                idx < 11 ? 3 : 5,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                        }}
                    }});
                    
                    // Update FPS counter
                    frameCount++;
                    const now = performance.now();
                    if (now - lastFpsTime >= 1000) {{
                        fpsCounter.textContent = `FPS: ${{frameCount}}`;
                        frameCount = 0;
                        lastFpsTime = now;
                    }}
                }} catch (drawError) {{
                    console.error('Error drawing landmarks:', drawError);
                }}
            }}
            
            async function startCamera() {{
                try {{
                    updateStatus("Requesting camera permission...");
                    
                    const constraints = {{
                        video: {{ 
                            facingMode: 'user',
                            width: {{ ideal: 640, max: 1280 }},
                            height: {{ ideal: 480, max: 720 }},
                            frameRate: {{ ideal: 30 }}
                        }},
                        audio: false
                    }};
                    
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {{
                        throw new Error("Camera API not available. Please ensure camera permissions are granted.");
                    }}
                    
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    updateStatus("Camera connected!");
                    video.srcObject = stream;
                    
                    video.onloadedmetadata = () => {{
                        updateStatus("Camera ready, connecting to server...");
                        
                        video.onloadeddata = () => {{
                            updateCanvasSize();
                            console.log(`Video size: ${{video.videoWidth}}x${{video.videoHeight}}`);
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
                
                updateStatus(`Connecting to WebSocket...`);
                
                if (ws) {{
                    ws.close();
                }}
                
                try {{
                    ws = new WebSocket(wsUrl);
                    
                    ws.onopen = () => {{
                        updateStatus("Live pose estimation active");
                        isConnected = true;
                        reconnectAttempts = 0;
                        
                        // Start sending frames
                        requestAnimationFrame(sendFrame);
                        
                        sendMessageToReactNative({{
                            type: 'status',
                            status: 'connected'
                        }});
                    }};
                    
                    ws.onclose = (event) => {{
                        isConnected = false;
                        updateStatus(`Connection lost (code: ${{event.code}})`);
                        
                        sendMessageToReactNative({{
                            type: 'status',
                            status: 'disconnected',
                            code: event.code
                        }});
                        
                        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {{
                            reconnectAttempts++;
                            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                            updateStatus(`Reconnecting in ${{delay/1000}} seconds...`);
                            
                            setTimeout(() => {{
                                if (!isConnected) connectWebSocket();
                            }}, delay);
                        }} else {{
                            updateStatus("Failed to connect. Please reload the page.");
                        }}
                    }};
                    
                    ws.onerror = (error) => {{
                        console.error('WebSocket error:', error);
                        updateStatus("WebSocket error occurred");
                    }};
                    
                    ws.onmessage = (event) => {{
                        try {{
                            const data = JSON.parse(event.data);
                            
                            if (!data || typeof data !== 'object') {{
                                console.warn('Invalid data received from server');
                                return;
                            }}
                            
                            if (data.type === 'pose_data') {{
                                updateStatus("Pose detected");
                                sendMessageToReactNative(data);
                            }} else if (data.type === 'info') {{
                                const message = data.message || "Pose estimation running";
                                updateStatus(message);
                                sendMessageToReactNative(data);
                            }} else if (data.type === 'error') {{
                                const errorMessage = data.message || "Unknown error";
                                updateStatus(`Error: ${{errorMessage}}`);
                                sendMessageToReactNative(data);
                            }} else if (data.type === 'pong') {{
                                console.log('Received pong');
                            }}
                            
                            // Draw landmarks if available and skeleton is enabled
                            if (data.landmarks && Array.isArray(data.landmarks) && showSkeleton) {{
                                drawLandmarks(data.landmarks);
                            }}
                            
                            processingFrame = false;
                            
                        }} catch (e) {{
                            console.error('Error processing server message:', e);
                            processingFrame = false;
                            
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
                }}
            }}
            
            // Optimized frame sending
            function sendFrame() {{
                if (!isConnected || !video.videoWidth) {{
                    if (isConnected) {{
                        requestAnimationFrame(sendFrame);
                    }}
                    return;
                }}
                
                const now = performance.now();
                
                // Target 20 FPS (50ms between frames)
                if (!processingFrame && now - lastFrameTime >= 50) {{
                    try {{
                        const tempCanvas = document.createElement('canvas');
                        const tempCtx = tempCanvas.getContext('2d');
                        
                        // Capture at standard resolution, let CSS handle aspect ratio
                        tempCanvas.width = 320;
                        tempCanvas.height = 240;
                        
                        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                        
                        // Medium quality for balance
                        const imageData = tempCanvas.toDataURL('image/jpeg', 0.7);
                        const base64Data = imageData.split(',')[1];
                        
                        if (ws && ws.readyState === WebSocket.OPEN) {{
                            ws.send(JSON.stringify({{
                                frame: base64Data
                            }}));
                            processingFrame = true;
                            lastFrameTime = now;
                        }}
                    }} catch (e) {{
                        console.error('Error capturing frame:', e);
                        processingFrame = false;
                    }}
                }}
                
                requestAnimationFrame(sendFrame);
            }}
            
            // Start everything
            if (document.readyState === 'complete' || document.readyState === 'interactive') {{
                setTimeout(startCamera, 100);
            }} else {{
                document.addEventListener('DOMContentLoaded', startCamera);
            }}
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)

@pose_tracking_router.websocket("/ws/pose_tracking")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time pose estimation"""
    session_id = f"session_{id(websocket)}"
    active_sessions[session_id] = {"connected": True, "last_processed": 0}
    
    try:
        await websocket.accept()
        
        # Send initial connection message
        initial_message = {
            "type": "info",
            "message": "Live pose estimation connected",
            "ready": True
        }
        await websocket.send_json(initial_message)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                frame_data = json.loads(data)
            except json.JSONDecodeError as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Invalid JSON received: {str(e)}"
                })
                continue
            
            if frame_data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue
                
            if "frame" not in frame_data:
                await websocket.send_json({
                    "type": "error",
                    "message": "No frame data received"
                })
                continue
            
            # Simple rate limiting
            current_time = time.time()
            session = active_sessions.get(session_id, {})
            if current_time - session.get("last_processed", 0) < 0.05:  # 20 FPS max
                continue
                
            try:
                # Decode frame data
                img_data = base64.b64decode(frame_data["frame"])
                
                # Process frame in thread pool
                loop = asyncio.get_event_loop()
                pose_results = await loop.run_in_executor(executor, process_frame_cpu_intensive, img_data)
                
                # Update last processed time
                active_sessions[session_id]["last_processed"] = current_time
                
                if pose_results is None:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Could not process image"
                    })
                    continue
                
                result = {
                    "type": "pose_data",
                    "message": "Pose data available"
                }
                
                if pose_results and pose_results.pose_landmarks:
                    try:
                        landmarks = []
                        for idx, landmark in enumerate(pose_results.pose_landmarks.landmark):
                            if hasattr(landmark, 'x') and hasattr(landmark, 'y') and hasattr(landmark, 'visibility'):
                                landmarks.append({
                                    "x": float(landmark.x),
                                    "y": float(landmark.y),
                                    "z": float(getattr(landmark, 'z', 0.0)),
                                    "visibility": float(landmark.visibility)
                                })
                            else:
                                landmarks.append({
                                    "x": 0.0,
                                    "y": 0.0,
                                    "z": 0.0,
                                    "visibility": 0.0
                                })
                        
                        if len(landmarks) >= 33:
                            result["landmarks"] = landmarks
                            result["pose_detected"] = True
                        else:
                            result["pose_detected"] = False
                            result["message"] = "Incomplete pose data"
                    except Exception as landmark_error:
                        print(f"Error processing landmarks: {landmark_error}")
                        result["pose_detected"] = False
                        result["message"] = "Error processing pose landmarks"
                else:
                    result["pose_detected"] = False
                    result["message"] = "No pose detected"
                
                # Send the result
                await websocket.send_json(result)
                
            except Exception as processing_error:
                error_message = {
                    "type": "error",
                    "message": f"Processing error: {str(processing_error)}"
                }
                await websocket.send_json(error_message)
                print(f"Processing error: {processing_error}")
                
    except WebSocketDisconnect:
        if session_id in active_sessions:
            del active_sessions[session_id]
        print(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        if session_id in active_sessions:
            del active_sessions[session_id]