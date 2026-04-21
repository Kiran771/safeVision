from datetime import datetime

from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import Accident,Camera,Location


notifications = {}  
# Get camera location based on camera_id
def get_camera_location(db: Session, camera_id: int):
    camera = db.query(Camera).filter(Camera.cameraid == camera_id).first()
    if not camera:
        return "Unknown Location"
    location = db.query(Location).filter(
        Location.location_id == camera.location_id
    ).first()

    if not location:
        return "Unknown Location"

    return f"{location.location_name}, {location.city}"

# function to save a new accident detection to the database
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

# Funcation to save a borderline detection 
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

# function to retrieve all accident detections with optional filtering by camera_id and pagination
def get_all_detections(db:Session, camera_id:int=None,skip:int=0,limit:int=20):
    query = db.query(Accident).order_by(Accident.timestamp.desc())
    if camera_id is not None:
        query = query.filter(Accident.cameraid == camera_id)
    return query.offset(skip).limit(limit).all()

# function to retrieve a specific accident detection by its ID
def get_detection_by_id(db:Session,accident_id:int):
    return db.query(Accident).filter(
        Accident.accidentid==accident_id
    ).first()

# Function to retrieve pending reviews for a list of camera IDs, ordered by timestamp
def get_pending_reviews(db: Session, camera_ids: list):
    return (
        db.query(Accident)
        .filter(
            Accident.status == "pending",
            Accident.cameraid.in_(camera_ids) 
        )
        .order_by(Accident.timestamp.desc())
        .all()
    )
    

# FUnction to update the status of an accident detection
def update_detection_status(db:Session,accident_id:int, status:str):
    detection=db.query(Accident).filter(
        Accident.accidentid==accident_id
        ).first()
    if not detection:
        return False
    detection.status=status
    db.commit()
    return True

# Function to get the count of pending detction for a specific camera ID
def get_pending_count(db: Session, camera_id: int):
    count = db.query(Accident).filter(
        Accident.cameraid == camera_id,
        Accident.status == "pending"
    ).count()
    return count

# Function to get the count of confirmed detections for a specific camera ID
def get_confirmed_count(db: Session, camera_id: int):
    count = db.query(Accident).filter(
        Accident.cameraid == camera_id,
        Accident.status == "confirmed"
    ).count()
    return count

# Add a new notification to a specific camera or global list
def add_notification(message: str, type: str = "info", camera_id: int = None):
    key = camera_id if camera_id else "global"
    if key not in notifications:
        notifications[key] = []
    notifications[key].append({
        "message":   message,
        "type":      type,
        "timestamp": datetime.now().isoformat(),
        "read":      False
    })
    # Keep only the latest 20 notifications per key
    if len(notifications[key]) > 20:
        notifications[key].pop(0)

# Retrieve all unread notifications and mark them as read
def get_unread_notifications():
    
    unread = [n for n in notifications if not n["read"]]
    for n in notifications:
        n["read"] = True
    return unread

# Retrieve all notifications for a specific camera or global list
def get_all_notifications(camera_id: int = None):
    key = camera_id if camera_id else "global"
    return list(notifications.get(key, []))

# Clear all notifications for a specific camera or global list
def clear_all_notifications(camera_id: int = None):
    key = camera_id if camera_id else "global"
    if key in notifications:
        notifications[key].clear()