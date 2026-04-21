from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from safeVision_Backend.models.table_creation import Accident, Camera, User,Location,Alert,UserCamera


# Get detection by date range and optionally by camera
def get_detections_by_date(db: Session, days: int = 30, camera_id: int = None):
    start_date = datetime.now() - timedelta(days=days)
    query = db.query(Accident).filter(Accident.timestamp >= start_date)
    if camera_id:
        query = query.filter(Accident.cameraid == camera_id)
    return query.all()

# Get detection by ID
def get_detection_by_id(db:Session,accident_id:int):
    return db.query(Accident).filter(Accident.accidentid==accident_id).first()

# Get recent detections for dashboard
def get_recent_detections(db:Session,limit:int=10):
    return db.query(Accident).order_by(Accident.timestamp.desc()).limit(limit).all()

# Get pending accidents for dashboard
def get_pending_accidents(db:Session,limit:int=50):
    return db.query(Accident).filter(Accident.status=="pending").order_by(Accident.timestamp.desc()).limit(limit).all()

# Get high confidence detections for dashboard
def get_high_confidence_detections(db: Session, min_confidence: float = 0.7, days: int = 30):

    start_date = datetime.now() - timedelta(days=days)
    return db.query(Accident).filter(
        Accident.confidence >= min_confidence,
        Accident.timestamp >= start_date

    ).all()
# Get dashboard stats for admin users
def get_detection_stats(db: Session, days: int = 30,camera_id: int = None):
    detections = get_detections_by_date(db, days, camera_id=camera_id)
    if not detections:
        return {
            'total_alerts': 0,
            'unverified': 0,
            'confirmed': 0,
            'pending': 0,
            'rejected': 0,
            'accidents': 0,
            'fires': 0,
            'low_confidence': 0,
            'high_confidence': 0
        }

    confirmed = len([d for d in detections if d.status == 'confirmed'])
    pending = len([d for d in detections if d.status == 'pending'])
    rejected = len([d for d in detections if d.status == 'rejected'])

    accidents = len([d for d in detections if d.detection_type in ['accident', 'confirmed']])
    fires = len([d for d in detections if d.detection_type == 'fire'])

    low_confidence = len([d for d in detections if d.confidence and d.confidence < 0.5])
    high_confidence = len([d for d in detections if d.confidence and d.confidence >= 0.7])

    return {
        'total_alerts': len(detections),
        'unverified': pending,      
        'confirmed': confirmed,     
        'pending': pending,
        'rejected': rejected,
        'accidents': accidents,
        'fires': fires,
        'low_confidence': low_confidence,
        'high_confidence': high_confidence
    }
# Get incident breakdown for dashboard based on detection type by date range and optionally by camera
def get_incident_breakdown(db: Session, days: int = 30,camera_id: int = None):
    detections = get_detections_by_date(db, days,camera_id=camera_id)
    if not detections:
        return {
            'fire_incident': 0,
            'car_incidents': 0,
            'total': 0
        }
    fires = len([d for d in detections if d.detection_type == 'fire'])
    accidents = len([d for d in detections if d.detection_type in ['accident', 'confirmed']])
    return {

        'fire_incident': fires,
        'car_incidents': accidents,
        'total': len(detections)
    }

# Get status breakdown for dashboard based on detection status by date range and optionally by camera
def get_status_breakdown(db: Session,days: int = 30,camera_id: int = None):
    detections = get_detections_by_date(db, days,camera_id=camera_id)

    if not detections:
        return {
            'confirmed': 0,
            'pending': 0,
            'false_alarm': 0,
            'total': 0
        }

    confirmed= len([d for d in detections if d.status == 'confirmed'])    
    pending = len([d for d in detections if d.status == 'pending'])    
    rejected = len([d for d in detections if d.status == 'rejected'])   
    return {
        'confirmed': confirmed,          
        'pending': pending,         
        'false_alarm': rejected,      
        'total': len(detections)

    }

# Get detection count by status for chart data
def get_detection_count_by_status(db: Session, days: int = 30):
    breakdown = get_status_breakdown(db, days)
    return {
        'labels': ['Confirmed', 'Pending', 'Rejected Alarm'],
        'data': [
            breakdown['confirmed'],
            breakdown['pending'],
            breakdown['false_alarm']

        ]

    }

# Get total cameras registered for dashboard
def get_all_cameras(db: Session):
    return db.query(Camera).all()

# Get total active cameras for dashboard
def get_total_active_cameras(db: Session):
    return db.query(Camera).filter(Camera.status == 'active').count()

# Get total admins for dashboard
def get_total_admins(db: Session):
    return db.query(User).filter(User.role=='Admin').count()

# Get daily accident counts for chart data by date range and optionally by camera
def get_daily_accident_counts(db: Session, days: int = 7, camera_id: int = None):
    today  = datetime.utcnow().date()
    counts = []
    for i in range(days - 1, -1, -1):
        day   = today - timedelta(days=i)
        start = datetime(day.year, day.month, day.day)
        end   = start + timedelta(days=1)
        query = db.query(Accident).filter(
            Accident.timestamp >= start,
            Accident.timestamp < end
        )
        if camera_id:
            query = query.filter(Accident.cameraid == camera_id)
        counts.append(query.count())
    return counts

# Get accidents per camera for chart data
def get_accidents_per_camera(db):
    rows = (
        db.query(Accident.cameraid, func.count(Accident.accidentid).label('cnt'))
        .group_by(Accident.cameraid)
        .all()
    )
    return {row.cameraid: row.cnt for row in rows}

# Get high confidence detection count for dashboard by date range and optionally by camera
def get_high_confidence_count(db, min_confidence: float = 0.7, days: int = 30):
    start = datetime.utcnow() - timedelta(days=days)
    return (
        db.query(Accident)
        .filter(Accident.confidence >= min_confidence, Accident.timestamp >= start)
        .count()
    )








