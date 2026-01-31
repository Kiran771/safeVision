import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from safeVision_Backend.services.detection_service import generate_detection_frames

router = APIRouter(prefix="/detection", tags=["Video Detection"])

@router.post("/detect-accident")
async def detect_accident(video: UploadFile = File(...)):
    """
    Upload a video file and get real-time accident detection stream
    Supported formats: .mp4, .avi, .mov, .mkv
    """
    # Validate file extension
    allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv'}
    file_ext = os.path.splitext(video.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid video format. Use .mp4, .avi, .mov, or .mkv")

    # Read video bytes
    video_bytes = await video.read()

    if len(video_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty video file")

    # Return streaming response
    return StreamingResponse(
        generate_detection_frames(video_bytes),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )