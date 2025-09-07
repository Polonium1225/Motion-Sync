import os
import socket
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


# Add this with your other includes


# Initialize FastAPI app
app = FastAPI(title="Advanced Pose Tracker and Movement Analysis API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create uploads directory
uploads_dir = "uploads"
os.makedirs(uploads_dir, exist_ok=True)
print(f"📁 Uploads directory: {os.path.abspath(uploads_dir)}")

# Get server URL (defaults to localhost, override with ngrok URL via environment variable)
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")
print(f"🌐 Server URL: {SERVER_URL}")

# Detect if running with ngrok
if "ngrok" in SERVER_URL:
    print("🔗 Running with ngrok tunnel")
else:
    print("🏠 Running on localhost (use ngrok for HTTPS tunnel)")

# Import and include routers
try:
    from video_comparison import video_comparison_router
    app.include_router(video_comparison_router)
    print("✅ Video comparison router loaded")
except Exception as e:
    print(f"❌ Video comparison error: {e}")


    
try:
    print("Attempting to import model_pose_classifier...")
    from model_pose_classifier import model_pose_router
    print(f"Router imported successfully: {type(model_pose_router)}")
    print(f"Router has {len(model_pose_router.routes)} routes")
    for route in model_pose_router.routes:
        print(f"  - {route.methods} {route.path}")
    
    app.include_router(model_pose_router)
    print("✅ Model-based pose classifier loaded")
except ImportError as ie:
    print(f"❌ Import Error: {ie}")
except AttributeError as ae:
    print(f"❌ Attribute Error: {ae}")
except Exception as e:
    print(f"❌ Model-based pose classifier error: {e}")
    import traceback
    traceback.print_exc()


try:
    from simple_live_tracker import pose_tracking_router
    app.include_router(pose_tracking_router)
    print("✅ Pose tracking router loaded")
except Exception as e:
    print(f"❌ Pose tracking error: {e}")

try:
    from multi_view_pose_estimation import multi_view_pose_router
    app.include_router(multi_view_pose_router)
    print("✅ Multi-view 3D pose estimation router loaded")
except Exception as e:
    print(f"❌ Multi-view pose estimation error: {e}")

# NEW: Import and include movement analysis router
try:
    from movement_analysis_backend import movement_analysis_router
    app.include_router(movement_analysis_router)
    print("✅ Advanced movement analysis router loaded")
except Exception as e:
    print(f"❌ Movement analysis error: {e}")

@app.get("/")
async def root():
    return {
        "message": "Advanced Pose Tracker API with Movement Analysis",
        "server_url": SERVER_URL,
        "status": "healthy",
        "features": [
            "Real-time pose tracking",
            "Video comparison analysis", 
            "Multi-view 3D pose estimation",
            "Synchronized multi-phone capture",
            "Advanced movement analysis with biomechanical insights"
        ]
    }
@app.get("/list-routes")
async def list_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": getattr(route, 'name', 'unnamed')
            })
    return {"routes": routes}
# Health check
@app.get("/health")
async def health():
    file_count = len([f for f in os.listdir(uploads_dir) if os.path.isfile(os.path.join(uploads_dir, f))])
    return {
        "status": "healthy",
        "uploads_count": file_count,
        "uploads_path": os.path.abspath(uploads_dir),
        "features_status": {
            "video_comparison": "active",
            "live_tracking": "active", 
            "multi_view_3d": "active",
            "movement_analysis": "active"
        }
    }

# API capabilities endpoint
@app.get("/api/capabilities")
async def get_api_capabilities():
    return {
        "pose_tracking": {
            "real_time": True,
            "landmarks": 33,
            "formats": ["video_stream", "webcam"]
        },
        "video_analysis": {
            "comparison": True,
            "formats": ["mp4", "mov", "avi"],
            "max_size": "100MB"
        },
        "multi_view_3d": {
            "min_cameras": 2,
            "max_cameras": 6,
            "optimal_cameras": 4,
            "supported_formats": ["jpg", "jpeg", "png"],
            "reconstruction_method": "triangulation"
        },
        "multi_phone": {
            "sync_capture": True,
            "communication": ["websocket", "wifi_direct", "bluetooth"],
            "master_slave_architecture": True
        },
        "movement_analysis": {
            "biomechanical_metrics": True,
            "joint_angle_analysis": True,
            "velocity_acceleration_tracking": True,
            "symmetry_analysis": True,
            "balance_assessment": True,
            "movement_smoothness": True,
            "center_of_mass_tracking": True,
            "power_metrics": True,
            "range_of_motion": True,
            "supported_formats": ["mp4", "mov", "avi", "webm"],
            "max_video_length": "10 minutes",
            "visualization_output": "interactive_dashboard"
        }
    }

# Debug files endpoint
@app.get("/test-files")
async def list_files():
    try:
        files = []
        for filename in os.listdir(uploads_dir):
            file_path = os.path.join(uploads_dir, filename)
            if os.path.isfile(file_path):
                file_size = os.path.getsize(file_path)
                
                # Determine file type
                file_type = "unknown"
                if filename.endswith('.mp4') or filename.endswith('.mov') or filename.endswith('.avi'):
                    file_type = "video"
                elif filename.endswith('.jpg') or filename.endswith('.jpeg') or filename.endswith('.png'):
                    file_type = "image"
                elif filename.startswith('processed_3d'):
                    file_type = "3d_pose"
                elif filename.startswith('movement_analysis'):
                    file_type = "movement_analysis_video"
                elif filename.startswith('analysis_results'):
                    file_type = "movement_analysis_results"
                elif filename.endswith('.png') and 'movement_analysis' in filename:
                    file_type = "movement_analysis_visualization"
                
                files.append({
                    "filename": filename,
                    "size": file_size,
                    "url": f"{SERVER_URL}/uploads/{filename}",
                    "type": file_type
                })
        
        return {
            "directory": os.path.abspath(uploads_dir),
            "count": len(files),
            "files": files,
            "storage_info": {
                "total_size": sum(f["size"] for f in files),
                "video_files": len([f for f in files if f["type"] == "video"]),
                "image_files": len([f for f in files if f["type"] == "image"]),
                "3d_results": len([f for f in files if f["type"] == "3d_pose"]),
                "movement_analysis_results": len([f for f in files if f["type"] == "movement_analysis_results"]),
                "movement_visualizations": len([f for f in files if f["type"] == "movement_analysis_visualization"])
            }
        }
    except Exception as e:
        return {"error": str(e)}

# Video/Image serving endpoint (MUST be before any other /uploads routes)
@app.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files (videos, images, 3D results, movement analysis)"""
    file_path = os.path.join(uploads_dir, filename)
    
    print(f"📂 Request for: {filename}")
    print(f"📁 Looking in: {file_path}")
    print(f"🔍 File exists: {os.path.exists(file_path)}")
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        available_files = [f for f in os.listdir(uploads_dir)]
        print(f"📋 Available files: {available_files[:10]}...")  # Show first 10
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    
    file_size = os.path.getsize(file_path)
    print(f"✅ Serving: {filename} ({file_size} bytes)")
    
    # Determine content type
    content_type = "application/octet-stream"  # Default
    if filename.lower().endswith(('.mp4', '.mov')):
        content_type = "video/mp4"
    elif filename.lower().endswith('.avi'):
        content_type = "video/x-msvideo"
    elif filename.lower().endswith('.webm'):
        content_type = "video/webm"
    elif filename.lower().endswith(('.jpg', '.jpeg')):
        content_type = "image/jpeg"
    elif filename.lower().endswith('.png'):
        content_type = "image/png"
    elif filename.lower().endswith('.json'):
        content_type = "application/json"
    
    return FileResponse(
        path=file_path,
        media_type=content_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Cache-Control": "no-cache"
        }
    )

# Error handling
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"Global exception: {exc}")
    import traceback
    traceback.print_exc()
    return {"error": "Internal server error", "detail": str(exc)}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting Advanced Pose Analysis Server on port {port}")
    print(f"📹 Video endpoint: {SERVER_URL}/uploads/[filename]")
    print(f"🎯 Live tracking: {SERVER_URL}/pose_tracker/tracking")
    print(f"🔄 Video comparison: {SERVER_URL}/compare")
    print(f"📐 3D multi-view: {SERVER_URL}/process-multi-view-poses")
    print(f"🏃‍♂️ Movement analysis dashboard: {SERVER_URL}/movement-analysis/dashboard")
    print(f"📊 Movement analysis API: {SERVER_URL}/movement-analysis/")
    print(f"🧪 Test endpoint: {SERVER_URL}/test-files")
    print(f"📊 API capabilities: {SERVER_URL}/api/capabilities")
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)