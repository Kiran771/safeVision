# safeVision_Backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from ..core.psql_db import get_db
from ..core.security import verify_password, create_access_token
from ..models.table_creation import User
from ..core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token", summary="Login and get access token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT access token.
    Uses username/password form data.
    """
    # Find user
    user = db.query(User).filter(User.username == form_data.username).first()

    # Check credentials
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Security: inactive users cannot login
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive or disabled"
        )

    # Token expiration
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role
        },
        expires_delta=access_token_expires
    )

    # Return token + useful user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),  # seconds remaining
        "user": {
            "id": user.userid,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }