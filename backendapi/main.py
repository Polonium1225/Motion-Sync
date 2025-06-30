from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uvicorn
from dotenv import load_dotenv
import socket

from live_pose_tracker import pose_tracking_router
from video_comparison import video_comparison_router

# Load environment variables
load_dotenv()

# Initialize FastAPI
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

# Include routers
app.include_router(pose_tracking_router)
app.include_router(video_comparison_router)

@app.get("/")
async def root():
    return {"message": "Pose Tracker and Comparison API is running"}

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, workers=4, reload=False)