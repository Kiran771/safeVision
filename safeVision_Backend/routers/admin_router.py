from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from safeVision_Backend.schemas.safeVisionSchema import AdminCreate
from safeVision_Backend.repositories.user_repo import create_admin, get_admin_by_username
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user

router = APIRouter(
    prefix="/admins",
    tags=["Admins"]
)

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_admin(admin: AdminCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Register a new admin user. Only super_admin can create new admins.
    """
    # Check if current user is super admin
    if current_user.Role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can create admin users")

    # Check if username or email already exists
    if get_admin_by_username(db, admin.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    # Create admin using repository function
    new_admin = create_admin(db, admin)
    return {"message": "Admin created successfully", "admin_id": new_admin.UserId}
