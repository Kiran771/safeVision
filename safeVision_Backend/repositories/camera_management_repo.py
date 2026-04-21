from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import Accident, Alert, Camera,User,UserCamera,Location

# Get location 
def get_locations(db: Session):
    locations = db.query(Location.location_id, Location.location_name, Location.city).all()
    return [
            {"location_id": loc.location_id, "name": f"{loc.location_name}, {loc.city}"}
            for loc in locations
        ]

# Get all admins
def get_all_admins(db: Session):
    results = (
            db.query(User.userid, User.username)
            .filter(User.role == 'Admin')
            .filter(User.is_active == True)
            .all() 
    )
    return [{'userid': userid, 'username': username} for userid, username in results]


# Register camera
def register_camera(db: Session, location_id: int, admin_id: int, status: str):
    try:
        location_count = db.query(Location).count()
        admin_count = db.query(User).filter(User.role == 'Admin', User.is_active == True).count()
        admin = db.query(User).filter(User.userid == admin_id, User.role == 'Admin', User.is_active == True).first()
        if not admin:
            return {"error": "Invalid admin"}
        if location_count == 0 and admin_count == 0:
            return {"error": "Cannot register camera. No locations and no admins available."}
        if location_count == 0:
            return {"error": "Cannot register camera. No locations found. Please add a location first."}
        if admin_count == 0:
            return {"error": "Cannot register camera. No admins available. Please register an admin first."}
        
        location = db.query(Location).filter(Location.location_id == location_id).first()
        if not location:
            return {"error": "Invalid location"}

        new_camera = Camera(
            location_id=location_id,
            status=status
        )

        db.add(new_camera)
        db.commit()
        db.refresh(new_camera)

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
    except Exception as e:
        db.rollback()
        return {"error": f"Failed to register camera: {str(e)}"}

# Get all the register cameras
def get_cameras(db: Session):
    results = (
        db.query(Camera.cameraid, Camera.status, User.username,User.userid,Location.location_id, Location.location_name,
            Location.city)
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
        "location": f"{r.location_name}, {r.city}",
        'location_id':r.location_id,
        "assigned_to": r.username,
        'admin_id':r.userid,
        "status": r.status
    }
        for r in results
    ]

# Get cameras assigned to a specific user
def get_cameras_by_user(db: Session, user_id: int):
    results = (
        db.query(UserCamera.cameraid, Camera.status)
        .join(Camera, Camera.cameraid == UserCamera.cameraid)
        .filter(
            UserCamera.userid == user_id,
            UserCamera.is_active == True
        )
        .all()
    )
    return [{"camera_id": r.cameraid, "status": r.status} for r in results]

# Update camera
def update_camera(db: Session, camera_id: int, location_id: int, admin_id: int, status: str):
    try:
        camera = db.query(Camera).filter(Camera.cameraid == camera_id).first()
        if not camera:
            return {"error": "Camera not found"}
        location = db.query(Location).filter(Location.location_id == location_id).first()
        if not location:
            return {"error": "Invalid location"}
        current_admin = (
            db.query(UserCamera)
                .filter(UserCamera.cameraid == camera_id, UserCamera.is_active == True)
                .first()
        )
        current_admin_id = current_admin.userid if current_admin else None

        no_changes = (
            camera.location_id == location_id and
            camera.status == status and
            current_admin_id == admin_id
        )

        if no_changes:
            return {"message": "No changes were made"}
        camera.location_id = location_id
        camera.status = status

        db.query(UserCamera).filter(UserCamera.cameraid == camera_id).update({"is_active": False})
        new_assignment = UserCamera(userid=admin_id, cameraid=camera_id, is_active=True)
        db.add(new_assignment)
        db.commit()
        db.refresh(camera)

        return {"message": "Camera updated successfully"}
    except Exception as e:
        db.rollback()
        return {"error": f"Failed to update camera: {str(e)}"}



# Delet camera 
def delete_camera(db: Session, camera_id: int): 
    camera = db.query(Camera).filter(Camera.cameraid == camera_id).first()
    if not camera:
        return {"error": "Camera not found"} 
    try:
        accident_ids = [
            a.accidentid 
            for a in db.query(Accident.accidentid)
                    .filter(Accident.cameraid == camera_id).all()

        ]
        if accident_ids:
            db.query(Alert).filter(Alert.accidentid.in_(accident_ids)).delete(synchronize_session=False)
        
        db.query(Accident).filter(Accident.cameraid == camera_id).delete(synchronize_session=False)
        db.query(UserCamera).filter(UserCamera.cameraid == camera_id).delete(synchronize_session=False)
        db.delete(camera) 
        db.commit() 
        return{"message": "Camera removed successfully"}
    except IntegrityError as e:
        db.rollback()
        return {"error": f"Cannot delete camera: it is still referenced by other records."}
    except Exception as e:
        db.rollback()
        return {"error": f"Unexpected error: {str(e)}"}
    

# Get available admins for a specific camera (including current admin if assigned)
def get_available_admins(db: Session, camera_id: int):
    current = (
        db.query(User)
        .join(UserCamera, UserCamera.userid == User.userid)
        .filter(UserCamera.cameraid == camera_id, UserCamera.is_active == True)
        .first()
    )

    all_admins = (
        db.query(User)
        .filter(
            User.role == 'Admin',
            User.is_active == True,
            User.userid != (current.userid if current else None)
        )
        .all()
    )

    result = []
    if current:
        result.append({"userid": current.userid, "username": f"{current.username} (current)"})
    result += [{"userid": u.userid, "username": u.username} for u in all_admins]
    return result
