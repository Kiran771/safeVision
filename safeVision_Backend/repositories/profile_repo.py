from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import User
from safeVision_Backend.schemas.safeVisionSchema import AdminUpdate
from safeVision_Backend.core.security import hash_password

# get user by id
def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.userid == user_id).first()

# check if username exists for another user
def username_exists_for_another(db: Session, username: str, exclude_id: int) -> bool:
    return (
        db.query(User)
        .filter(
            User.username == username,
            User.userid   != exclude_id,
        )
        .first()
    ) is not None

# check if email exists for another user
def email_exists_for_another(db: Session, email: str, exclude_id: int) -> bool:
    return (
        db.query(User)
        .filter(
            User.email  == email,
            User.userid != exclude_id,
        )
        .first()
    ) is not None

# update profile details of user
def update_profile(db: Session, user_id: int, data: AdminUpdate) -> User | None:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    update_data = data.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
        
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user

# change password of user
def change_password(db: Session, user_id: int, new_password: str) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    user.password_hash = hash_password(new_password)
    db.commit()
    return True