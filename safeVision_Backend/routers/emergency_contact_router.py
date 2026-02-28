from fastapi import APIRouter, Depends, HTTPException, Path,BackgroundTasks
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List

from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.models.table_creation import EmergencyContact
from safeVision_Backend.schemas.safeVisionSchema import EmergencyContactCreate, EmergencyContactUpdate, EmergencyContactOut
from safeVision_Backend.repositories import contact_registration as crud
from safeVision_Backend.core.email import send_verification_email
from safeVision_Backend.utils.verification_token import generate_verification_token, verify_verification_token

router = APIRouter(
    prefix="/contacts",
    tags=["Emergency Contacts"]
)

# Create a new contact
@router.post("/", response_model=EmergencyContactOut)
def create_contact(contact: EmergencyContactCreate, background_tasks: BackgroundTasks,db: Session = Depends(get_db)):
    if db.query(EmergencyContact).filter(EmergencyContact.email == contact.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.query(EmergencyContact).filter(EmergencyContact.contact_number == contact.contact_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
    db_contact= crud.create_contact(db, contact)
    token=generate_verification_token(contact.email)
    background_tasks.add_task(
        send_verification_email,
        to_email=contact.email,
        token=token,
        authority_name=contact.authority_name,
        category=contact.category

    )

    return db_contact

@router.get("/verify/{token}")

def verify_contact(token:str,db:Session=Depends(get_db)):
    try:
        email=verify_verification_token(token)
    except Exception:
        raise HTTPException(status_code=400,detail="Invalid or expired token")
    

    contact=db.query(EmergencyContact).filter(
        EmergencyContact.email==email,
        EmergencyContact.is_active==False
    ).first()

    if not contact:
        raise HTTPException(status_code=404,detail="Contact not found")
    
    contact.is_active=True
    db.commit()
    db.refresh(contact)
    return HTMLResponse(
        """
    <html>
    <body style="font-family: Arial; text-align: center; margin-top: 100px;">
        <h1>Success!</h1>
        <p>Your emergency contact is now activated.</p>
        <p>You will receive alerts when needed.</p>
    </body>
    </html>
    """)

# Get all contacts
@router.get("/", response_model=List[EmergencyContactOut])
def get_all_contacts(db: Session = Depends(get_db)):
    contacts = crud.get_all_contacts(db)
    return contacts

# Get a single contact by ID
@router.get("/{contact_id}", response_model=EmergencyContactOut)
def get_contact(contact_id: int = Path(..., description="ID of the contact"), db: Session = Depends(get_db)):
    contact = crud.get_contact_by_id(db, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

# Update a contact
@router.put("/{contact_id}", response_model=EmergencyContactOut)
def update_contact(contact_id: int, updated_contact: EmergencyContactUpdate, db: Session = Depends(get_db)):
    contact = crud.update_contact(db, contact_id, updated_contact)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

# Delete a contact
@router.delete("/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    success = crud.delete_contact(db, contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"detail": "Contact deleted successfully"}
