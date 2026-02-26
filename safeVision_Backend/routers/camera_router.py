from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session 
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.repositories import camera_management_repo


router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get('/locations')
def get_locations(db: Session = Depends(get_db)):
  return camera_management_repo.get_locations(db)

@router.get('/admins/unassigned-admins')
def get_unassigned_admins(db:Session=Depends(get_db)):
  return camera_management_repo.get_unassigned_admin(db)
