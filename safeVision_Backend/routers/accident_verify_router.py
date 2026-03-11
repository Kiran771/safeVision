import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import Camera
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.repositories.accident_repo import (
    get_detection_by_id,
    get_pending_reviews,
    update_detection_status,
    get_camera_location,
    get_all_detections

    
)

router = APIRouter(prefix="/accidents", tags=["Accidents"])



@router.post("/{accident_id}/verify")
def verify_incident(accident_id: int, db: Session = Depends(get_db)):
    detection = get_detection_by_id(db=db, accident_id=accident_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Incident not found")

    updated = update_detection_status(
        db = db,
        accident_id = accident_id,
        status = "reviewed"   
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update status")

    return {"message": "Incident confirmed successfully", "status": "reviewed"}


@router.post("/{accident_id}/reject")
def reject_incident(accident_id: int, db: Session = Depends(get_db)):
    detection = get_detection_by_id(db=db, accident_id=accident_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Incident not found")

    updated = update_detection_status(
        db = db,
        accident_id = accident_id,
        status = "rejected"
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update status")

    return {"message": "Incident rejected successfully", "status": "rejected"}

@router.get("/pending")
def get_pending(db: Session = Depends(get_db)):
    detections = get_pending_reviews(db=db)

    result = []
    for d in detections:
        camera   = db.query(Camera).filter(Camera.cameraid == d.cameraid).first()
        location = camera.location if camera else "Unknown Location"
        result.append({
            "accidentid":     d.accidentid,
            "timestamp":      d.timestamp,
            "confidence":     d.confidence,
            "detection_type": d.detection_type,
            "status":         d.status,
            "location":       location,  
            "cameraid":       d.cameraid
        })
    return result

@router.get("/frame-image")
def get_frame_image(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Frame image not found")

    allowed_folders = ["accident_frames", "fire_frames", "review_frames"]
    is_safe = any(path.startswith(folder) for folder in allowed_folders)
    if not is_safe:
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(path, media_type="image/jpeg")


@router.get("/{accident_id}")
def get_incident(accident_id: int, db: Session = Depends(get_db)):
    detection = get_detection_by_id(db=db, accident_id=accident_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    location=get_camera_location(db,detection.cameraid)
    return {
        "accidentid":     detection.accidentid,
        "timestamp":      detection.timestamp,
        "confidence":     detection.confidence,
        "detection_type": detection.detection_type,
        "status":         detection.status,
        "location":       location,
        "cameraid":       detection.cameraid,
        "frame_path":     detection.frame_path,
    }

@router.get("/recent")
def get_recent(limit: int = 10, db: Session = Depends(get_db)):
    detections = get_all_detections(db=db, skip=0, limit=limit)
    return [
        {
            "accidentid":     d.accidentid,
            "timestamp":      d.timestamp,
            "confidence":     d.confidence,
            "detection_type": d.detection_type,
            "status":         d.status,
        }
        for d in detections
    ]

