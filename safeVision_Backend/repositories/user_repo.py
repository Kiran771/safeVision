from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import User
from safeVision_Backend.schemas.safeVisionSchema import AdminCreate,AdminUpdate
from safeVision_Backend.core.security import hash_password


# CRUD operations for User model

# create a new admin
def create_admin(db: Session, user: AdminCreate):
    hashed_pwd = hash_password(user.password)

    db_user = User(
        UserName=user.username,
        Email=user.email,
        Contact=user.contact,
        Role=user.role,
        Password=hashed_pwd  
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Read operations
def get_admin_by_id(db:Session,user_id:int):
    return db.query(User).filter(User.UserId==user_id).first()

def get_admin_by_username(db: Session, username: str):
    return db.query(User).filter(User.UserName == username).first()
def get_all_admins(db: Session, skip: int = 0, limit: int = 20):
    return db.query(User).offset(skip).limit(limit).all()

# Update operations
def update_admin(db: Session, user_id: int, user_data: AdminUpdate):
    db_user = db.query(User).filter(User.UserId == user_id).first()

    if not db_user:
        return None

    if user_data.username is not None:
        db_user.UserName = user_data.username

    if user_data.email is not None:
        db_user.Email = user_data.email

    if user_data.contact is not None:
        db_user.Contact = user_data.contact

    if user_data.role is not None:
        db_user.Role = user_data.role

    if user_data.password:
        db_user.Password = hash_password(user_data.password)

    db.commit()
    db.refresh(db_user)
    return db_user

# Delete operations
def delete_admin(db: Session, user_id: int):
    db_user = db.query(User).filter(User.UserId == user_id).first()

    if not db_user:
        return None

    db.delete(db_user)
    db.commit()
    return db_user
