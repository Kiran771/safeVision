from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from typing import List

from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.schemas.safeVisionSchema import EmergencyContactCreate, EmergencyContactUpdate
from safeVision_Backend.repositories import contact_registration as crud

router = APIRouter(
    prefix="/contacts",
    tags=["Emergency Contacts"]
)

# Create a new contact
@router.post("/", response_model=EmergencyContactCreate)
def create_contact(contact: EmergencyContactCreate, db: Session = Depends(get_db)):
    return crud.create_contact(db, contact)

# Get all contacts
@router.get("/", response_model=List[EmergencyContactCreate])
def get_all_contacts(db: Session = Depends(get_db)):
    contacts = crud.get_all_contacts(db)
    return contacts

# Get a single contact by ID
@router.get("/{contact_id}", response_model=EmergencyContactCreate)
def get_contact(contact_id: int = Path(..., description="ID of the contact"), db: Session = Depends(get_db)):
    contact = crud.get_contact(db, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

# Update a contact
@router.put("/{contact_id}", response_model=EmergencyContactCreate)
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
