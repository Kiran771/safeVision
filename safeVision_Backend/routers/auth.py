# safeVision_Backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta

from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user
from safeVision_Backend.core.security import verify_password, create_access_token
from safeVision_Backend.repositories.profile_repo import (
    username_exists_for_another,
    email_exists_for_another,
    update_profile,
    change_password,
)
from safeVision_Backend.schemas.safeVisionSchema import AdminUpdate, UserOut
from safeVision_Backend.models.table_creation import User
from safeVision_Backend.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Request model for changing password
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password    : str
    confirm_password: str

# Endpoint to login and get access token
@router.post("/token", summary="Login and get access token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive or disabled"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role
        },
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()), 
        "user": {
            "id": user.userid,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }

# Authenticate user credentials and generate JWT access token
@router.post("/token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db : Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail = "Incorrect username or password",
            headers = {"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = "Account is inactive or disabled",
        )

    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data = {"sub": user.username, "role": user.role},
        expires_delta = expires,
    )

    return {
        "access_token": access_token,
        "token_type" : "bearer",
        "expires_in": int(expires.total_seconds()),
        "user": {
            "id" : user.userid,
            "username": user.username,
            "email" : user.email,
            "role" : user.role,
            "is_active": user.is_active,
        },
    }


# Endpoint to get current user's profile
@router.get("/profile", response_model=UserOut)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):

    return current_user

# Endpoint to update current user's profile
@router.put("/profile", response_model=UserOut)
def update_my_profile(
    data : AdminUpdate,
    db : Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):

    if data.username and username_exists_for_another(
        db, data.username, current_user.userid
    ):
        raise HTTPException(status_code=400, detail="Username already taken")

    if data.email and email_exists_for_another(
        db, data.email, current_user.userid
    ):
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role:
        raise HTTPException(
            status_code=403,
            detail="Role can only be changed by superadmin",
        )

    updated = update_profile(db, current_user.userid, data)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    return updated

# Endpoint to change current user's password
@router.post("/profile/change-password")
def change_my_password(
    data : ChangePasswordRequest,
    db : Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New passwords do not match",
        )

    if verify_password(data.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password",
        )
    change_password(db, current_user.userid, data.new_password)
    return {"message": "Password changed successfully"}
