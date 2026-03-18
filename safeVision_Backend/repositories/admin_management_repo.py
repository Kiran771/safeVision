from sqlalchemy import not_
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from safeVision_Backend.models.table_creation import User,UserCamera
from safeVision_Backend.schemas.safeVisionSchema import AdminCreate, AdminUpdate
from safeVision_Backend.core.security import hash_password


def create_admin(db: Session, admin_in: AdminCreate) -> User:
    hashed_pwd = hash_password(admin_in.password)
    
    new_admin = User(
        username = admin_in.username,
        email = admin_in.email,
        contact = admin_in.contact,
        role = admin_in.role,
        password_hash = hashed_pwd,
        is_active = True
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin

# Get all admins with pagination
def get_all_admins(db: Session, skip: int = 0, limit: int = 20) -> List[User]:
    return (
        db.query(User)
        .filter(User.role == "Admin")
        .offset(skip)
        .limit(limit)
        .all()
    )

# Get count of admin created in last 7 days
def get_recently_added_admins_count(db: Session) -> int:
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    return (
        db.query(User)
        .filter(User.role == "Admin")
        .filter(User.is_active == True)
        .filter(User.created_at >= seven_days_ago)
        .count()
    )

# get count of admins with no active camera assigned
def get_unassigned_admins_count(db: Session) -> int:

    assigned_ids = (
        db.query(UserCamera.userid)
        .filter(UserCamera.is_active == True)
        .subquery()
    )
    return (
        db.query(User)
        .filter(User.role == "Admin")
        .filter(User.is_active == True)
        .filter(not_(User.userid.in_(assigned_ids)))
        .count()
    )

# Get admin by ID
def get_admin_by_id(db: Session, admin_id: int) -> Optional[User]:
    return db.query(User).filter(User.userid == admin_id).first()

# Get admin by username
def get_admin_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

# Update admin details
def update_admin(db: Session, admin_id: int, admin_update: AdminUpdate) -> Optional[User]:
    db_admin = get_admin_by_id(db, admin_id)
    if not db_admin:
        return None

    update_data = admin_update.model_dump(exclude_unset=True)
    
    if "password" in update_data and update_data["password"]:
        db_admin.password_hash = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(db_admin, key, value)

    db.commit()
    db.refresh(db_admin)
    return db_admin

# Delete admin by ID
def delete_admin(db: Session, admin_id: int) -> bool:
    db_admin = get_admin_by_id(db, admin_id)
    if not db_admin:
        return False
    
    db.delete(db_admin)
    db.commit()
    return True