import os
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
from safeVision_Backend.services.alert_service import dispatch_alerts
from safeVision_Backend.models.table_creation import Camera
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user
from safeVision_Backend.repositories import camera_management_repo
from safeVision_Backend.repositories.accident_repo import (
    get_detection_by_id,
    get_pending_reviews,
    update_detection_status,
    get_camera_location,
    get_all_detections,
    get_confirmed_count,
    get_pending_count,
    get_all_notifications,
    get_unread_notifications,
    clear_all_notifications

    
)

router = APIRouter(prefix="/accidents", tags=["Accidents"],dependencies=[Depends(get_current_user)])


@router.post("/{accident_id}/verify")
def verify_incident(
    accident_id: int, 
    background_tasks:BackgroundTasks,
    db: Session = Depends(get_db),
    current_user    = Depends(get_current_user)
):
    detection = get_detection_by_id(db=db, accident_id=accident_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Incident not found")

    updated = update_detection_status(
        db = db,
        accident_id = accident_id,
        status = "confirmed"   
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update status")
    
    background_tasks.add_task(
        dispatch_alerts,
        accident_id = accident_id,
        user_id = current_user.userid
    )
    

    return {"message": "Incident confirmed successfully", "status":"confirmed"}

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
def get_pending(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    camera_id:int= Query(None),
):
    cameras = camera_management_repo.get_cameras_by_user(db, current_user.userid)
    if not cameras:
        return []
    camera_ids = [c["camera_id"] for c in cameras]
    if camera_id:
        if camera_id not in camera_ids:
            raise HTTPException(status_code=403, detail="Access denied for this camera")
        camera_ids = [camera_id]

    
    detections = get_pending_reviews(db=db, camera_ids=camera_ids)
    result = []
    for d in detections:
        location = get_camera_location(db, d.cameraid)
        result.append({
            "accidentid": d.accidentid,
            "timestamp": d.timestamp,
            "confidence": d.confidence,
            "detection_type": d.detection_type,
            "status": d.status,
            "location": location,
            "cameraid": d.cameraid
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


@router.get("/recent")
def get_recent_detections(
    camera_id: int = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    detections = get_all_detections(db, camera_id=camera_id, skip=skip, limit=limit)
    return [ 
        {
            "id": d.accidentid,
            "camera_id": d.cameraid,
            "type": d.detection_type,
            "confidence": d.confidence,
            "status": d.status,
            "timestamp": d.timestamp.isoformat(),
            "frame_path": d.frame_path,
        } 
        for d in detections
    ]

@router.get("/stats")
def get_stats(camera_id: int=Query(...,description='camerid to fetch for stats'), db: Session = Depends(get_db)):
    if not camera_id:
        raise HTTPException(status_code=400, detail="camera_id is required")
    try:
        pending = get_pending_count(db=db, camera_id=camera_id)
        confirmed = get_confirmed_count(db=db, camera_id=camera_id)
        return {"pending": pending, "confirmed": confirmed}
    except Exception as e:
        print("Error in get_stats:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch accident stats")

@router.get("/notifications")
def get_notifications(
    camera_id: int = Query(None),
    db: Session = Depends(get_db)
):
    all_notifs = get_all_notifications(camera_id=camera_id)
    return {
        "notifications": all_notifs,
        "total": len(all_notifs)
    }

@router.get("/notifications/all")
def get_all_notifs(camera_id: int = Query(None)):
    all_notifs = get_all_notifications(camera_id=camera_id)
    return {
        "notifications": all_notifs,
        "total": len(all_notifs)
    }

@router.delete("/notifications/clear")
def clear_notifications(camera_id: int = Query(None)):
    clear_all_notifications(camera_id=camera_id)
    return {"message": "Notifications cleared"}


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



