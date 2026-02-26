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


