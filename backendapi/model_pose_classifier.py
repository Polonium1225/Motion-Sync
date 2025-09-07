# model_pose_classifier.py
import os
import pickle
import numpy as np
import json
import copy
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

# Router for model-based pose classification
model_pose_router = APIRouter()

# Get server URL from environment
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")

class PoseClassifier:
    def __init__(self):
        self.model = None
        self.model_metadata = None
        self.scaler = None
        self.label_encoder = None
        self.feature_columns = None
        self.load_model()
    
    def flip_landmarks_for_mirror(self, landmarks: List[Dict]) -> List[Dict]:
        """Flip landmarks horizontally to match mirrored video display"""
        # Deep copy to avoid modifying original
        flipped = copy.deepcopy(landmarks)
        
        # MediaPipe pose landmark pairs that need to be swapped
        swap_pairs = [
            (11, 12),  # shoulders
            (13, 14),  # elbows
            (15, 16),  # wrists
            (17, 18),  # pinky
            (19, 20),  # index
            (21, 22),  # thumb
            (23, 24),  # hips
            (25, 26),  # knees
            (27, 28),  # ankles
            (29, 30),  # heel
            (31, 32)   # foot index
        ]
        
        # Step 1: Flip all x-coordinates (mirror horizontally)
        for landmark in flipped:
            landmark['x'] = 1.0 - landmark['x']
        
        # Step 2: Swap left/right landmark pairs
        # Create a temporary copy for swapping
        temp = copy.deepcopy(flipped)
        
        for left_idx, right_idx in swap_pairs:
            # Swap the landmarks
            flipped[left_idx] = temp[right_idx]
            flipped[right_idx] = temp[left_idx]
        
        return flipped
    def transform_web_landmarks(self, landmarks: List[Dict]) -> List[Dict]:
        """Transform web landmarks to match training data format"""
        import copy
        transformed = copy.deepcopy(landmarks)
        
        for landmark in transformed:
            # Ensure z-coordinates are negative (training data characteristic)
            if landmark['z'] > 0:
                landmark['z'] = -abs(landmark['z'])
            
            # Boost visibility scores if they're too low
            if landmark['visibility'] < 0.9:
                landmark['visibility'] = min(landmark['visibility'] * 1.2, 0.99)
        
        return transformed
    def load_model(self):
        """Load the trained pose classification model"""
        try:
            # Model directory path
            metadata_path = r"models/demo/"
            model_path = os.path.join(metadata_path, 'model.pkl')
            model_metadata_path = os.path.join(metadata_path, 'model_metadata.json')
            
            # Ensure directory exists
            if not os.path.exists(metadata_path):
                raise FileNotFoundError(f"Model directory not found: {metadata_path}")
            
            # Load the trained model
            with open(model_path, 'rb') as f:
                loaded_data = pickle.load(f)
                
            # Debug: Check what was loaded
            print(f"🔍 Loaded data type: {type(loaded_data)}")
            
            # Handle different pickle file structures
            if hasattr(loaded_data, 'predict'):
                # Direct model object
                self.model = loaded_data
                print(f"✅ Direct model loaded: {type(self.model)}")
            elif isinstance(loaded_data, dict):
                # Model might be stored in a dictionary
                print(f"📦 Dictionary keys: {list(loaded_data.keys())}")
                
                # Common dictionary keys for stored models
                possible_keys = ['model', 'classifier', 'estimator', 'rf_model', 'trained_model']
                model_found = False
                
                for key in possible_keys:
                    if key in loaded_data and hasattr(loaded_data[key], 'predict'):
                        self.model = loaded_data[key]
                        print(f"✅ Model found in dict key '{key}': {type(self.model)}")
                        model_found = True
                        break
                
                if not model_found:
                    # Try to find any object with predict method
                    for key, value in loaded_data.items():
                        if hasattr(value, 'predict'):
                            self.model = value
                            print(f"✅ Model found in dict key '{key}': {type(self.model)}")
                            model_found = True
                            break
                
                if not model_found:
                    raise ValueError(f"No model with 'predict' method found in pickle file. Dictionary contains: {list(loaded_data.keys())}")

                # Extract scaler and other components from the same dictionary
                if 'scaler' in loaded_data:
                    self.scaler = loaded_data['scaler']
                    print(f"✅ Scaler extracted: {type(self.scaler)}")
                    print(f"✅ Scaler has transform method: {hasattr(self.scaler, 'transform')}")
                else:
                    self.scaler = None
                    print("❌ No scaler found in pickle file")

                # Extract other components
                self.label_encoder = loaded_data.get('label_encoder', None)
                self.feature_columns = loaded_data.get('feature_columns', None)

                if self.label_encoder:
                    print(f"✅ Label encoder found: {type(self.label_encoder)}")
                if self.feature_columns:
                    print(f"✅ Feature columns found: {len(self.feature_columns)} features")
            else:
                raise ValueError(f"Unexpected pickle file content type: {type(loaded_data)}")
            
            # Load model metadata
            with open(model_metadata_path, 'r') as f:
                self.model_metadata = json.load(f)
            
            print(f"✅ Model loaded successfully")
            print(f"   Classes: {self.model_metadata['pose_classes']}")
            print(f"   Features: {self.model_metadata['n_features']}")
            print(f"   Accuracy: {self.model_metadata['test_accuracy']:.3f}")
            
        except FileNotFoundError as e:
            print(f"❌ Model files not found: {e}")
            self.model = None
            self.model_metadata = None
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.model = None
            self.model_metadata = None
    
    def extract_features(self, landmarks: List[Dict]) -> Optional[np.ndarray]:
        """Extract features from MediaPipe landmarks"""
        if not landmarks or len(landmarks) != 33:
            return None
        
        features = []
        for landmark in landmarks:
            features.extend([
                landmark.get('x', 0.0),
                landmark.get('y', 0.0), 
                landmark.get('z', 0.0),
                landmark.get('visibility', 0.0)
            ])
        
        return np.array(features).reshape(1, -1)
    
    def classify_pose(self, landmarks: List[Dict], from_web: bool = False) -> Dict:  # Changed default to False for testing
        """Classify pose using the trained model"""
        if not self.model or not self.model_metadata:
            return {
                'pose': 'unknown',
                'confidence': 0.0,
                'error': 'Model not loaded'
            }
        
        try:
            # Make a copy to avoid modifying original landmarks
            landmarks_for_classification = copy.deepcopy(landmarks)
            
            # Debug: Check landmark positions before and after flipping
            if from_web:
                landmarks_for_classification = self.transform_web_landmarks(landmarks_for_classification)
                print("🔄 Transformed landmarks to match training format")
            
            # Extract features
            features = self.extract_features(landmarks_for_classification)
            if features is None:
                return {
                    'pose': 'unknown',
                    'confidence': 0.0,
                    'error': 'Invalid landmarks - expected 33 landmarks'
                }
            
            print(f"🔍 Features shape before scaling: {features.shape}")
            print(f"🔍 Features sample (first 8): {features[0][:8]}")
            
            # Apply scaler if available (this was used during training)
            if self.scaler is not None:
                try:
                    features_scaled = self.scaler.transform(features)
                    print(f"✅ Features scaled successfully")
                    print(f"🔍 Features after scaling (first 8): {features_scaled[0][:8]}")
                except Exception as scale_error:
                    return {
                        'pose': 'unknown',
                        'confidence': 0.0,
                        'error': f'Scaling failed: {str(scale_error)}'
                    }
            else:
                features_scaled = features
                print("⚠️ No scaler applied - using raw features")
            
            # Make prediction
            print(f"🤖 Making prediction with model: {type(self.model)}")
            prediction = self.model.predict(features_scaled)[0]
            probabilities = self.model.predict_proba(features_scaled)[0]
            
            print(f"📊 Raw prediction: {prediction} (type: {type(prediction)})")
            print(f"📊 Raw probabilities shape: {probabilities.shape}")
            
            # Convert numpy types to Python types and map to class names
            class_names = self.model_metadata['pose_classes']  # ['idle', 'left_hand_up', 'right_hand_up', 'two_hand_up']
            
            # Map integer prediction to class name
            if isinstance(prediction, (int, np.integer)):
                predicted_class_name = class_names[int(prediction)]
            else:
                predicted_class_name = str(prediction)
            
            print(f"📊 Mapped prediction: {predicted_class_name}")
            
            # Get confidence (probability of predicted class)
            confidence = float(probabilities[int(prediction)])
            
            # Create probabilities dictionary with class names as keys
            probabilities_dict = {}
            for i, class_name in enumerate(class_names):
                probabilities_dict[class_name] = float(probabilities[i])
            
            print(f"📊 Final probabilities: {probabilities_dict}")
            
            # Find the highest probability
            max_prob = max(probabilities_dict.values())
            if max_prob < 0.5:
                print(f"⚠️ Low confidence! Max probability only {max_prob:.3f}")
            
            return {
                'pose': predicted_class_name,
                'confidence': confidence,
                'probabilities': probabilities_dict,
                'error': None
            }
        
        except Exception as e:
            print(f"❌ Classification error: {str(e)}")
            print(f"❌ Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                'pose': 'unknown',
                'confidence': 0.0,
                'error': f'Classification failed: {str(e)}'
            }

# Global classifier instance
pose_classifier = PoseClassifier()

class LandmarkData(BaseModel):
    landmarks: List[Dict]
    from_web: bool = False  # Add this field to control flipping

@model_pose_router.post("/classify-pose")
async def classify_pose_endpoint(data: LandmarkData):
    """API endpoint to classify pose using the trained model"""
    try:
        # Use from_web parameter from request, default to False for testing
        result = pose_classifier.classify_pose(data.landmarks, from_web=data.from_web)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")
@model_pose_router.post("/test-with-training-sample")
async def test_with_training_sample():
    """Test model with actual training data sample"""
    # Use the first row from your training data
    training_sample = {
        "landmarks": [
        {"x": 0.5063546299934387, "y": 0.1938425600528717, "z": -0.34449639916419983, "visibility": 0.9999966621398926},
        {"x": 0.5263605117797852, "y": 0.17863211035728455, "z": -0.31214940547943115, "visibility": 0.9999815225601196},
        {"x": 0.5376111268997192, "y": 0.17915558815002441, "z": -0.3122340142726898, "visibility": 0.9999792575836182},
        {"x": 0.5470911264419556, "y": 0.17948518693447113, "z": -0.3122689723968506, "visibility": 0.9999809265136719},
        {"x": 0.49001678824424744, "y": 0.1791742444038391, "z": -0.30654609203338623, "visibility": 0.9999841451644897},
        {"x": 0.478408545255661, "y": 0.18009522557258606, "z": -0.30655843019485474, "visibility": 0.9999806880950928},
        {"x": 0.4685399532318115, "y": 0.1810256838798523, "z": -0.3067154288291931, "visibility": 0.9999815225601196},
        {"x": 0.5614432096481323, "y": 0.18823164701461792, "z": -0.12055385857820511, "visibility": 0.9999682903289795},
        {"x": 0.46019479632377625, "y": 0.1906941831111908, "z": -0.09441732615232468, "visibility": 0.9999712705612183},
        {"x": 0.530253529548645, "y": 0.21294790506362915, "z": -0.27218833565711975, "visibility": 0.9999963045120239},
        {"x": 0.48424282670021057, "y": 0.21194154024124146, "z": -0.2646753787994385, "visibility": 0.9999957084655762},
        {"x": 0.6554185152053833, "y": 0.3168092966079712, "z": -0.044205423444509506, "visibility": 0.999987006187439},
        {"x": 0.3610011339187622, "y": 0.3059317171573639, "z": -0.058651234954595566, "visibility": 0.999977707862854},
        {"x": 0.6825315356254578, "y": 0.447589248418808, "z": 0.019664432853460312, "visibility": 0.9951335787773132},
        {"x": 0.3169190287590027, "y": 0.4419243037700653, "z": 0.006843109615147114, "visibility": 0.9797950983047485},
        {"x": 0.6769939661026001, "y": 0.5722812414169312, "z": -0.12634563446044922, "visibility": 0.9942722320556641},
        {"x": 0.2856692373752594, "y": 0.5648965835571289, "z": -0.11155251413583755, "visibility": 0.9627142548561096},
        {"x": 0.6844378709793091, "y": 0.6103689074516296, "z": -0.17950129508972168, "visibility": 0.9885606169700623},
        {"x": 0.2661958336830139, "y": 0.6011515855789185, "z": -0.16285814344882965, "visibility": 0.9407200813293457},
        {"x": 0.653214693069458, "y": 0.6084451079368591, "z": -0.24868975579738617, "visibility": 0.9886865615844727},
        {"x": 0.28635096549987793, "y": 0.6011930108070374, "z": -0.24265113472938538, "visibility": 0.9437695741653442},
        {"x": 0.6422914266586304, "y": 0.5977939963340759, "z": -0.15258829295635223, "visibility": 0.9867932200431824},
        {"x": 0.29725372791290283, "y": 0.5897520780563354, "z": -0.1463814377784729, "visibility": 0.9450177550315857},
        {"x": 0.5725463628768921, "y": 0.571648359298706, "z": 0.016057800501585007, "visibility": 0.9998593330383301},
        {"x": 0.4013678729534149, "y": 0.5671505331993103, "z": -0.01637044921517372, "visibility": 0.999904990196228},
        {"x": 0.5753858089447021, "y": 0.7541574239730835, "z": -0.04507537931203842, "visibility": 0.9887307286262512},
        {"x": 0.3634541928768158, "y": 0.7460417151451111, "z": -0.0938466340303421, "visibility": 0.9907237887382507},
        {"x": 0.5473830699920654, "y": 0.9162116646766663, "z": 0.30063197016716003, "visibility": 0.9758583307266235},
        {"x": 0.38134056329727173, "y": 0.939193069934845, "z": 0.2126188576221466, "visibility": 0.9813521504402161},
        {"x": 0.5202038884162903, "y": 0.939806342124939, "z": 0.31735071539878845, "visibility": 0.7779425978660583},
        {"x": 0.3986777663230896, "y": 0.958271861076355, "z": 0.22586023807525635, "visibility": 0.7634038925170898},
        {"x": 0.5915625691413879, "y": 0.9780257940292358, "z": 0.055102646350860596, "visibility": 0.9606612920761108},
        {"x": 0.33156684041023254, "y": 0.9923865795135498, "z": -0.06463849544525146, "visibility": 0.9651010632514954}
]
    }
    
    result = pose_classifier.classify_pose(training_sample["landmarks"], from_web=False)
    print(f"Training data classification: {result}")
    
    return JSONResponse(content={
        "test_type": "training_data_sample",
        "result": result
    })
@model_pose_router.get("/test-model")
async def test_model():
    """Test the model with dummy data"""
    try:
        print("🧪 Testing model with dummy data...")
        
        # Create dummy landmarks (33 landmarks with basic values)
        dummy_landmarks = []
        for i in range(33):
            dummy_landmarks.append({
                "x": 0.5,
                "y": 0.5,
                "z": 0.0,
                "visibility": 0.9
            })
        
        print(f"✅ Created {len(dummy_landmarks)} dummy landmarks")
        
        # Test the classifier without flipping
        result = pose_classifier.classify_pose(dummy_landmarks, from_web=False)
        print(f"📊 Test result: {result}")
        
        return JSONResponse(content={
            "test_status": "success",
            "model_loaded": pose_classifier.model is not None,
            "scaler_loaded": getattr(pose_classifier, 'scaler', None) is not None,
            "dummy_result": result
        })
        
    except Exception as e:
        print(f"❌ Model test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={
            "test_status": "failed",
            "error": str(e)
        })

@model_pose_router.get("/debug-model")  
async def debug_model():
    """Debug model loading"""
    return JSONResponse(content={
        "model_loaded": pose_classifier.model is not None,
        "scaler_loaded": getattr(pose_classifier, 'scaler', None) is not None,
        "model_type": str(type(pose_classifier.model)) if pose_classifier.model else None,
        "scaler_type": str(type(getattr(pose_classifier, 'scaler', None))) if getattr(pose_classifier, 'scaler', None) else None
    })

@model_pose_router.get("/model-info")
async def get_model_info():
    """Get information about the loaded model"""
    if pose_classifier.model_metadata:
        return JSONResponse(content={
            'status': 'loaded',
            'classes': pose_classifier.model_metadata['pose_classes'],
            'n_features': pose_classifier.model_metadata['n_features'],
            'accuracy': pose_classifier.model_metadata['test_accuracy'],
            'training_date': pose_classifier.model_metadata['training_date']
        })
    else:
        return JSONResponse(content={
            'status': 'not_loaded',
            'error': 'Model files not found or failed to load'
        })

@model_pose_router.get("/pose_tracker/demo")
async def model_based_demo(
    request: Request,
    token: str = None,
    width: float = None,
    height: float = None,
    skeleton: bool = True
):
    """Model-based guided demo with real pose classification"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>AI Pose Demo - Trained Model</title>
        <style>
            body, html {{
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                flex-direction: column;
            }}
            
            .demo-container {{
                flex: 1;
                position: relative;
                display: flex;
                flex-direction: column;
            }}
            
            .video-container {{
                flex: 1;
                position: relative;
                overflow: hidden;
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
                pointer-events: none;
                transform: scaleX(-1);
            }}
            
            /* Model Status Indicator */
            .model-status {{
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #4CAF50;
                padding: 8px 12px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: 600;
                z-index: 150;
                border: 1px solid #4CAF50;
            }}
            
            .model-status.error {{
                color: #ff4c48;
                border-color: #ff4c48;
            }}
            
            /* Instruction Panel */
            .instruction-panel {{
                position: absolute;
                top: 20px;
                left: 20px;
                right: 100px;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 20px;
                z-index: 100;
                border: 2px solid #ff4c48;
                transition: all 0.3s ease;
            }}
            
            .instruction-title {{
                color: #ff4c48;
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 8px;
                text-align: center;
            }}
            
            .instruction-text {{
                color: white;
                font-size: 16px;
                text-align: center;
                margin-bottom: 10px;
                line-height: 1.3;
            }}
            
            .step-counter {{
                color: #4ECDC4;
                font-size: 14px;
                text-align: center;
                margin-bottom: 8px;
            }}
            
            /* Confidence Meter */
            .confidence-container {{
                position: absolute;
                bottom: 120px;
                left: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                border-radius: 15px;
                padding: 15px;
                z-index: 90;
            }}
            
            .confidence-label {{
                color: white;
                font-size: 14px;
                text-align: center;
                margin-bottom: 8px;
                font-weight: 600;
            }}
            
            .confidence-bars {{
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 10px;
            }}
            
            .confidence-bar {{
                text-align: center;
            }}
            
            .confidence-bar-label {{
                font-size: 11px;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 4px;
                text-transform: capitalize;
            }}
            
            .confidence-bar-fill {{
                height: 6px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
                overflow: hidden;
            }}
            
            .confidence-bar-progress {{
                height: 100%;
                background: linear-gradient(45deg, #ff4c48, #4ECDC4);
                border-radius: 3px;
                transition: width 0.3s ease;
                width: 0%;
            }}
            
            .confidence-bar-value {{
                font-size: 10px;
                color: white;
                margin-top: 2px;
                font-weight: 600;
            }}
            
            /* Success Animation */
            .success-flash {{
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(76, 175, 80, 0.3);
                opacity: 0;
                pointer-events: none;
                z-index: 50;
                animation: successFlash 0.6s ease-out;
            }}
            
            @keyframes successFlash {{
                0% {{ opacity: 0; }}
                50% {{ opacity: 1; }}
                100% {{ opacity: 0; }}
            }}
            
            /* Progress Bar */
            .progress-container {{
                background: rgba(0, 0, 0, 0.8);
                padding: 15px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }}
            
            .progress-bar {{
                flex: 1;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                overflow: hidden;
                margin: 0 15px;
            }}
            
            .progress-fill {{
                height: 100%;
                background: linear-gradient(45deg, #ff4c48, #4ECDC4);
                border-radius: 4px;
                transition: width 0.5s ease;
                width: 0%;
            }}
            
            .progress-text {{
                color: white;
                font-size: 14px;
                font-weight: 600;
                min-width: 60px;
                text-align: center;
            }}
            
            /* Loading overlay */
            .loading-overlay {{
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 200;
            }}
            
            .loading-spinner {{
                border: 3px solid rgba(255, 76, 72, 0.3);
                border-top: 3px solid #ff4c48;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            }}
            
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
            
            .loading-text {{
                color: white;
                font-size: 18px;
                text-align: center;
                margin-bottom: 10px;
            }}
            
            .loading-subtext {{
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                text-align: center;
            }}
            
            /* Complete screen */
            .complete-overlay {{
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 300;
                opacity: 0;
                transform: scale(0.9);
                transition: all 0.5s ease;
            }}
            
            .complete-overlay.show {{
                opacity: 1;
                transform: scale(1);
            }}
            
            .complete-icon {{
                font-size: 80px;
                margin-bottom: 20px;
            }}
            
            .complete-title {{
                color: #4CAF50;
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
                text-align: center;
            }}
            
            .complete-subtitle {{
                color: white;
                font-size: 18px;
                text-align: center;
                margin-bottom: 30px;
            }}
            
            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }}
            
            .stat-item {{
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
            }}
            
            .stat-value {{
                color: #ff4c48;
                font-size: 24px;
                font-weight: bold;
            }}
            
            .stat-label {{
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                margin-top: 5px;
            }}
        </style>
    </head>
    <body>
        <div class="demo-container">
            <!-- Loading Overlay -->
            <div class="loading-overlay" id="loadingOverlay">
                <div class="loading-spinner"></div>
                <div class="loading-text">Starting AI Demo Session</div>
                <div class="loading-subtext">Loading trained pose classification model...</div>
            </div>
            
            <!-- Video Container -->
            <div class="video-container">
                <video id="videoElement" autoplay playsinline muted></video>
                <canvas id="canvasOverlay"></canvas>
                
                <!-- Model Status -->
                <div class="model-status" id="modelStatus">
                    Loading Model...
                </div>
                
                <!-- Success Flash Effect -->
                <div class="success-flash" id="successFlash"></div>
                
                <!-- Instruction Panel -->
                <div class="instruction-panel" id="instructionPanel">
                    <div class="step-counter" id="stepCounter">Step 1 of 4</div>
                    <div class="instruction-title" id="instructionTitle">Get Ready!</div>
                    <div class="instruction-text" id="instructionText">
                        Stand in front of the camera and wait for AI model initialization
                    </div>
                </div>
                
                <!-- Confidence Meter -->
                <div class="confidence-container" id="confidenceContainer">
                    <div class="confidence-label">AI Model Confidence</div>
                    <div class="confidence-bars" id="confidenceBars">
                        <div class="confidence-bar">
                            <div class="confidence-bar-label">idle</div>
                            <div class="confidence-bar-fill">
                                <div class="confidence-bar-progress" id="conf-idle"></div>
                            </div>
                            <div class="confidence-bar-value" id="val-idle">0%</div>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-bar-label">left hand</div>
                            <div class="confidence-bar-fill">
                                <div class="confidence-bar-progress" id="conf-left_hand_up"></div>
                            </div>
                            <div class="confidence-bar-value" id="val-left_hand_up">0%</div>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-bar-label">right hand</div>
                            <div class="confidence-bar-fill">
                                <div class="confidence-bar-progress" id="conf-right_hand_up"></div>
                            </div>
                            <div class="confidence-bar-value" id="val-right_hand_up">0%</div>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-bar-label">both hands</div>
                            <div class="confidence-bar-fill">
                                <div class="confidence-bar-progress" id="conf-two_hand_up"></div>
                            </div>
                            <div class="confidence-bar-value" id="val-two_hand_up">0%</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="progress-container">
                <div class="progress-text" id="progressStart">0%</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressEnd">100%</div>
            </div>
            
            <!-- Completion Overlay -->
            <div class="complete-overlay" id="completeOverlay">
                <div class="complete-icon">🎉</div>
                <div class="complete-title">AI Demo Complete!</div>
                <div class="complete-subtitle">You've mastered AI-powered pose detection</div>
                
                <div class="stats-grid" id="statsGrid">
                    <div class="stat-item">
                        <div class="stat-value" id="statSteps">4</div>
                        <div class="stat-label">Steps Completed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="statTime">--</div>
                        <div class="stat-label">Time Taken</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="statAccuracy">--</div>
                        <div class="stat-label">AI Accuracy</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="statScore">--</div>
                        <div class="stat-label">Demo Score</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MediaPipe Dependencies -->
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>

        <script>
            class ModelBasedPoseDemo {{
                constructor() {{
                    this.currentStep = 0;
                    this.startTime = Date.now();
                    this.completedSteps = [];
                    this.poseHoldTime = 2000; // Hold pose for 2 seconds
                    this.currentPoseStartTime = null;
                    this.isHoldingCorrectPose = false;
                    this.classificationRequestActive = false;
                    this.modelLoaded = false;
                    this.lastClassificationResult = null;
                    
                    // Demo sequence
                    this.demoSteps = [
                        {{
                            pose: 'idle',
                            title: 'Step 1: Stand Naturally',
                            instruction: 'Stand naturally with your arms at your sides. The AI will detect your idle pose.',
                            nextPose: 'right_hand_up'
                        }},
                        {{
                            pose: 'right_hand_up', 
                            title: 'Step 2: Raise Right Hand',
                            instruction: 'Raise your right hand up high above your head. The AI will recognize this pose.',
                            nextPose: 'left_hand_up'
                        }},
                        {{
                            pose: 'left_hand_up',
                            title: 'Step 3: Raise Left Hand', 
                            instruction: 'Lower your right hand and raise your left hand up high. Hold until AI confirms.',
                            nextPose: 'two_hand_up'
                        }},
                        {{
                            pose: 'two_hand_up',
                            title: 'Step 4: Raise Both Hands',
                            instruction: 'Raise both hands up high above your head. The AI will complete the demo!',
                            nextPose: 'complete'
                        }}
                    ];
                    
                    this.initializeElements();
                    this.checkModelStatus();
                }}
                
                initializeElements() {{
                    this.video = document.getElementById('videoElement');
                    this.canvas = document.getElementById('canvasOverlay');
                    this.ctx = this.canvas.getContext('2d');
                    
                    this.loadingOverlay = document.getElementById('loadingOverlay');
                    this.modelStatus = document.getElementById('modelStatus');
                    this.instructionPanel = document.getElementById('instructionPanel');
                    this.stepCounter = document.getElementById('stepCounter');
                    this.instructionTitle = document.getElementById('instructionTitle');
                    this.instructionText = document.getElementById('instructionText');
                    this.confidenceContainer = document.getElementById('confidenceContainer');
                    this.progressFill = document.getElementById('progressFill');
                    this.progressStart = document.getElementById('progressStart');
                    this.successFlash = document.getElementById('successFlash');
                    this.completeOverlay = document.getElementById('completeOverlay');
                }}
                
                async checkModelStatus() {{
                    try {{
                        const response = await fetch('/model-info');
                        const modelInfo = await response.json();
                        
                        if (modelInfo.status === 'loaded') {{
                            this.modelLoaded = true;
                            this.modelStatus.textContent = `AI Model Ready (Acc: ${{(modelInfo.accuracy * 100).toFixed(1)}}%)`;
                            this.modelStatus.className = 'model-status';
                            await this.initializePoseDetection();
                        }} else {{
                            this.modelStatus.textContent = 'AI Model Error';
                            this.modelStatus.className = 'model-status error';
                            throw new Error('Model not loaded');
                        }}
                    }} catch (error) {{
                        console.error('Model status check failed:', error);
                        this.modelStatus.textContent = 'AI Model Unavailable';
                        this.modelStatus.className = 'model-status error';
                        this.loadingOverlay.querySelector('.loading-text').textContent = 'AI Model Loading Failed';
                        this.loadingOverlay.querySelector('.loading-subtext').textContent = 'Please check server connection';
                    }}
                }}
                
                async initializePoseDetection() {{
                    try {{
                        // Initialize MediaPipe Pose
                        this.pose = new Pose({{
                            locateFile: (file) => {{
                                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${{file}}`;
                            }}
                        }});
                        
                        this.pose.setOptions({{
                            modelComplexity: 1,
                            smoothLandmarks: true,
                            enableSegmentation: false,
                            minDetectionConfidence: 0.7,
                            minTrackingConfidence: 0.5
                        }});
                        
                        this.pose.onResults((results) => this.onPoseResults(results));
                        
                        // Initialize camera
                        const stream = await navigator.mediaDevices.getUserMedia({{
                            video: {{ facingMode: 'user', width: 640, height: 480 }},
                            audio: false
                        }});
                        
                        this.video.srcObject = stream;
                        
                        this.video.onloadedmetadata = () => {{
                            this.updateCanvasSize();
                            this.hideLoading();
                            this.startProcessing();
                        }};
                        
                    }} catch (error) {{
                        console.error('Failed to initialize pose detection:', error);
                        this.modelStatus.textContent = 'Camera initialization failed';
                        this.modelStatus.className = 'model-status error';
                    }}
                }}
                
                updateCanvasSize() {{
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    
                    // Make canvas match video display size
                    const rect = this.video.getBoundingClientRect();
                    this.canvas.style.width = rect.width + 'px';
                    this.canvas.style.height = rect.height + 'px';
                }}
                
                hideLoading() {{
                    this.loadingOverlay.style.display = 'none';
                    this.updateInstruction();
                }}
                
                startProcessing() {{
                    const processFrame = async () => {{
                        if (this.video.readyState >= 2) {{
                            await this.pose.send({{ image: this.video }});
                        }}
                        requestAnimationFrame(processFrame);
                    }};
                    processFrame();
                }}
                
                async onPoseResults(results) {{
                    // Clear canvas
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    if (results.poseLandmarks) {{
                        // Draw pose skeleton
                        this.drawPose(results.poseLandmarks);
                        
                        // Classify pose using trained model
                        if (!this.classificationRequestActive) {{
                            this.classifyPoseWithModel(results.poseLandmarks);
                        }}
                    }} else {{
                        this.updateConfidenceDisplay(null);
                        this.resetPoseHold();
                    }}
                }}
                
                async classifyPoseWithModel(landmarks) {{
                    if (!this.modelLoaded) return;
                    
                    this.classificationRequestActive = true;
                    
                    try {{
                        // Convert MediaPipe landmarks to the format expected by the model
                        const landmarkData = landmarks.map(lm => ({{
                            x: lm.x,
                            y: lm.y, 
                            z: lm.z,
                            visibility: lm.visibility
                        }}));
                        
                        const response = await fetch('/classify-pose', {{
                            method: 'POST',
                            headers: {{
                                'Content-Type': 'application/json',
                            }},
                            body: JSON.stringify({{ landmarks: landmarkData }})
                        }});
                        
                        if (response.ok) {{
                            const result = await response.json();
                            this.lastClassificationResult = result;
                            
                            if (!result.error) {{
                                this.updateConfidenceDisplay(result);
                                this.handlePoseDetection(result.pose, result.confidence);
                            }} else {{
                                console.error('Classification error:', result.error);
                            }}
                        }}
                    }} catch (error) {{
                        console.error('Error classifying pose:', error);
                    }} finally {{
                        this.classificationRequestActive = false;
                    }}
                }}
                
                updateConfidenceDisplay(result) {{
                    const poses = ['idle', 'left_hand_up', 'right_hand_up', 'two_hand_up'];
                    
                    poses.forEach(pose => {{
                        const progressElement = document.getElementById(`conf-${{pose}}`);
                        const valueElement = document.getElementById(`val-${{pose}}`);
                        
                        if (result && result.probabilities) {{
                            const confidence = result.probabilities[pose] || 0;
                            const percentage = Math.round(confidence * 100);
                            
                            progressElement.style.width = percentage + '%';
                            valueElement.textContent = percentage + '%';
                            
                            // Highlight the predicted pose
                            if (result.pose === pose && confidence > 0.7) {{
                                progressElement.style.background = 'linear-gradient(45deg, #4CAF50, #8BC34A)';
                            }} else {{
                                progressElement.style.background = 'linear-gradient(45deg, #ff4c48, #4ECDC4)';
                            }}
                        }} else {{
                            progressElement.style.width = '0%';
                            valueElement.textContent = '0%';
                        }}
                    }});
                }}
                
                drawPose(landmarks) {{
                    const connections = POSE_CONNECTIONS || [
                        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
                        [11, 23], [12, 24], [23, 24],
                        [23, 25], [24, 26], [25, 27], [26, 28]
                    ];
                    
                    // Draw connections
                    this.ctx.strokeStyle = '#ff4c48';
                    this.ctx.lineWidth = 3;
                    this.ctx.lineCap = 'round';
                    
                    connections.forEach(([start, end]) => {{
                        const startPoint = landmarks[start];
                        const endPoint = landmarks[end];
                        
                        if (startPoint && endPoint && 
                            startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {{
                            
                            this.ctx.beginPath();
                            this.ctx.moveTo(
                                startPoint.x * this.canvas.width,
                                startPoint.y * this.canvas.height
                            );
                            this.ctx.lineTo(
                                endPoint.x * this.canvas.width,
                                endPoint.y * this.canvas.height
                            );
                            this.ctx.stroke();
                        }}
                    }});
                    
                    // Draw landmarks
                    landmarks.forEach((landmark, index) => {{
                        if (landmark.visibility > 0.5) {{
                            const x = landmark.x * this.canvas.width;
                            const y = landmark.y * this.canvas.height;
                            
                            this.ctx.fillStyle = index < 11 ? '#4ECDC4' : '#45B7D1';
                            this.ctx.beginPath();
                            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
                            this.ctx.fill();
                            
                            this.ctx.strokeStyle = 'white';
                            this.ctx.lineWidth = 2;
                            this.ctx.stroke();
                        }}
                    }});
                }}
                
                handlePoseDetection(detectedPose, confidence) {{
                    if (this.currentStep >= this.demoSteps.length) {{
                        return; // Demo completed
                    }}
                    
                    const currentStepData = this.demoSteps[this.currentStep];
                    const expectedPose = currentStepData.pose;
                    
                    // Require high confidence for pose confirmation
                    if (detectedPose === expectedPose && confidence > 0.8) {{
                        if (!this.isHoldingCorrectPose) {{
                            this.currentPoseStartTime = Date.now();
                            this.isHoldingCorrectPose = true;
                        }}
                        
                        const holdDuration = Date.now() - this.currentPoseStartTime;
                        const progress = Math.min(holdDuration / this.poseHoldTime, 1);
                        
                        // Update instruction to show progress
                        if (progress < 1) {{
                            const remainingTime = Math.ceil((this.poseHoldTime - holdDuration) / 1000);
                            this.instructionText.textContent = `Perfect! AI detected correct pose. Hold for ${{remainingTime}} more seconds...`;
                        }}
                        
                        if (holdDuration >= this.poseHoldTime) {{
                            this.completeStep();
                        }}
                    }} else {{
                        this.resetPoseHold();
                        
                        // Show what AI currently sees
                        if (confidence > 0.6) {{
                            const confidencePercent = Math.round(confidence * 100);
                            this.instructionText.textContent = `AI sees: ${{detectedPose.replace('_', ' ')}} (${{confidencePercent}}%) | Need: ${{expectedPose.replace('_', ' ')}}`;
                        }} else {{
                            this.instructionText.textContent = this.demoSteps[this.currentStep].instruction;
                        }}
                    }}
                }}
                
                resetPoseHold() {{
                    this.isHoldingCorrectPose = false;
                    this.currentPoseStartTime = null;
                }}
                
                completeStep() {{
                    this.completedSteps.push(this.currentStep);
                    this.showSuccessFlash();
                    this.resetPoseHold();
                    
                    // Send step completion to React Native
                    this.sendToReactNative({{
                        type: 'demo_step_complete',
                        step_index: this.currentStep,
                        step_name: this.demoSteps[this.currentStep].pose,
                        total_steps: this.demoSteps.length,
                        ai_confidence: this.lastClassificationResult?.confidence || 0
                    }});
                    
                    this.currentStep++;
                    
                    if (this.currentStep >= this.demoSteps.length) {{
                        setTimeout(() => this.completeDemo(), 1000);
                    }} else {{
                        setTimeout(() => this.updateInstruction(), 500);
                    }}
                    
                    this.updateProgress();
                }}
                
                showSuccessFlash() {{
                    this.successFlash.style.display = 'block';
                    this.successFlash.style.animation = 'none';
                    this.successFlash.offsetHeight;
                    this.successFlash.style.animation = 'successFlash 0.6s ease-out';
                    
                    setTimeout(() => {{
                        this.successFlash.style.display = 'none';
                    }}, 600);
                }}
                
                updateInstruction() {{
                    if (this.currentStep >= this.demoSteps.length) return;
                    
                    const stepData = this.demoSteps[this.currentStep];
                    this.stepCounter.textContent = `Step ${{this.currentStep + 1}} of ${{this.demoSteps.length}}`;
                    this.instructionTitle.textContent = stepData.title;
                    this.instructionText.textContent = stepData.instruction;
                    
                    // Send status update
                    this.sendToReactNative({{
                        type: 'demo_status',
                        step: stepData.pose,
                        step_index: this.currentStep,
                        instruction: stepData.instruction
                    }});
                }}
                
                updateProgress() {{
                    const progress = (this.currentStep / this.demoSteps.length) * 100;
                    this.progressFill.style.width = progress + '%';
                    this.progressStart.textContent = Math.round(progress) + '%';
                }}
                
                completeDemo() {{
                    const totalTime = Date.now() - this.startTime;
                    const minutes = Math.floor(totalTime / 60000);
                    const seconds = Math.floor((totalTime % 60000) / 1000);
                    
                    // Calculate average AI confidence across all steps
                    const averageConfidence = 95; // Placeholder - could track actual confidence
                    
                    // Update completion stats
                    document.getElementById('statTime').textContent = `${{minutes}}:${{seconds.toString().padStart(2, '0')}}`;
                    document.getElementById('statAccuracy').textContent = averageConfidence + '%';
                    document.getElementById('statScore').textContent = '90'; // AI-based score
                    
                    // Show completion screen
                    this.completeOverlay.classList.add('show');
                    
                    // Send completion to React Native
                    this.sendToReactNative({{
                        type: 'demo_complete',
                        steps_completed: this.completedSteps.length,
                        total_time: totalTime,
                        ai_accuracy: averageConfidence,
                        score: 90
                    }});
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
                        
                        console.log('Sent to React Native:', data);
                    }} catch (error) {{
                        console.error('Error sending message to React Native:', error);
                    }}
                }}
            }}
            
            // Initialize demo when page loads
            document.addEventListener('DOMContentLoaded', () => {{
                new ModelBasedPoseDemo();
            }});
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)