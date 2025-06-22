from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import mediapipe as mp
import cv2
import numpy as np
from PIL import Image
import io
import base64
from typing import List, Dict, Optional
import uvicorn

app = FastAPI(title="Pose Estimation API", version="1.0.0")

# Enable CORS for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# MediaPipe pose landmark indices
POSE_LANDMARKS = {
    0: "nose",
    1: "left_eye_inner", 2: "left_eye", 3: "left_eye_outer",
    4: "right_eye_inner", 5: "right_eye", 6: "right_eye_outer",
    7: "left_ear", 8: "right_ear",
    9: "mouth_left", 10: "mouth_right",
    11: "left_shoulder", 12: "right_shoulder",
    13: "left_elbow", 14: "right_elbow",
    15: "left_wrist", 16: "right_wrist",
    17: "left_pinky", 18: "right_pinky",
    19: "left_index", 20: "right_index",
    21: "left_thumb", 22: "right_thumb",
    23: "left_hip", 24: "right_hip",
    25: "left_knee", 26: "right_knee",
    27: "left_ankle", 28: "right_ankle",
    29: "left_heel", 30: "right_heel",
    31: "left_foot_index", 32: "right_foot_index"
}

class PoseEstimator:
    def __init__(self):
        self.pose = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            enable_segmentation=False,
            min_detection_confidence=0.5
        )
    
    def process_image(self, image_array: np.ndarray) -> Dict:
        """Process image and extract pose landmarks"""
        try:
            # Convert BGR to RGB (MediaPipe expects RGB)
            rgb_image = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
            
            # Process the image
            results = self.pose.process(rgb_image)
            
            if results.pose_landmarks:
                # Extract landmarks
                landmarks = []
                for idx, landmark in enumerate(results.pose_landmarks.landmark):
                    landmarks.append({
                        'id': idx,
                        'name': POSE_LANDMARKS.get(idx, f'landmark_{idx}'),
                        'x': landmark.x,
                        'y': landmark.y,
                        'z': landmark.z,
                        'visibility': landmark.visibility
                    })
                
                # Draw pose on image for visualization
                annotated_image = rgb_image.copy()
                mp_drawing.draw_landmarks(
                    annotated_image,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
                )
                
                # Convert annotated image to base64
                annotated_pil = Image.fromarray(annotated_image)
                buffer = io.BytesIO()
                annotated_pil.save(buffer, format='JPEG')
                annotated_b64 = base64.b64encode(buffer.getvalue()).decode()
                
                return {
                    'success': True,
                    'landmarks': landmarks,
                    'annotated_image': f"data:image/jpeg;base64,{annotated_b64}",
                    'pose_detected': True,
                    'landmark_count': len(landmarks)
                }
            else:
                return {
                    'success': False,
                    'landmarks': [],
                    'annotated_image': None,
                    'pose_detected': False,
                    'error': 'No pose detected in the image'
                }
                
        except Exception as e:
            return {
                'success': False,
                'landmarks': [],
                'annotated_image': None,
                'pose_detected': False,
                'error': f'Processing error: {str(e)}'
            }

# Initialize pose estimator
pose_estimator = PoseEstimator()

@app.get("/")
async def root():
    return {"message": "Pose Estimation API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pose-estimation"}

@app.post("/pose-estimation")
async def estimate_pose(image: UploadFile = File(...)):
    """
    Estimate pose from uploaded image
    
    Args:
        image: Uploaded image file
        
    Returns:
        JSON response with pose landmarks and annotated image
    """
    
    # Validate file type
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read image file
        contents = await image.read()
        
        # Convert to numpy array
        nparr = np.frombuffer(contents, np.uint8)
        cv_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if cv_image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Process image
        result = pose_estimator.process_image(cv_image)
        
        if result['success']:
            return JSONResponse(content=result)
        else:
            return JSONResponse(
                status_code=422,
                content=result
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/pose-estimation-batch")
async def estimate_pose_batch(images: List[UploadFile] = File(...)):
    """
    Process multiple images for pose estimation
    
    Args:
        images: List of uploaded image files
        
    Returns:
        JSON response with results for all images
    """
    
    if len(images) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed per batch")
    
    results = []
    
    for idx, image in enumerate(images):
        if not image.content_type.startswith('image/'):
            results.append({
                'index': idx,
                'filename': image.filename,
                'success': False,
                'error': 'Invalid file type'
            })
            continue
        
        try:
            contents = await image.read()
            nparr = np.frombuffer(contents, np.uint8)
            cv_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if cv_image is None:
                results.append({
                    'index': idx,
                    'filename': image.filename,
                    'success': False,
                    'error': 'Invalid image format'
                })
                continue
            
            result = pose_estimator.process_image(cv_image)
            result['index'] = idx
            result['filename'] = image.filename
            results.append(result)
            
        except Exception as e:
            results.append({
                'index': idx,
                'filename': image.filename,
                'success': False,
                'error': str(e)
            })
    
    return JSONResponse(content={
        'batch_results': results,
        'total_processed': len(results),
        'successful': len([r for r in results if r.get('success', False)])
    })

@app.get("/pose-landmarks-info")
async def get_pose_landmarks_info():
    """
    Get information about MediaPipe pose landmarks
    
    Returns:
        Dictionary with landmark indices and names
    """
    return {
        'landmarks': POSE_LANDMARKS,
        'total_landmarks': len(POSE_LANDMARKS),
        'connections': [
            {'name': 'LEFT_ARM', 'points': [11, 13, 15]},
            {'name': 'RIGHT_ARM', 'points': [12, 14, 16]},
            {'name': 'LEFT_LEG', 'points': [23, 25, 27]},
            {'name': 'RIGHT_LEG', 'points': [24, 26, 28]},
            {'name': 'TORSO', 'points': [11, 12, 23, 24]},
            {'name': 'FACE', 'points': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
        ]
    }

# Additional utility functions for pose analysis
def calculate_angle(p1: Dict, p2: Dict, p3: Dict) -> float:
    """Calculate angle between three points"""
    try:
        # Convert to numpy arrays
        a = np.array([p1['x'], p1['y']])
        b = np.array([p2['x'], p2['y']])
        c = np.array([p3['x'], p3['y']])
        
        # Calculate vectors
        ba = a - b
        bc = c - b
        
        # Calculate angle
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
        
        return np.degrees(angle)
    except:
        return 0.0

def calculate_distance(p1: Dict, p2: Dict) -> float:
    """Calculate Euclidean distance between two points"""
    try:
        return np.sqrt((p1['x'] - p2['x'])**2 + (p1['y'] - p2['y'])**2)
    except:
        return 0.0

@app.post("/pose-analysis")
async def analyze_pose(image: UploadFile = File(...)):
    """
    Advanced pose analysis with angles and measurements
    
    Args:
        image: Uploaded image file
        
    Returns:
        JSON response with detailed pose analysis
    """
    
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        cv_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if cv_image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        result = pose_estimator.process_image(cv_image)
        
        if not result['success']:
            return JSONResponse(status_code=422, content=result)
        
        landmarks = result['landmarks']
        landmark_dict = {lm['id']: lm for lm in landmarks}
        
        # Calculate joint angles
        angles = {}
        
        # Left arm angles
        if all(idx in landmark_dict for idx in [11, 13, 15]):  # shoulder, elbow, wrist
            angles['left_elbow'] = calculate_angle(
                landmark_dict[11], landmark_dict[13], landmark_dict[15]
            )
        
        # Right arm angles
        if all(idx in landmark_dict for idx in [12, 14, 16]):
            angles['right_elbow'] = calculate_angle(
                landmark_dict[12], landmark_dict[14], landmark_dict[16]
            )
        
        # Left leg angles
        if all(idx in landmark_dict for idx in [23, 25, 27]):  # hip, knee, ankle
            angles['left_knee'] = calculate_angle(
                landmark_dict[23], landmark_dict[25], landmark_dict[27]
            )
        
        # Right leg angles
        if all(idx in landmark_dict for idx in [24, 26, 28]):
            angles['right_knee'] = calculate_angle(
                landmark_dict[24], landmark_dict[26], landmark_dict[28]
            )
        
        # Body measurements (normalized distances)
        measurements = {}
        
        # Shoulder width
        if 11 in landmark_dict and 12 in landmark_dict:
            measurements['shoulder_width'] = calculate_distance(
                landmark_dict[11], landmark_dict[12]
            )
        
        # Hip width
        if 23 in landmark_dict and 24 in landmark_dict:
            measurements['hip_width'] = calculate_distance(
                landmark_dict[23], landmark_dict[24]
            )
        
        # Body height (approximate)
        if 0 in landmark_dict and 27 in landmark_dict and 28 in landmark_dict:
            left_ankle = landmark_dict[27]
            right_ankle = landmark_dict[28]
            avg_ankle_y = (left_ankle['y'] + right_ankle['y']) / 2
            measurements['body_height'] = abs(landmark_dict[0]['y'] - avg_ankle_y)
        
        # Pose classification
        pose_type = classify_pose(landmark_dict, angles)
        
        result.update({
            'angles': angles,
            'measurements': measurements,
            'pose_classification': pose_type,
            'analysis_complete': True
        })
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

def classify_pose(landmarks: Dict, angles: Dict) -> str:
    """
    Simple pose classification based on joint angles and positions
    """
    try:
        # T-pose detection
        if 'left_elbow' in angles and 'right_elbow' in angles:
            if angles['left_elbow'] > 160 and angles['right_elbow'] > 160:
                # Check if arms are horizontal
                if (11 in landmarks and 15 in landmarks and 
                    12 in landmarks and 16 in landmarks):
                    left_arm_horizontal = abs(landmarks[11]['y'] - landmarks[15]['y']) < 0.1
                    right_arm_horizontal = abs(landmarks[12]['y'] - landmarks[16]['y']) < 0.1
                    if left_arm_horizontal and right_arm_horizontal:
                        return "T-Pose"
        
        # Arms raised detection
        if (11 in landmarks and 15 in landmarks and 
            12 in landmarks and 16 in landmarks):
            if (landmarks[15]['y'] < landmarks[11]['y'] and 
                landmarks[16]['y'] < landmarks[12]['y']):
                return "Arms Raised"
        
        # Sitting detection
        if 'left_knee' in angles and 'right_knee' in angles:
            if angles['left_knee'] < 120 and angles['right_knee'] < 120:
                return "Sitting"
        
        # Standing detection
        if 'left_knee' in angles and 'right_knee' in angles:
            if angles['left_knee'] > 160 and angles['right_knee'] > 160:
                return "Standing"
        
        return "Unknown Pose"
        
    except Exception:
        return "Classification Error"

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

# Requirements.txt content (create this file separately):
"""
fastapi==0.104.1
uvicorn[standard]==0.24.0
mediapipe==0.10.7
opencv-python==4.8.1.78
Pillow==10.1.0
numpy==1.24.3
python-multipart==0.0.6
"""