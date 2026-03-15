from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from safeVision_Backend.models.table_creation import Accident, Camera, User,Location,Alert,UserCamera

def get_detections_by_date(db:Session,days:int=30):
    start_date=datetime.now() - timedelta(days=days)
    return db.query(Accident).filter(Accident.timestamp >=start_date).all()


def get_detection_by_id(db:Session,accident_id:int):
    return db.query(Accident).filter(Accident.accidentid==accident_id).first()


def get_recent_detections(db:Session,limit:int=10):
    return db.query(Accident).order_by(Accident.timestamp.desc()).limit(limit).all()


def get_pending_accidents(db:Session,limit:int=50):
    return db.query(Accident).filter(Accident.status=="pending").order_by(Accident.timestamp.desc()).limit(limit).all()


def get_high_confidence_detections(db: Session, min_confidence: float = 0.7, days: int = 30):

    start_date = datetime.now() - timedelta(days=days)
    return db.query(Accident).filter(
        Accident.confidence >= min_confidence,
        Accident.timestamp >= start_date

    ).all()

def get_detection_stats(db: Session, days: int = 30):
    detections = get_detections_by_date(db, days)
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

    # Count by detection type
    accidents = len([d for d in detections if d.detection_type in ['accident', 'confirmed']])
    fires = len([d for d in detections if d.detection_type == 'fire'])

    # Count by confidence ranges
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

def get_incident_breakdown(db: Session, days: int = 30):
    detections = get_detections_by_date(db, days)
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

def get_status_breakdown(db: Session, days: int = 30):
    detections = get_detections_by_date(db, days)

    if not detections:
        return {
            'confirmed': 0,
            'pending': 0,
            'false_alarm': 0,
            'total': 0
        }

    # Status breakdown
    confirmed= len([d for d in detections if d.status == 'confirmed'])    
    pending = len([d for d in detections if d.status == 'pending'])    
    rejected = len([d for d in detections if d.status == 'rejected'])   
    return {
        'confirmed': confirmed,          
        'pending': pending,         
        'false_alarm': rejected,      
        'total': len(detections)

    }

def get_detection_count_by_status(db: Session, days: int = 30):
    
    breakdown = get_status_breakdown(db, days)
    return {
        'labels': ['Confirmed', 'Pending', 'False Alarm'],
        'data': [
            breakdown['confirmed'],
            breakdown['pending'],
            breakdown['false_alarm']

        ]

    }

def get_all_cameras(db: Session):
    return db.query(Camera).all()

def get_total_active_cameras(db: Session):
    return db.query(Camera).filter(Camera.status == 'active').count()

def get_total_admins(db: Session):
    return db.query(User).filter(User.role=='Admin').count()








