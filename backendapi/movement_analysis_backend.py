import os
import uuid
import json
import base64
import io
from typing import Dict, List, Tuple
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server
import matplotlib.pyplot as plt
from scipy.signal import savgol_filter
from dataclasses import dataclass, asdict
import mediapipe as mp
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.responses import HTMLResponse

# Import the existing pose processor
from pose_processor import pose, mp_pose

# Create router for movement analysis
movement_analysis_router = APIRouter(prefix="/movement-analysis", tags=["movement-analysis"])

# Get server URL from environment (defaults to localhost)
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")

@dataclass
class MovementMetrics:
    """Store all movement analysis results"""
    joint_angles: Dict[str, List[float]]
    velocities: Dict[str, List[float]]
    accelerations: Dict[str, List[float]]
    symmetry_scores: Dict[str, float]
    balance_score: float
    smoothness_score: float
    power_metrics: Dict[str, float]
    range_of_motion: Dict[str, float]
    center_of_mass_positions: List[Tuple[float, float]]
    com_displacement: float
    overall_score: float

class AdvancedMovementAnalyzer:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Store landmark data for analysis
        self.landmark_data = []
        self.frame_count = 0
        self.fps = 30  # Will be updated from video
        
    def calculate_angle(self, p1, p2, p3):
        """Calculate angle between three points"""
        a = np.array(p1)
        b = np.array(p2)
        c = np.array(p3)
        
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        
        if angle > 180.0:
            angle = 360 - angle
        
        return angle
    
    def calculate_distance(self, p1, p2):
        """Calculate Euclidean distance between two points"""
        return np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
    
    def extract_landmarks(self, video_path):
        """Extract pose landmarks from video"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
            
        self.fps = cap.get(cv2.CAP_PROP_FPS)
        if self.fps <= 0:
            self.fps = 30.0
        
        self.landmark_data = []
        frame_count = 0
        max_frames = 1000  # Limit for processing
        
        print(f"Processing video: {video_path} at {self.fps} FPS")
        
        while cap.isOpened() and frame_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Resize frame for faster processing
            height, width = frame.shape[:2]
            if width > 640:
                scale = 640 / width
                new_width = 640
                new_height = int(height * scale)
                frame = cv2.resize(frame, (new_width, new_height))
            
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            
            if results.pose_landmarks:
                # Convert landmarks to normalized coordinates
                landmarks = []
                for lm in results.pose_landmarks.landmark:
                    landmarks.append([lm.x, lm.y, lm.z, lm.visibility])
                self.landmark_data.append(landmarks)
            else:
                self.landmark_data.append([])
            
            frame_count += 1
            if frame_count % 50 == 0:
                print(f"Processed {frame_count} frames...")
            
        cap.release()
        print(f"Landmark extraction complete: {len(self.landmark_data)} frames")
        return np.array([lm for lm in self.landmark_data if len(lm) > 0])
    
    def calculate_joint_angles(self, landmarks):
        """Calculate key joint angles throughout the movement"""
        angles = {
            'left_elbow': [],
            'right_elbow': [],
            'left_knee': [],
            'right_knee': [],
            'left_shoulder': [],
            'right_shoulder': [],
            'left_hip': [],
            'right_hip': [],
            'trunk_lean': []
        }
        
        for frame_landmarks in landmarks:
            try:
                # Left elbow angle
                left_shoulder = frame_landmarks[11][:2]
                left_elbow = frame_landmarks[13][:2]
                left_wrist = frame_landmarks[15][:2]
                angles['left_elbow'].append(self.calculate_angle(left_shoulder, left_elbow, left_wrist))
                
                # Right elbow angle
                right_shoulder = frame_landmarks[12][:2]
                right_elbow = frame_landmarks[14][:2]
                right_wrist = frame_landmarks[16][:2]
                angles['right_elbow'].append(self.calculate_angle(right_shoulder, right_elbow, right_wrist))
                
                # Left knee angle
                left_hip = frame_landmarks[23][:2]
                left_knee = frame_landmarks[25][:2]
                left_ankle = frame_landmarks[27][:2]
                angles['left_knee'].append(self.calculate_angle(left_hip, left_knee, left_ankle))
                
                # Right knee angle
                right_hip = frame_landmarks[24][:2]
                right_knee = frame_landmarks[26][:2]
                right_ankle = frame_landmarks[28][:2]
                angles['right_knee'].append(self.calculate_angle(right_hip, right_knee, right_ankle))
                
                # Trunk lean (spine angle)
                nose = frame_landmarks[0][:2]
                mid_hip = [(frame_landmarks[23][0] + frame_landmarks[24][0])/2,
                          (frame_landmarks[23][1] + frame_landmarks[24][1])/2]
                vertical_ref = [mid_hip[0], mid_hip[1] - 0.1]
                angles['trunk_lean'].append(self.calculate_angle(vertical_ref, mid_hip, nose))
                
            except IndexError:
                # Skip frame if landmarks are incomplete
                continue
            
        return angles
    
    def calculate_velocities_accelerations(self, landmarks):
        """Calculate velocities and accelerations of key body parts"""
        velocities = {'center_of_mass': [], 'left_hand': [], 'right_hand': [], 'left_foot': [], 'right_foot': []}
        accelerations = {'center_of_mass': [], 'left_hand': [], 'right_hand': [], 'left_foot': [], 'right_foot': []}
        
        # Calculate center of mass
        com_positions = []
        for frame_landmarks in landmarks:
            try:
                # Simplified COM calculation using torso landmarks
                com_x = np.mean([frame_landmarks[11][0], frame_landmarks[12][0], 
                               frame_landmarks[23][0], frame_landmarks[24][0]])
                com_y = np.mean([frame_landmarks[11][1], frame_landmarks[12][1], 
                               frame_landmarks[23][1], frame_landmarks[24][1]])
                com_positions.append([com_x, com_y])
            except IndexError:
                if com_positions:
                    com_positions.append(com_positions[-1])  # Use last known position
                else:
                    com_positions.append([0.5, 0.5])  # Default center
        
        # Calculate velocities and accelerations
        dt = 1.0 / self.fps
        
        for i in range(1, len(com_positions)):
            # COM velocity
            vel = np.sqrt((com_positions[i][0] - com_positions[i-1][0])**2 + 
                         (com_positions[i][1] - com_positions[i-1][1])**2) / dt
            velocities['center_of_mass'].append(vel)
            
            # Hand and foot velocities
            try:
                left_hand_vel = self.calculate_distance(landmarks[i][15][:2], landmarks[i-1][15][:2]) / dt
                right_hand_vel = self.calculate_distance(landmarks[i][16][:2], landmarks[i-1][16][:2]) / dt
                left_foot_vel = self.calculate_distance(landmarks[i][27][:2], landmarks[i-1][27][:2]) / dt
                right_foot_vel = self.calculate_distance(landmarks[i][28][:2], landmarks[i-1][28][:2]) / dt
                
                velocities['left_hand'].append(left_hand_vel)
                velocities['right_hand'].append(right_hand_vel)
                velocities['left_foot'].append(left_foot_vel)
                velocities['right_foot'].append(right_foot_vel)
            except IndexError:
                # Use previous values if landmarks are missing
                for key in ['left_hand', 'right_hand', 'left_foot', 'right_foot']:
                    if velocities[key]:
                        velocities[key].append(velocities[key][-1])
                    else:
                        velocities[key].append(0.0)
        
        # Calculate accelerations from velocities
        for key in velocities:
            accel_list = []
            vel_list = velocities[key]
            for i in range(1, len(vel_list)):
                accel = (vel_list[i] - vel_list[i-1]) / dt
                accel_list.append(accel)
            accelerations[key] = accel_list
            
        return velocities, accelerations, com_positions
    
    def calculate_symmetry(self, landmarks):
        """Calculate left-right symmetry scores"""
        symmetry_scores = {}
        
        left_arm_angles = []
        right_arm_angles = []
        left_leg_angles = []
        right_leg_angles = []
        
        for frame_landmarks in landmarks:
            try:
                # Arm symmetry (shoulder-elbow-wrist angle)
                left_shoulder = frame_landmarks[11][:2]
                left_elbow = frame_landmarks[13][:2]
                left_wrist = frame_landmarks[15][:2]
                left_arm_angles.append(self.calculate_angle(left_shoulder, left_elbow, left_wrist))
                
                right_shoulder = frame_landmarks[12][:2]
                right_elbow = frame_landmarks[14][:2]
                right_wrist = frame_landmarks[16][:2]
                right_arm_angles.append(self.calculate_angle(right_shoulder, right_elbow, right_wrist))
                
                # Leg symmetry (hip-knee-ankle angle)
                left_hip = frame_landmarks[23][:2]
                left_knee = frame_landmarks[25][:2]
                left_ankle = frame_landmarks[27][:2]
                left_leg_angles.append(self.calculate_angle(left_hip, left_knee, left_ankle))
                
                right_hip = frame_landmarks[24][:2]
                right_knee = frame_landmarks[26][:2]
                right_ankle = frame_landmarks[28][:2]
                right_leg_angles.append(self.calculate_angle(right_hip, right_knee, right_ankle))
            except IndexError:
                continue
        
        # Calculate correlation coefficients for symmetry
        if len(left_arm_angles) > 1 and len(right_arm_angles) > 1:
            symmetry_scores['arm_symmetry'] = max(0, np.corrcoef(left_arm_angles, right_arm_angles)[0, 1])
        else:
            symmetry_scores['arm_symmetry'] = 0.5
            
        if len(left_leg_angles) > 1 and len(right_leg_angles) > 1:
            symmetry_scores['leg_symmetry'] = max(0, np.corrcoef(left_leg_angles, right_leg_angles)[0, 1])
        else:
            symmetry_scores['leg_symmetry'] = 0.5
        
        return symmetry_scores
    
    def calculate_balance_score(self, landmarks):
        """Calculate balance/stability score based on center of mass movement"""
        com_positions = []
        for frame_landmarks in landmarks:
            try:
                com_x = np.mean([frame_landmarks[11][0], frame_landmarks[12][0], 
                               frame_landmarks[23][0], frame_landmarks[24][0]])
                com_y = np.mean([frame_landmarks[11][1], frame_landmarks[12][1], 
                               frame_landmarks[23][1], frame_landmarks[24][1]])
                com_positions.append([com_x, com_y])
            except IndexError:
                if com_positions:
                    com_positions.append(com_positions[-1])
                else:
                    com_positions.append([0.5, 0.5])
        
        if len(com_positions) < 2:
            return 0.5
        
        # Calculate standard deviation of COM position (lower = more stable)
        com_array = np.array(com_positions)
        stability_x = np.std(com_array[:, 0])
        stability_y = np.std(com_array[:, 1])
        
        # Convert to score (higher = better balance)
        balance_score = 1.0 / (1.0 + stability_x + stability_y)
        return balance_score
    
    def calculate_smoothness(self, velocities):
        """Calculate movement smoothness using jerk analysis"""
        smoothness_scores = []
        
        for limb_velocities in velocities.values():
            if len(limb_velocities) > 4:
                try:
                    # Calculate jerk (derivative of acceleration)
                    window_length = min(len(limb_velocities)//4*2+1, 11)
                    if window_length < 3:
                        window_length = 3
                    vel_smooth = savgol_filter(limb_velocities, window_length, 3)
                    jerk = np.diff(vel_smooth, n=2)
                    
                    # Lower jerk = smoother movement
                    jerk_score = 1.0 / (1.0 + np.std(jerk))
                    smoothness_scores.append(jerk_score)
                except:
                    smoothness_scores.append(0.5)
        
        return np.mean(smoothness_scores) if smoothness_scores else 0.5
    
    def calculate_power_metrics(self, velocities, accelerations):
        """Calculate power-related metrics"""
        power_metrics = {}
        
        # Peak velocities
        for limb in velocities:
            if velocities[limb]:
                power_metrics[f'{limb}_peak_velocity'] = max(velocities[limb])
                power_metrics[f'{limb}_avg_velocity'] = np.mean(velocities[limb])
            else:
                power_metrics[f'{limb}_peak_velocity'] = 0.0
                power_metrics[f'{limb}_avg_velocity'] = 0.0
        
        # Peak accelerations
        for limb in accelerations:
            if accelerations[limb]:
                power_metrics[f'{limb}_peak_acceleration'] = max(np.abs(accelerations[limb]))
            else:
                power_metrics[f'{limb}_peak_acceleration'] = 0.0
        
        return power_metrics
    
    def calculate_range_of_motion(self, joint_angles):
        """Calculate range of motion for each joint"""
        rom = {}
        for joint, angles in joint_angles.items():
            if angles and len(angles) > 1:
                rom[joint] = max(angles) - min(angles)
            else:
                rom[joint] = 0.0
        return rom
    
    def calculate_com_displacement(self, com_positions):
        """Calculate total displacement of center of mass"""
        if len(com_positions) < 2:
            return 0.0
        
        total_displacement = 0.0
        for i in range(1, len(com_positions)):
            displacement = self.calculate_distance(com_positions[i], com_positions[i-1])
            total_displacement += displacement
        
        return total_displacement
    
    def calculate_overall_score(self, metrics):
        """Calculate overall movement quality score"""
        # Weighted combination of different metrics
        weights = {
            'balance': 0.25,
            'smoothness': 0.25,
            'symmetry': 0.25,
            'power': 0.25
        }
        
        balance_score = metrics.balance_score
        smoothness_score = metrics.smoothness_score
        symmetry_score = np.mean(list(metrics.symmetry_scores.values()))
        
        # Normalize power score (simplified)
        power_values = [v for k, v in metrics.power_metrics.items() if 'peak_velocity' in k]
        power_score = np.mean(power_values) if power_values else 0.5
        power_score = min(power_score * 10, 1.0)  # Scale and cap at 1.0
        
        overall = (weights['balance'] * balance_score + 
                  weights['smoothness'] * smoothness_score +
                  weights['symmetry'] * symmetry_score +
                  weights['power'] * power_score)
        
        return min(overall, 1.0)  # Cap at 1.0
    
    def analyze_video(self, video_path):
        """Main analysis function"""
        print("Extracting pose landmarks...")
        landmarks = self.extract_landmarks(video_path)
        
        if len(landmarks) == 0:
            raise ValueError("No pose landmarks detected in video")
        
        print("Calculating joint angles...")
        joint_angles = self.calculate_joint_angles(landmarks)
        
        print("Calculating velocities and accelerations...")
        velocities, accelerations, com_positions = self.calculate_velocities_accelerations(landmarks)
        
        print("Calculating symmetry scores...")
        symmetry_scores = self.calculate_symmetry(landmarks)
        
        print("Calculating balance score...")
        balance_score = self.calculate_balance_score(landmarks)
        
        print("Calculating smoothness score...")
        smoothness_score = self.calculate_smoothness(velocities)
        
        print("Calculating power metrics...")
        power_metrics = self.calculate_power_metrics(velocities, accelerations)
        
        print("Calculating range of motion...")
        range_of_motion = self.calculate_range_of_motion(joint_angles)
        
        print("Calculating center of mass displacement...")
        com_displacement = self.calculate_com_displacement(com_positions)
        
        # Create metrics object
        metrics = MovementMetrics(
            joint_angles=joint_angles,
            velocities=velocities,
            accelerations=accelerations,
            symmetry_scores=symmetry_scores,
            balance_score=balance_score,
            smoothness_score=smoothness_score,
            power_metrics=power_metrics,
            range_of_motion=range_of_motion,
            center_of_mass_positions=com_positions,
            com_displacement=com_displacement,
            overall_score=0.0
        )
        
        print("Calculating overall score...")
        metrics.overall_score = self.calculate_overall_score(metrics)
        
        return metrics
    
    def generate_report(self, metrics):
        """Generate a comprehensive analysis report"""
        report = f"""
ADVANCED MOVEMENT ANALYSIS REPORT
==================================

OVERALL SCORE: {metrics.overall_score:.2f}/1.00

KEY METRICS:
-----------
Balance Score: {metrics.balance_score:.3f} (Higher = Better)
Smoothness Score: {metrics.smoothness_score:.3f} (Higher = Better)

SYMMETRY ANALYSIS:
-----------------
Arm Symmetry: {metrics.symmetry_scores.get('arm_symmetry', 0):.3f}
Leg Symmetry: {metrics.symmetry_scores.get('leg_symmetry', 0):.3f}

RANGE OF MOTION:
---------------
"""
        for joint, rom in metrics.range_of_motion.items():
            report += f"{joint.replace('_', ' ').title()}: {rom:.1f}°\n"
        
        report += f"""
POWER METRICS:
-------------
"""
        for metric, value in metrics.power_metrics.items():
            if 'peak_velocity' in metric:
                report += f"{metric.replace('_', ' ').title()}: {value:.4f}\n"
        
        report += f"""
CENTER OF MASS ANALYSIS:
-----------------------
Total COM Displacement: {metrics.com_displacement:.4f}
COM Stability Range X: {np.std([pos[0] for pos in metrics.center_of_mass_positions]):.4f}
COM Stability Range Y: {np.std([pos[1] for pos in metrics.center_of_mass_positions]):.4f}

RECOMMENDATIONS:
---------------
"""
        
        # Generate recommendations based on scores
        if metrics.balance_score < 0.7:
            report += "• Focus on core stability and balance training\n"
        
        if metrics.smoothness_score < 0.7:
            report += "• Work on movement coordination and timing\n"
        
        if metrics.symmetry_scores.get('arm_symmetry', 1) < 0.8:
            report += "• Address arm movement asymmetries\n"
        
        if metrics.symmetry_scores.get('leg_symmetry', 1) < 0.8:
            report += "• Work on leg movement symmetry\n"
        
        if metrics.overall_score > 0.8:
            report += "• Excellent movement quality! Focus on consistency\n"
        
        return report
    
    def create_visualizations(self, metrics, output_dir):
        """Create visualization plots and save to files"""
        plt.style.use('dark_background')
        fig, axes = plt.subplots(3, 3, figsize=(18, 15))
        fig.patch.set_facecolor('#1a1a2e')
        fig.suptitle('Advanced Movement Analysis Dashboard', fontsize=20, color='white', weight='bold')
        
        # Joint angles over time
        ax1 = axes[0, 0]
        for joint, angles in metrics.joint_angles.items():
            if angles:
                ax1.plot(angles, label=joint, linewidth=2, alpha=0.8)
        ax1.set_title('Joint Angles Over Time', color='white', weight='bold')
        ax1.set_xlabel('Frame', color='white')
        ax1.set_ylabel('Angle (degrees)', color='white')
        ax1.legend(fontsize=8)
        ax1.grid(True, alpha=0.3)
        
        # Velocities
        ax2 = axes[0, 1]
        colors = ['#ff4c48', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57']
        for i, (limb, vels) in enumerate(metrics.velocities.items()):
            if vels:
                ax2.plot(vels, label=limb, color=colors[i % len(colors)], linewidth=2, alpha=0.8)
        ax2.set_title('Velocities Over Time', color='white', weight='bold')
        ax2.set_xlabel('Frame', color='white')
        ax2.set_ylabel('Velocity', color='white')
        ax2.legend(fontsize=8)
        ax2.grid(True, alpha=0.3)
        
        # Power metrics bar chart
        ax3 = axes[0, 2]
        power_names = [k for k in metrics.power_metrics.keys() if 'peak_velocity' in k]
        power_values = [metrics.power_metrics[k] for k in power_names]
        bars = ax3.bar(range(len(power_names)), power_values, color='#ff4c48', alpha=0.8)
        ax3.set_title('Peak Velocities', color='white', weight='bold')
        ax3.set_xticks(range(len(power_names)))
        ax3.set_xticklabels([name.replace('_peak_velocity', '').replace('_', ' ') for name in power_names], 
                           rotation=45, fontsize=10)
        ax3.grid(True, alpha=0.3)
        
        # Symmetry scores
        ax4 = axes[1, 0]
        sym_names = list(metrics.symmetry_scores.keys())
        sym_values = list(metrics.symmetry_scores.values())
        colors_sym = ['#4ECDC4', '#45B7D1']
        bars = ax4.bar(sym_names, sym_values, color=colors_sym, alpha=0.8)
        ax4.set_title('Symmetry Scores', color='white', weight='bold')
        ax4.set_ylabel('Correlation', color='white')
        ax4.set_ylim(0, 1)
        ax4.grid(True, alpha=0.3)
        
        # Range of motion
        ax5 = axes[1, 1]
        rom_names = list(metrics.range_of_motion.keys())
        rom_values = list(metrics.range_of_motion.values())
        bars = ax5.bar(range(len(rom_names)), rom_values, color='#96CEB4', alpha=0.8)
        ax5.set_title('Range of Motion', color='white', weight='bold')
        ax5.set_xticks(range(len(rom_names)))
        ax5.set_xticklabels([name.replace('_', ' ') for name in rom_names], rotation=45, fontsize=8)
        ax5.set_ylabel('Degrees', color='white')
        ax5.grid(True, alpha=0.3)
        
        # Overall scores summary
        ax6 = axes[1, 2]
        scores = ['Balance', 'Smoothness', 'Overall']
        score_values = [metrics.balance_score, metrics.smoothness_score, metrics.overall_score]
        colors_scores = ['#4ade80' if x > 0.7 else '#fbbf24' if x > 0.5 else '#ef4444' for x in score_values]
        bars = ax6.bar(scores, score_values, color=colors_scores, alpha=0.8)
        ax6.set_title('Quality Scores', color='white', weight='bold')
        ax6.set_ylabel('Score', color='white')
        ax6.set_ylim(0, 1)
        ax6.grid(True, alpha=0.3)
        
        # Center of Mass Trajectory (2D path)
        ax7 = axes[2, 0]
        com_x = [pos[0] for pos in metrics.center_of_mass_positions]
        com_y = [pos[1] for pos in metrics.center_of_mass_positions]
        ax7.plot(com_x, com_y, '#ff4c48', linewidth=3, alpha=0.8)
        ax7.scatter(com_x[0], com_y[0], color='#4ade80', s=100, label='Start', zorder=5)
        ax7.scatter(com_x[-1], com_y[-1], color='#ef4444', s=100, label='End', zorder=5)
        ax7.set_title('Center of Mass Trajectory', color='white', weight='bold')
        ax7.set_xlabel('X Position', color='white')
        ax7.set_ylabel('Y Position', color='white')
        ax7.legend()
        ax7.grid(True, alpha=0.3)
        ax7.set_aspect('equal')
        
        # Center of Mass Position over Time
        ax8 = axes[2, 1]
        frames = range(len(com_x))
        ax8.plot(frames, com_x, label='X Position', linewidth=2, color='#4ECDC4')
        ax8.plot(frames, com_y, label='Y Position', linewidth=2, color='#45B7D1')
        ax8.set_title('COM Position Over Time', color='white', weight='bold')
        ax8.set_xlabel('Frame', color='white')
        ax8.set_ylabel('Position', color='white')
        ax8.legend()
        ax8.grid(True, alpha=0.3)
        
        # Center of Mass Stability Analysis
        ax9 = axes[2, 2]
        com_velocities = metrics.velocities.get('center_of_mass', [])
        if com_velocities:
            ax9.plot(com_velocities, '#ff4c48', linewidth=2, alpha=0.8)
            avg_vel = np.mean(com_velocities)
            ax9.axhline(y=avg_vel, color='#fbbf24', linestyle='--', linewidth=2,
                       label=f'Avg: {avg_vel:.4f}')
            ax9.set_title('COM Velocity Over Time', color='white', weight='bold')
            ax9.set_xlabel('Frame', color='white')
            ax9.set_ylabel('Velocity', color='white')
            ax9.legend()
            ax9.grid(True, alpha=0.3)
        
        # Apply dark theme styling to all subplots
        for ax in axes.flat:
            ax.set_facecolor('#16213e')
            ax.tick_params(colors='white')
            ax.spines['bottom'].set_color('white')
            ax.spines['top'].set_color('white')
            ax.spines['right'].set_color('white')
            ax.spines['left'].set_color('white')
        
        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
        # Save the plot
        plot_filename = f"movement_analysis_{uuid.uuid4().hex[:8]}.png"
        plot_path = os.path.join(output_dir, plot_filename)
        plt.savefig(plot_path, dpi=150, bbox_inches='tight', facecolor='#1a1a2e')
        plt.close()
        
        return plot_filename

# API Endpoints

@movement_analysis_router.post("/upload")
async def upload_video_for_analysis(file: UploadFile = File(...)):
    """Upload a video file for movement analysis"""
    try:
        print(f"Uploading video for movement analysis: {file.filename}")
        
        # Validate file format
        file_extension = file.filename.split(".")[-1].lower()
        if file_extension not in ["mp4", "mov", "avi", "webm"]:
            raise HTTPException(status_code=400, detail="Unsupported file format. Only .mp4, .mov, .avi, .webm are allowed.")
        
        # Create uploads directory if it doesn't exist
        uploads_dir = "uploads"
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
        
        # Generate unique filename
        unique_filename = f"movement_analysis_{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Verify the file was saved correctly
        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Failed to save uploaded file")
            
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            os.unlink(file_path)
            raise HTTPException(status_code=500, detail="Uploaded file is empty")
        
        # Quick validation that it's a video file
        try:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                os.unlink(file_path)
                raise HTTPException(status_code=400, detail="Invalid video file")
            cap.release()
        except Exception as e:
            if os.path.exists(file_path):
                os.unlink(file_path)
            raise HTTPException(status_code=400, detail=f"Video validation failed: {str(e)}")
        
        # Return the file URL
        file_url = f"{SERVER_URL}/uploads/{unique_filename}"
        print(f"Video uploaded successfully: {file_url} (Size: {file_size} bytes)")
        
        return {
            "status": "success",
            "filename": unique_filename,
            "url": file_url,
            "size": file_size,
            "message": "Video uploaded successfully. Use /analyze endpoint to process."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while uploading the file: {str(e)}")

@movement_analysis_router.post("/analyze")
async def analyze_movement(video_url: str = Form(...)):
    """Analyze movement patterns in an uploaded video"""
    try:
        print(f"Starting movement analysis for: {video_url}")
        
        # Validate and extract filename from URL
        if not video_url.startswith(SERVER_URL):
            raise HTTPException(status_code=400, detail=f"Invalid video URL: {video_url}")
        
        filename = video_url.split("/")[-1]
        file_path = os.path.join("uploads", filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Video file not found: {filename}")
        
        # Create analyzer instance
        analyzer = AdvancedMovementAnalyzer()
        
        # Perform analysis
        print("Starting comprehensive movement analysis...")
        metrics = analyzer.analyze_video(file_path)
        
        # Generate report
        report = analyzer.generate_report(metrics)
        
        # Create visualizations
        uploads_dir = "uploads"
        plot_filename = analyzer.create_visualizations(metrics, uploads_dir)
        plot_url = f"{SERVER_URL}/uploads/{plot_filename}"
        
        # Convert metrics to JSON-serializable format
        metrics_dict = {
            'joint_angles': metrics.joint_angles,
            'velocities': {k: v for k, v in metrics.velocities.items()},
            'accelerations': {k: v for k, v in metrics.accelerations.items()},
            'symmetry_scores': metrics.symmetry_scores,
            'balance_score': float(metrics.balance_score),
            'smoothness_score': float(metrics.smoothness_score),
            'power_metrics': metrics.power_metrics,
            'range_of_motion': metrics.range_of_motion,
            'center_of_mass_positions': metrics.center_of_mass_positions,
            'com_displacement': float(metrics.com_displacement),
            'overall_score': float(metrics.overall_score)
        }
        
        # Save analysis results to JSON file
        results_filename = f"analysis_results_{uuid.uuid4().hex[:8]}.json"
        results_path = os.path.join(uploads_dir, results_filename)
        
        analysis_results = {
            'metrics': metrics_dict,
            'report': report,
            'video_url': video_url,
            'plot_url': plot_url,
            'timestamp': str(np.datetime64('now')),
            'analysis_id': results_filename.split('.')[0]
        }
        
        with open(results_path, 'w') as f:
            json.dump(analysis_results, f, indent=2)
        
        results_url = f"{SERVER_URL}/uploads/{results_filename}"
        
        print(f"Movement analysis complete! Results saved to: {results_url}")
        
        return {
            "status": "success",
            "analysis_id": results_filename.split('.')[0],
            "overall_score": round(metrics.overall_score, 3),
            "balance_score": round(metrics.balance_score, 3),
            "smoothness_score": round(metrics.smoothness_score, 3),
            "symmetry_scores": {k: round(v, 3) for k, v in metrics.symmetry_scores.items()},
            "com_displacement": round(metrics.com_displacement, 4),
            "report": report,
            "visualizations_url": plot_url,
            "full_results_url": results_url,
            "video_analyzed": video_url,
            "frames_processed": len(metrics.center_of_mass_positions),
            "recommendations": [
                "Focus on core stability and balance training" if metrics.balance_score < 0.7 else None,
                "Work on movement coordination and timing" if metrics.smoothness_score < 0.7 else None,
                "Address arm movement asymmetries" if metrics.symmetry_scores.get('arm_symmetry', 1) < 0.8 else None,
                "Work on leg movement symmetry" if metrics.symmetry_scores.get('leg_symmetry', 1) < 0.8 else None,
                "Excellent movement quality! Focus on consistency" if metrics.overall_score > 0.8 else None
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Analysis error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred during analysis: {str(e)}")

@movement_analysis_router.get("/results/{analysis_id}")
async def get_analysis_results(analysis_id: str):
    """Retrieve saved analysis results by ID"""
    try:
        results_filename = f"{analysis_id}.json"
        results_path = os.path.join("uploads", results_filename)
        
        if not os.path.exists(results_path):
            raise HTTPException(status_code=404, detail=f"Analysis results not found: {analysis_id}")
        
        with open(results_path, 'r') as f:
            results = json.load(f)
        
        return results
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving results: {str(e)}")

@movement_analysis_router.get("/dashboard")
async def movement_analysis_dashboard():
    """Serve a web dashboard for movement analysis"""
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Advanced Movement Analysis Dashboard</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%);
                color: white;
                min-height: 100vh;
                padding: 20px;
            }}
            
            .container {{
                max-width: 1200px;
                margin: 0 auto;
            }}
            
            .header {{
                text-align: center;
                margin-bottom: 40px;
            }}
            
            .header h1 {{
                font-size: 2.5em;
                margin-bottom: 10px;
                background: linear-gradient(45deg, #ff4c48, #4ECDC4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }}
            
            .upload-section {{
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 30px;
                margin-bottom: 30px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }}
            
            .upload-area {{
                border: 2px dashed #ff4c48;
                border-radius: 15px;
                padding: 40px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-bottom: 20px;
            }}
            
            .upload-area:hover {{
                border-color: #4ECDC4;
                background: rgba(255, 76, 72, 0.1);
            }}
            
            .upload-area.dragover {{
                border-color: #4ade80;
                background: rgba(74, 222, 128, 0.1);
            }}
            
            .btn {{
                background: linear-gradient(45deg, #ff4c48, #ff6b47);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(255, 76, 72, 0.3);
            }}
            
            .btn:hover {{
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(255, 76, 72, 0.4);
            }}
            
            .btn:disabled {{
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }}
            
            .progress-bar {{
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: hidden;
                margin: 20px 0;
                display: none;
            }}
            
            .progress-fill {{
                height: 100%;
                background: linear-gradient(45deg, #ff4c48, #4ECDC4);
                border-radius: 4px;
                transition: width 0.3s ease;
                width: 0%;
            }}
            
            .results-section {{
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 30px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                display: none;
            }}
            
            .metrics-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            
            .metric-card {{
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }}
            
            .metric-value {{
                font-size: 2em;
                font-weight: bold;
                margin: 10px 0;
            }}
            
            .metric-label {{
                color: rgba(255, 255, 255, 0.8);
                font-size: 0.9em;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            
            .excellent {{ color: #4ade80; }}
            .good {{ color: #4ECDC4; }}
            .fair {{ color: #fbbf24; }}
            .poor {{ color: #ef4444; }}
            
            .visualization {{
                text-align: center;
                margin: 30px 0;
            }}
            
            .visualization img {{
                max-width: 100%;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }}
            
            .report-section {{
                background: rgba(0, 0, 0, 0.3);
                border-radius: 15px;
                padding: 20px;
                margin-top: 20px;
                font-family: 'Monaco', 'Menlo', monospace;
                font-size: 0.9em;
                line-height: 1.6;
                white-space: pre-wrap;
            }}
            
            .loading {{
                text-align: center;
                padding: 40px;
            }}
            
            .spinner {{
                border: 3px solid rgba(255, 255, 255, 0.1);
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
            
            .error {{
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid #ef4444;
                color: #ef4444;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
                display: none;
            }}
            
            .success {{
                background: rgba(74, 222, 128, 0.1);
                border: 1px solid #4ade80;
                color: #4ade80;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
                display: none;
            }}
            
            #fileInput {{
                display: none;
            }}
            
            @media (max-width: 768px) {{
                .container {{
                    padding: 10px;
                }}
                
                .header h1 {{
                    font-size: 2em;
                }}
                
                .upload-section, .results-section {{
                    padding: 20px;
                }}
                
                .metrics-grid {{
                    grid-template-columns: 1fr;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏃‍♂️ Advanced Movement Analysis</h1>
                <p>Upload your movement video for comprehensive biomechanical analysis</p>
            </div>
            
            <div class="upload-section">
                <div class="upload-area" id="uploadArea">
                    <h3>📁 Drop your video here or click to browse</h3>
                    <p>Supported formats: MP4, MOV, AVI, WEBM</p>
                    <p>Maximum file size: 100MB</p>
                </div>
                <input type="file" id="fileInput" accept=".mp4,.mov,.avi,.webm">
                <div class="progress-bar" id="progressBar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <button class="btn" id="analyzeBtn" disabled>🚀 Analyze Movement</button>
                
                <div class="error" id="errorMessage"></div>
                <div class="success" id="successMessage"></div>
            </div>
            
            <div class="results-section" id="resultsSection">
                <div class="loading" id="loadingIndicator">
                    <div class="spinner"></div>
                    <p>Analyzing movement patterns...</p>
                </div>
                
                <div id="resultsContent" style="display: none;">
                    <h2>📊 Analysis Results</h2>
                    
                    <div class="metrics-grid" id="metricsGrid">
                        <!-- Metrics will be populated here -->
                    </div>
                    
                    <div class="visualization" id="visualizationContainer">
                        <!-- Visualization will be loaded here -->
                    </div>
                    
                    <div class="report-section" id="reportContent">
                        <!-- Report will be populated here -->
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            class MovementAnalysisDashboard {{
                constructor() {{
                    this.uploadArea = document.getElementById('uploadArea');
                    this.fileInput = document.getElementById('fileInput');
                    this.analyzeBtn = document.getElementById('analyzeBtn');
                    this.progressBar = document.getElementById('progressBar');
                    this.progressFill = document.getElementById('progressFill');
                    this.errorMessage = document.getElementById('errorMessage');
                    this.successMessage = document.getElementById('successMessage');
                    this.resultsSection = document.getElementById('resultsSection');
                    this.loadingIndicator = document.getElementById('loadingIndicator');
                    this.resultsContent = document.getElementById('resultsContent');
                    
                    this.selectedFile = null;
                    this.uploadedVideoUrl = null;
                    
                    this.initializeEventListeners();
                }}
                
                initializeEventListeners() {{
                    // Upload area events
                    this.uploadArea.addEventListener('click', () => this.fileInput.click());
                    this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
                    this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
                    this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
                    
                    // File input change
                    this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
                    
                    // Analyze button
                    this.analyzeBtn.addEventListener('click', this.startAnalysis.bind(this));
                }}
                
                handleDragOver(e) {{
                    e.preventDefault();
                    this.uploadArea.classList.add('dragover');
                }}
                
                handleDragLeave(e) {{
                    e.preventDefault();
                    this.uploadArea.classList.remove('dragover');
                }}
                
                handleDrop(e) {{
                    e.preventDefault();
                    this.uploadArea.classList.remove('dragover');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {{
                        this.handleFile(files[0]);
                    }}
                }}
                
                handleFileSelect(e) {{
                    const files = e.target.files;
                    if (files.length > 0) {{
                        this.handleFile(files[0]);
                    }}
                }}
                
                handleFile(file) {{
                    // Validate file type
                    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
                    if (!validTypes.includes(file.type)) {{
                        this.showError('Please select a valid video file (MP4, MOV, AVI, WEBM)');
                        return;
                    }}
                    
                    // Validate file size (100MB limit)
                    if (file.size > 100 * 1024 * 1024) {{
                        this.showError('File size must be less than 100MB');
                        return;
                    }}
                    
                    this.selectedFile = file;
                    this.uploadArea.innerHTML = `
                        <h3>📹 Ready to analyze: ${{file.name}}</h3>
                        <p>Size: ${{(file.size / (1024 * 1024)).toFixed(2)}} MB</p>
                        <p>Click "Analyze Movement" to start processing</p>
                    `;
                    this.analyzeBtn.disabled = false;
                    this.hideMessages();
                }}
                
                async startAnalysis() {{
                    if (!this.selectedFile) {{
                        this.showError('Please select a video file first');
                        return;
                    }}
                    
                    try {{
                        this.analyzeBtn.disabled = true;
                        this.hideMessages();
                        
                        // Step 1: Upload video
                        this.showProgress('Uploading video...', 20);
                        const uploadResult = await this.uploadVideo();
                        
                        // Step 2: Analyze movement
                        this.showProgress('Processing movement analysis...', 50);
                        const analysisResult = await this.analyzeMovement(uploadResult.url);
                        
                        // Step 3: Display results
                        this.showProgress('Preparing results...', 90);
                        this.displayResults(analysisResult);
                        this.showProgress('Complete!', 100);
                        
                        setTimeout(() => {{
                            this.progressBar.style.display = 'none';
                            this.showSuccess('Movement analysis completed successfully!');
                        }}, 1000);
                        
                    }} catch (error) {{
                        console.error('Analysis error:', error);
                        this.showError(`Analysis failed: ${{error.message}}`);
                        this.progressBar.style.display = 'none';
                    }} finally {{
                        this.analyzeBtn.disabled = false;
                    }}
                }}
                
                async uploadVideo() {{
                    const formData = new FormData();
                    formData.append('file', this.selectedFile);
                    
                    const response = await fetch('/movement-analysis/upload', {{
                        method: 'POST',
                        body: formData
                    }});
                    
                    if (!response.ok) {{
                        const error = await response.json();
                        throw new Error(error.detail || 'Upload failed');
                    }}
                    
                    return await response.json();
                }}
                
                async analyzeMovement(videoUrl) {{
                    const formData = new FormData();
                    formData.append('video_url', videoUrl);
                    
                    const response = await fetch('/movement-analysis/analyze', {{
                        method: 'POST',
                        body: formData
                    }});
                    
                    if (!response.ok) {{
                        const error = await response.json();
                        throw new Error(error.detail || 'Analysis failed');
                    }}
                    
                    return await response.json();
                }}
                
                displayResults(results) {{
                    this.resultsSection.style.display = 'block';
                    this.loadingIndicator.style.display = 'none';
                    this.resultsContent.style.display = 'block';
                    
                    // Display metrics
                    this.displayMetrics(results);
                    
                    // Display visualization
                    if (results.visualizations_url) {{
                        document.getElementById('visualizationContainer').innerHTML = `
                            <h3>📈 Movement Analysis Visualizations</h3>
                            <img src="${{results.visualizations_url}}" alt="Movement Analysis Visualizations" />
                        `;
                    }}
                    
                    // Display report
                    if (results.report) {{
                        document.getElementById('reportContent').textContent = results.report;
                    }}
                    
                    // Scroll to results
                    this.resultsSection.scrollIntoView({{ behavior: 'smooth' }});
                }}
                
                displayMetrics(results) {{
                    const metricsGrid = document.getElementById('metricsGrid');
                    
                    const metrics = [
                        {{ label: 'Overall Score', value: results.overall_score, suffix: '/1.00' }},
                        {{ label: 'Balance Score', value: results.balance_score, suffix: '/1.00' }},
                        {{ label: 'Smoothness Score', value: results.smoothness_score, suffix: '/1.00' }},
                        {{ label: 'Arm Symmetry', value: results.symmetry_scores?.arm_symmetry || 0, suffix: '/1.00' }},
                        {{ label: 'Leg Symmetry', value: results.symmetry_scores?.leg_symmetry || 0, suffix: '/1.00' }},
                        {{ label: 'COM Displacement', value: results.com_displacement, suffix: '' }}
                    ];
                    
                    metricsGrid.innerHTML = metrics.map(metric => {{
                        const scoreClass = this.getScoreClass(metric.value);
                        return `
                            <div class="metric-card">
                                <div class="metric-label">${{metric.label}}</div>
                                <div class="metric-value ${{scoreClass}}">${{metric.value.toFixed(3)}}${{metric.suffix}}</div>
                            </div>
                        `;
                    }}).join('');
                }}
                
                getScoreClass(value) {{
                    if (value > 0.8) return 'excellent';
                    if (value > 0.6) return 'good';
                    if (value > 0.4) return 'fair';
                    return 'poor';
                }}
                
                showProgress(message, percentage) {{
                    this.progressBar.style.display = 'block';
                    this.progressFill.style.width = `${{percentage}}%`;
                    
                    // Update upload area with progress message
                    this.uploadArea.innerHTML = `
                        <h3>⚡ ${{message}}</h3>
                        <p>Please wait while we process your video...</p>
                    `;
                }}
                
                showError(message) {{
                    this.errorMessage.textContent = message;
                    this.errorMessage.style.display = 'block';
                    this.successMessage.style.display = 'none';
                }}
                
                showSuccess(message) {{
                    this.successMessage.textContent = message;
                    this.successMessage.style.display = 'block';
                    this.errorMessage.style.display = 'none';
                }}
                
                hideMessages() {{
                    this.errorMessage.style.display = 'none';
                    this.successMessage.style.display = 'none';
                }}
            }}
            
            // Initialize dashboard when DOM is ready
            document.addEventListener('DOMContentLoaded', () => {{
                new MovementAnalysisDashboard();
            }});
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)

@movement_analysis_router.get("/list")
async def list_analysis_results():
    """List all available analysis results"""
    try:
        uploads_dir = "uploads"
        if not os.path.exists(uploads_dir):
            return {"analyses": []}
        
        analyses = []
        for filename in os.listdir(uploads_dir):
            if filename.startswith("analysis_results_") and filename.endswith(".json"):
                try:
                    file_path = os.path.join(uploads_dir, filename)
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    
                    analysis_id = filename.split('.')[0]
                    analyses.append({
                        "analysis_id": analysis_id,
                        "timestamp": data.get("timestamp", "Unknown"),
                        "overall_score": data.get("metrics", {}).get("overall_score", 0),
                        "video_url": data.get("video_url", ""),
                        "results_url": f"{SERVER_URL}/uploads/{filename}"
                    })
                except Exception as e:
                    print(f"Error reading analysis file {filename}: {e}")
                    continue
        
        # Sort by timestamp (newest first)
        analyses.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "status": "success",
            "count": len(analyses),
            "analyses": analyses
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing analyses: {str(e)}")