from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.schemas.safeVisionSchema import EmergencyContactCreate
from safeVision_Backend.repositories import contact_registration as crud

router = APIRouter(
    prefix="/contacts",
    tags=["Emergency Contacts"]
)

@router.post("/")
def create_contact(
    contact: EmergencyContactCreate,
    db: Session = Depends(get_db)
):
    return crud.create_contact(db, contact)