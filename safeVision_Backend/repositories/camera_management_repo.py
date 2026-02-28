from safeVision_Backend.models.table_creation import Camera,User,UserCamera,Location
from sqlalchemy import not_
from sqlalchemy.orm import Session



def get_locations(db: Session):
  locations = db.query(Location.location_id, Location.location_name, Location.city).all()
  return [
        {"location_id": loc.location_id, "name": f"{loc.location_name}, {loc.city}"}
        for loc in locations
    ]

def get_unassigned_admin(db:Session):
    assigned_userids=db.query(UserCamera.userid).filter(UserCamera.is_active==True).subquery()
    results = (
        db.query(User.userid, User.username)
          .filter(User.role == 'Admin')
          .filter(User.is_active == True)
          .filter(not_(User.userid.in_(assigned_userids)))
          .all()
    )


    return[
      {
          'userid':userid,
          'username':username
      }
      for userid, username in results
    ]

# Register camera
def register_camera(db: Session, location_id: int, admin_id: int, status: str):
  # get location name
  location = db.query(Location).filter(Location.location_id == location_id).first()

  if not location:
    return {"error": "Invalid location"}

  # create camera
  new_camera = Camera(
    location=f"{location.location_name}, {location.city}",
    location_id=location_id,
    status=status
  )

  db.add(new_camera)
  db.commit()
  db.refresh(new_camera)

  # assign admin to camera
  assignment = UserCamera(
    userid=admin_id,
    cameraid=new_camera.cameraid,
    is_active=True
  )

  db.add(assignment)
  db.commit()

  return {
  "message": "Camera registered successfully",
  "cameraid": new_camera.cameraid
  }

# Get all the register cameras
def get_cameras(db: Session):
  results = (
    db.query(Camera.cameraid, Camera.location, Camera.status, User.username,User.userid,Location.location_id)
    .join(UserCamera, UserCamera.cameraid == Camera.cameraid)
    .join(User, User.userid == UserCamera.userid)
    .join(Location, Camera.location_id == Location.location_id)
    .filter(UserCamera.is_active == True)
    .distinct(Camera.cameraid)
    .all()
  )

  return [
  {
    "cameraid": r.cameraid,
    "location": r.location,
    'location_id':r.location_id,
    "assigned_to": r.username,
    'admin_id':r.userid,
    "status": r.status
  }
    for r in results
  ]

# Update camera datas
def update_camera(db: Session, camera_id: int, location_id: int, admin_id: int, status: str):
    camera =db.query(Camera).filter(Camera.cameraid == camera_id).first()
    if not camera:
      return {"error": "Camera not found"}
    location = db.query(Location).filter(Location.location_id == location_id).first() 
    if not location: 
      return{"error": "Invalid location"} 
    camera.location = f"{location.location_name},{location.city}"
    camera.status = status 
    db.query(UserCamera).filter(UserCamera.cameraid ==camera_id).update({"is_active": False}) 
    new_assignment = UserCamera(userid=admin_id, cameraid=camera_id,is_active=True) 
    db.add(new_assignment) 
    db.commit() 
    db.refresh(camera) 
    return {"message": "Camera updated successfully"}


# Delet camera 
def delete_camera(db: Session, camera_id: int): 
  camera = db.query(Camera).filter(Camera.cameraid == camera_id).first()
  if not camera:
    return {"error": "Camera not found"} 
  db.query(UserCamera).filter(UserCamera.cameraid == camera_id).delete() 
  db.delete(camera) 
  db.commit() 
  return{"message": "Camera removed successfully"}

def get_available_admins(db: Session, camera_id: int):
    # Get current assigned admin for this camera
    current = (
        db.query(User)
        .join(UserCamera, UserCamera.userid == User.userid)
        .filter(UserCamera.cameraid == camera_id, UserCamera.is_active == True)
        .first()
    )

    # Get unassigned admins
    assigned_ids = db.query(UserCamera.userid).filter(UserCamera.is_active == True)
    unassigned = db.query(User).filter(
        User.role == 'Admin',
        User.userid.notin_(assigned_ids)
    ).all()

    result = []
    # Add current admin first
    if current:
        result.append({"userid": current.userid, "username": f"{current.username} (current)"})
    # Add unassigned admins
    result += [{"userid": u.userid, "username": u.username} for u in unassigned]
    return result
