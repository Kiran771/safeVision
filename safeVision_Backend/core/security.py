# safeVision_Backend/core/security.py
import jwt
from pwdlib import PasswordHash
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm  # ← added this
from sqlalchemy.orm import Session

from .config import settings
from .psql_db import get_db
from ..models.table_creation import User

# Password hashing
pwd_context = PasswordHash.recommended()

# OAuth2 scheme — points to your actual login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def hash_password(password: str) -> str:
    """Hash a password using pwdlib (argon2 by default)"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None
) -> str:
    """
    Create a JWT access token.
    Uses ACCESS_TOKEN_EXPIRE_MINUTES from settings (default 30 min)
    """
    to_encode = data.copy()

    # Use settings value if available, fallback to 30 minutes
    expire_minutes = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 30)
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=expire_minutes))

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),  # Issued at — good practice
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency: Validate JWT and return the current authenticated user.
    
    Raises 401 if:
    - Token is missing, invalid, expired, or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    # Fetch user — using correct snake_case column
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    # Security check: inactive users cannot authenticate
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    return user