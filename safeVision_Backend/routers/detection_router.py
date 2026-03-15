import cv2
import tempfile
import os
import time
from fastapi import APIRouter, Response, UploadFile, File, HTTPException,Query
from fastapi.responses import JSONResponse, StreamingResponse
from safeVision_Backend.services.detection_service import generate_detection_frames


router = APIRouter(prefix="/detection", tags=["Accident Detection"])

# Global storage for the last uploaded video
last_uploaded = {
    "path": None,
    "name": None,
    "fps": None,
    'camera_id':1,
    "uploaded_at": 0.0
}

frame_generator = None

@router.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    camera_id:int = Query(default=1) 
):
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
        "camera_id": camera_id,
        "uploaded_at": time.time()
    }
    global frame_generator
    frame_generator = None 
    return JSONResponse({
        "status": "uploaded",
        "fps": fps,
        "video_id": f"vid_{int(time.time() * 1000)}"
    })


@router.post("/clear-video")
async def clear_video():
	global last_uploaded 
	if last_uploaded["path"] and os.path.exists(last_uploaded["path"]): 
		os.unlink(last_uploaded["path"]) 
	last_uploaded = {"path": None, "name": None,"fps": None, "camera_id": 1, "uploaded_at": 0.0} 
	return JSONResponse({"status": "cleared"})



@router.get("/next-frame")
async def get_next_frame():
    global frame_generator, last_uploaded

    if not last_uploaded["path"]:
        raise HTTPException(status_code=404, detail="No video uploaded")

    if frame_generator is None:
        frame_generator = generate_detection_frames(
            video_path = last_uploaded["path"],
            video_name = last_uploaded["name"],
            camera_id  = last_uploaded["camera_id"]
        )

    try:
        chunk = next(frame_generator)
        frame_number = 0
        acc_conf     = 0.0
        fire_conf    = 0.0
        image_bytes  = b""

        lines = chunk.split(b"\r\n")
        image_start = False

        for i, line in enumerate(lines):
            if line.startswith(b"X-Frame-Number:"):
                frame_number = int(line.split(b":")[1].strip())
            elif line.startswith(b"X-Accident-Conf:"):
                acc_conf = float(line.split(b":")[1].strip())
            elif line.startswith(b"X-Fire-Conf:"):
                fire_conf = float(line.split(b":")[1].strip())
            elif line == b"" and not image_start:
                # Everything after blank line = image bytes
                image_bytes  = b"\r\n".join(lines[i+1:]).strip()
                image_start  = True
                break
        return Response(
            content    = image_bytes,
            media_type = "image/jpeg",
            headers    = {
                "X-Frame-Number":  str(frame_number),
                "X-Accident-Conf": f"{acc_conf:.3f}",
                "X-Fire-Conf":     f"{fire_conf:.3f}",
                "Cache-Control":   "no-cache",
                "Access-Control-Expose-Headers": "X-Frame-Number, X-Accident-Conf, X-Fire-Conf"
            }
        )
    except StopIteration:
        frame_generator = None
        return Response (status_code=204)
    


@router.post("/reset-generator")
async def reset_generator():
    global frame_generator
    frame_generator = None
    return JSONResponse({"status": "reset"})