import os
import socket
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Try to load environment variables (optional)
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment variables loaded")
except ImportError:
    print("⚠️  python-dotenv not installed, skipping .env file")

# Initialize FastAPI app
app = FastAPI(title="Pose Tracker and Comparison API")

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
os.makedirs("uploads", exist_ok=True)

# Get server URL
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

SERVER_URL = os.getenv("SERVER_URL", f"http://{get_local_ip()}:8000")
print(f"🌐 Server URL: {SERVER_URL}")

# Import routers AFTER FastAPI is initialized
pose_tracking_router = None
video_comparison_router = None

# Try to import pose tracking router
try:
    from simple_live_tracker import pose_tracking_router
    app.include_router(pose_tracking_router)
    print("✅ Pose tracking router loaded successfully")
except ImportError as e:
    print(f"❌ Could not import pose tracking: {e}")
    print("Make sure simple_live_tracker.py exists in the same directory")
except Exception as e:
    print(f"❌ Error loading pose tracking: {e}")

# Try to import video comparison router
try:
    from video_comparison import video_comparison_router
    app.include_router(video_comparison_router)
    print("✅ Video comparison router loaded successfully")
except ImportError:
    print("⚠️  Video comparison not available (optional)")
except Exception as e:
    print(f"❌ Error loading video comparison: {e}")

# Basic routes
@app.get("/")
async def root():
    return {
        "message": "Pose Tracker and Comparison API is running",
        "server_url": SERVER_URL,
        "features": {
            "pose_tracking": pose_tracking_router is not None,
            "video_comparison": video_comparison_router is not None
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "pose_tracking": pose_tracking_router is not None,
        "video_comparison": video_comparison_router is not None,
        "server_url": SERVER_URL
    }

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Run the server
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting server on http://0.0.0.0:{port}")
    print(f"📱 Pose tracking: {SERVER_URL}/pose_tracker/tracking")
    print(f"🏥 Health check: {SERVER_URL}/health")
    print("Press CTRL+C to stop the server")
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)