from datetime import datetime

from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import Accident,Camera


notifications = []

def get_camera_location(db:Session,camera_id:int):
    camera=db.query(Camera).filter(Camera.cameraid==camera_id).first()
    return camera.location if camera else "Unknown Location"

def save_detection(
    db: Session,
    camera_id:int,
    detection_type:str,
    confidence:float,
    frame_path:str,
    status:str='pending'

):
    detection=Accident(
        cameraid = camera_id,
        confidence = float(confidence),
        frame_path = frame_path,
        detection_type = detection_type,
        status = status
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)
    print(f"[REPO] {detection_type.upper()} saved id={detection.accidentid}, conf={confidence:.2f}")
    return detection.accidentid

def save_borderline_detection(
        db:Session,
        camera_id:int,
        confidence:float,
        frame_path:str,
        detection_type:str,
): 
    return save_detection(
        db=db,
        camera_id=camera_id,
        confidence=confidence,
        frame_path=frame_path,
        detection_type = detection_type,
        status= 'pending'
    )

def get_all_detections(db:Session,skip:int=0,limit:int=20):
    return (
        db.query(Accident)
        .order_by(Accident.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_detection_by_id(db:Session,accident_id:int):
    return db.query(Accident).filter(
        Accident.accidentid==accident_id
    ).first()

def get_pending_reviews(db:Session):
    return(
        db.query(Accident)
        .filter(Accident.status=='pending')
        .order_by(Accident.timestamp.desc())
        .all()
    )
    


def update_detection_status(db:Session,accident_id:int, status:str):
    detection=db.query(Accident).filter(
        Accident.accidentid==accident_id
        ).first()
    if not detection:
        return False
    detection.status=status
    db.commit()
    return True

def get_pending_count(db: Session):
    return db.query(Accident).filter(Accident.status == 'pending').count()

def get_confirmed_count(db: Session):
    return db.query(Accident).filter(Accident.status == 'confirmed').count()


def add_notification(message: str, type: str = "info"):
    notifications.append({
        "message":   message,
        "type":      type,   
        "timestamp": datetime.now().isoformat(),
        "read":      False
    })
    if len(notifications) > 20:
        notifications.pop(0)

def get_unread_notifications():
    
    unread = [n for n in notifications if not n["read"]]
    for n in notifications:
        n["read"] = True
    return unread


def get_all_notifications():
    return list(notifications)


def clear_all_notifications():
    notifications.clear()