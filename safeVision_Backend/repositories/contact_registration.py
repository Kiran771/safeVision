from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import EmergencyContact
from safeVision_Backend.schemas.safeVisionSchema import EmergencyContactCreate


# Function to create a new emergency contact
def create_contact(db: Session, contact: EmergencyContactCreate):
    db_contact = EmergencyContact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


# Function to get an emergency contact by ID
def get_contact_by_id(db: Session, contact_id: int):
    return db.query(EmergencyContact).filter(EmergencyContact.ContactId == contact_id).first()


# Function to update an existing emergency contact
def update_contact(db: Session, contact_id: int, contact: EmergencyContactCreate):
    db_contact = get_contact_by_id(db, contact_id)
    if db_contact:
        for key, value in contact.model_dump().items():
            setattr(db_contact, key, value)
        db.commit()
        db.refresh(db_contact)
    return db_contact

# Function to delete an emergency contact
def delete_contact(db: Session, contact_id: int):
    db_contact = get_contact_by_id(db, contact_id)
    if db_contact:
        db.delete(db_contact)
        db.commit()
    return db_contact