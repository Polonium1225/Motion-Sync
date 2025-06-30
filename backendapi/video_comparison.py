from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import os
import shutil
import uuid
from typing import List, Tuple
from pose_processor import pose, mp_pose, mp_drawing

# Router for video comparison endpoints
video_comparison_router = APIRouter()

# Get server URL from environment or use default
# Update this to use your ngrok URL for consistency
SERVER_URL = os.getenv("SERVER_URL", "https://fc11-196-75-83-156.ngrok-free.app")

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
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        print(f"Processing frame {frame_count}")
        
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            # Draw landmarks on the frame
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=3, circle_radius=3),  # Green landmarks
                mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)  # Red connections
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
    print(f"Processed video saved to: {output_path}")
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
                if idx < len(landmarks1[i]) and idx < len(landmarks2[i]):
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
                # Calculate body size for normalization
                if (landmarks1[i] and len(landmarks1[i]) > 23 and 
                    landmarks1[i][11]['visibility'] > 0.5 and landmarks1[i][23]['visibility'] > 0.5):
                    body_size = max(
                        np.sqrt(
                            (landmarks1[i][11]['x'] - landmarks1[i][23]['x'])**2 +
                            (landmarks1[i][11]['y'] - landmarks1[i][23]['y'])**2
                        ),
                        1.0
                    )
                else:
                    body_size = 1.0
                
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
                if (idx < len(landmarks_per_frame[i]) and idx < len(landmarks_per_frame[i-1])):
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
                if (idx < len(landmarks_per_frame[i]) and idx < len(landmarks_per_frame[i-1])):
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
        if landmarks and len(landmarks) > 24:
            valid_landmarks = [lm for idx, lm in enumerate(landmarks) if idx in [11, 12, 23, 24] and lm['visibility'] > 0.5]
            if valid_landmarks:
                center_x = np.mean([lm['x'] for lm in valid_landmarks])
                center_y = np.mean([lm['y'] for lm in valid_landmarks])
                distances = []
                for idx in key_joints:
                    if idx < len(landmarks):
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
                if (idx < len(landmarks_per_frame[i]) and idx < len(reference_landmarks[i])):
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
                # Calculate body size for normalization
                if (landmarks_per_frame[i] and len(landmarks_per_frame[i]) > 23 and 
                    landmarks_per_frame[i][11]['visibility'] > 0.5 and landmarks_per_frame[i][23]['visibility'] > 0.5):
                    body_size = max(
                        np.sqrt(
                            (landmarks_per_frame[i][11]['x'] - landmarks_per_frame[i][23]['x'])**2 +
                            (landmarks_per_frame[i][11]['y'] - landmarks_per_frame[i][23]['y'])**2
                        ),
                        1.0
                    )
                else:
                    body_size = 1.0
                
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

@video_comparison_router.post("/uploads")
async def upload_video(file: UploadFile = File(...)):
    try:
        # Validate file format
        file_extension = file.filename.split(".")[-1].lower()
        if file_extension not in ["mp4", "mov", "avi"]:
            raise HTTPException(status_code=400, detail="Unsupported file format. Only .mp4, .mov, .avi are allowed.")
        
        # Create uploads directory if it doesn't exist
        uploads_dir = "uploads"
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return the file URL using the configured SERVER_URL
        file_url = f"{SERVER_URL}/uploads/{unique_filename}"
        print(f"File uploaded: {file_url}")
        
        return {"filename": unique_filename, "url": file_url}
    
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while uploading the file: {str(e)}")

@video_comparison_router.post("/compare")
async def compare_videos(
    past_video_url: str = Form(...),
    new_video_url: str = Form(...)
):
    try:
        print(f"Comparing videos: {past_video_url} vs {new_video_url}")
        
        # Validate and extract filenames from URLs
        for url in [past_video_url, new_video_url]:
            if not url.startswith(SERVER_URL):
                raise HTTPException(status_code=400, detail=f"Invalid video URL: {url}")
            filename = url.split("/")[-1]
            file_path = os.path.join("uploads", filename)
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail=f"Video file not found: {filename}")

        # Extract filenames from URLs
        past_filename = past_video_url.split("/")[-1]
        new_filename = new_video_url.split("/")[-1]
        past_file_path = os.path.join("uploads", past_filename)
        new_file_path = os.path.join("uploads", new_filename)

        # Generate unique filenames for processed videos
        past_output_filename = f"processed_{uuid.uuid4()}_{past_filename}"
        new_output_filename = f"processed_{uuid.uuid4()}_{new_filename}"
        past_output_path = os.path.join("uploads", past_output_filename)
        new_output_path = os.path.join("uploads", new_output_filename)

        print(f"Processing past video: {past_file_path} -> {past_output_path}")
        print(f"Processing new video: {new_file_path} -> {new_output_path}")

        # Process both videos to extract landmarks and create pose-annotated videos
        past_landmarks = process_video(past_file_path, past_output_path)
        new_landmarks = process_video(new_file_path, new_output_path)

        # Get FPS from the video for speed calculations
        cap = cv2.VideoCapture(past_file_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0  # Default to 30 FPS if unable to get FPS
        cap.release()

        print(f"Video FPS: {fps}")
        print(f"Past video landmarks frames: {len(past_landmarks)}")
        print(f"New video landmarks frames: {len(new_landmarks)}")

        # Calculate metrics for past video (baseline)
        past_metrics = {
            'smoothness': compute_smoothness(past_landmarks),
            'speed': compute_speed(past_landmarks, fps),
            'cohesion': compute_cohesion(past_landmarks),
            'accuracy': compute_accuracy(past_landmarks, past_landmarks)  # Self-reference for baseline
        }

        # Calculate metrics for new video
        new_metrics = {
            'smoothness': compute_smoothness(new_landmarks),
            'speed': compute_speed(new_landmarks, fps),
            'cohesion': compute_cohesion(new_landmarks),
            'accuracy': compute_accuracy(new_landmarks, past_landmarks)  # Compare to past video
        }

        # Calculate similarity between the two videos
        similarity = compute_similarity(past_landmarks, new_landmarks)
        new_metrics['similarity'] = similarity

        # Detect improvements and regressions
        improvements, regressions = detect_improvements_regressions(past_metrics, new_metrics)

        print(f"Past metrics: {past_metrics}")
        print(f"New metrics: {new_metrics}")
        print(f"Improvements: {improvements}, Regressions: {regressions}")

        # Prepare response with processed video URLs (not original ones)
        response = {
            "similarity": round(min(max(similarity, 0), 100), 2),
            "smoothness": round(min(max(new_metrics['smoothness'], 0), 100), 2),
            "speed": round(min(max(new_metrics['speed'], 0), 100), 2),
            "cohesion": round(min(max(new_metrics['cohesion'], 0), 100), 2),
            "accuracy": round(min(max(new_metrics['accuracy'], 0), 100), 2),
            "improvements": improvements,
            "regressions": regressions,
            # Return URLs to processed videos with pose estimation
            "past_video_url": f"{SERVER_URL}/uploads/{past_output_filename}",
            "new_video_url": f"{SERVER_URL}/uploads/{new_output_filename}"
        }

        print(f"Response: {response}")
        return JSONResponse(content=response)

    except Exception as e:
        print(f"Error in compare_videos: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred during comparison: {str(e)}")