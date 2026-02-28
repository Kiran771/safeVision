from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session 
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.repositories import camera_management_repo
from safeVision_Backend.schemas.safeVisionSchema import Camera,CameraUpdate


router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get('/locations')
def get_locations(db: Session = Depends(get_db)):
  return camera_management_repo.get_locations(db)

@router.get('/admins/unassigned-admins')
def get_unassigned_admins(db:Session=Depends(get_db)):
  return camera_management_repo.get_unassigned_admin(db)

@router.post("/register")
def register_camera(data: Camera, db: Session = Depends(get_db)):
  return camera_management_repo.register_camera(
  db,
  data.location_id,
  data.admin_id,
  data.status
  )

@router.get("/")
def get_cameras(db: Session = Depends(get_db)):
    return camera_management_repo.get_cameras(db)

@router.get('/admins/available/{camera_id}')
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
