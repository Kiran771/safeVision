from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import EmergencyContact
from safeVision_Backend.schemas.safeVisionSchema import EmergencyContactCreate, EmergencyContactUpdate

# Create a new emergency contact
def create_contact(db: Session, contact: EmergencyContactCreate):
    db_contact = EmergencyContact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


# Get a contact by ID
def get_contact_by_id(db: Session, contact_id: int):
    return db.query(EmergencyContact).filter(EmergencyContact.contactid == contact_id).first()

# Get all active contacts
def get_all_contacts(db: Session):
    return db.query(EmergencyContact).all()

# Update an existing contact
def update_contact(db: Session, contact_id: int, contact: EmergencyContactUpdate):
    db_contact = get_contact_by_id(db, contact_id)
    if db_contact:
        for key, value in contact.model_dump(exclude_unset=True).items():  # only update provided fields
            setattr(db_contact, key, value)
        db.commit()
        db.refresh(db_contact)
    return db_contact

# Delete a contact
def delete_contact(db: Session, contact_id: int):
    db_contact = get_contact_by_id(db, contact_id)
    if db_contact:
        db.delete(db_contact)
        db.commit()
        return True
    return False
