from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import cv2
import tempfile
import os
import time

# Import your detection generator
from safeVision_Backend.services.detection_service import generate_detection_frames

router = APIRouter(prefix="/detection", tags=["Accident Detection"])

# Global storage for the last uploaded video
last_uploaded = {
    "path": None,
    "name": None,
    "fps": None,
    "uploaded_at": 0.0
}

@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    global last_uploaded

    allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid video format")

    video_bytes = await file.read()
    if len(video_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty video file")

    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp:
        temp.write(video_bytes)
        temp.flush()
        video_path = temp.name

    # Get FPS
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        os.unlink(video_path)
        raise HTTPException(status_code=500, detail="Cannot open video")
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.release()

    # Store info
    last_uploaded = {
        "path": video_path,
        "name": file.filename.rsplit(".", 1)[0],
        "fps": fps,
        "uploaded_at": time.time()
    }

    return JSONResponse({
        "status": "uploaded",
        "fps": fps,
        "video_id": f"vid_{int(time.time() * 1000)}"
    })


@router.get("/stream-detection")
async def stream_detection():
    global last_uploaded

    if not last_uploaded["path"]:
        raise HTTPException(status_code=404, detail="No video has been uploaded yet. Please upload a video first.")

    if not os.path.exists(last_uploaded["path"]):
        last_uploaded["path"] = None
        raise HTTPException(status_code=410, detail="Uploaded video file no longer exists")

    # Optional: check if file is too old
    if time.time() - last_uploaded["uploaded_at"] > 3600:  # 1 hour
        os.unlink(last_uploaded["path"])
        last_uploaded["path"] = None
        raise HTTPException(status_code=410, detail="Uploaded video has expired")

    return StreamingResponse(
        generate_detection_frames(
            video_bytes=None,
            video_name=last_uploaded["name"],
            video_path=last_uploaded["path"],
            camera_id=1
        ),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive"
        }
    )