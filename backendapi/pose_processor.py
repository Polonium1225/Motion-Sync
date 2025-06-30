import cv2
import numpy as np
import mediapipe as mp

# Initialize MediaPipe Pose with balanced settings
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Use model_complexity=1 for better accuracy while maintaining performance
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,  # Better accuracy than 0, still good performance
    smooth_landmarks=True,
    enable_segmentation=False,
    smooth_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

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
        # Don't resize here - already done in main processing
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