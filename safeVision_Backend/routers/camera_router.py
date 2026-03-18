from typing import List

from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session 
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user
from safeVision_Backend.repositories import camera_management_repo
from safeVision_Backend.schemas.safeVisionSchema import CameraCreate,CameraUpdate,LocationOut,AvailableAdminOut,CameraOut


router = APIRouter(prefix="/cameras", tags=["Cameras"],dependencies=[Depends(get_current_user)])

@router.get('/locations',response_model=List[LocationOut])
def get_locations(db: Session = Depends(get_db)):
  return camera_management_repo.get_locations(db)

@router.get('/admins/all-admins',response_model=List[AvailableAdminOut])
def get_all_admins(db:Session=Depends(get_db)):
  return camera_management_repo.get_all_admins(db)

@router.get("/",response_model=List[CameraOut])
def get_cameras(db: Session = Depends(get_db)):
    return camera_management_repo.get_cameras(db)

@router.post("/register")
def register_camera(data: CameraCreate, db: Session = Depends(get_db)):
  return camera_management_repo.register_camera(
  db,
  data.location_id,
  data.admin_id,
  data.status
  )

@router.get('/admins/available/{camera_id}',response_model=List[AvailableAdminOut])
def get_available_admins(camera_id: int, db: Session = Depends(get_db)):
    return camera_management_repo.get_available_admins(db, camera_id)


@router.put("/update/{camera_id}")
def update_camera(camera_id: int, data: CameraUpdate, db: Session = Depends(get_db)):
    return camera_management_repo.update_camera(
        db,
        camera_id,
        data.location_id,
        data.admin_id,
        data.status
    )

@router.delete("/delete/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    return camera_management_repo.delete_camera(db, camera_id)
