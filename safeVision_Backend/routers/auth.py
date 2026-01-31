# safeVision_Backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import verify_password, create_access_token
from safeVision_Backend.models.table_creation import User
from safeVision_Backend.core.config import settings
from datetime import timedelta

router = APIRouter(prefix="/login", tags=["Authentication"])

@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Find user by username
    user = db.query(User).filter(User.UserName == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.Password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token with expiration
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.UserName},  # "sub" = subject = username
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}