from  sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import EmergencyContact,Location,Camera,Accident,Alert


def save_alert(
    db: Session,
    accident_id: int,
    contact_id: int,
    user_id: int = None,
    status: str = "sent"
):
    try:
        alert = Alert(
            accidentid = accident_id,
            contactid  = contact_id,
            userid     = user_id,
            status     = status,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert
    except Exception as e:
        db.rollback()  
        print(f"[DB ERROR] save_alert failed: {e}")
        return None

def get_active_contacts_by_category(db: Session, category: str):
    return db.query(EmergencyContact).filter(
        EmergencyContact.is_active == True,
        EmergencyContact.category == category
    ).all()

def get_all_active_contacts(db: Session):
    return db.query(EmergencyContact).filter(
        EmergencyContact.is_active == True
    ).all()

def get_accident_location(db, accident_id: int):
    result = (
        db.query(
            Location.location_name,
            Location.city
        )
        .join(Camera, Camera.location_id == Location.location_id)
        .join(Accident, Accident.cameraid == Camera.cameraid)
        .filter(Accident.accidentid == accident_id)
        .first()
    )

    if not result:
        return "Unknown Location"

    return f"{result.location_name}, {result.city}"

def get_alerts_by_accident(db: Session, accident_id: int):
    return db.query(Alert).filter(
        Alert.accidentid == accident_id
    ).all()

def get_all_alerts(db: Session, skip: int = 0, limit: int = 20):
    return db.query(Alert).order_by(
        Alert.alert_time.desc()
    ).offset(skip).limit(limit).all()

def get_alert_stats(db: Session):
    total  = db.query(Alert).count()
    sent   = db.query(Alert).filter(Alert.status == "sent").count()
    failed = db.query(Alert).filter(Alert.status == "failed").count()
    return {
        "total"  : total,
        "sent"   : sent,
        "failed" : failed,
    }