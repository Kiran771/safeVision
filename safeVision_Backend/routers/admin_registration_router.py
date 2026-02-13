from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from safeVision_Backend.models.table_creation import User
from safeVision_Backend.schemas.safeVisionSchema import AdminCreate, AdminUpdate
from safeVision_Backend.repositories.admin_registration_repo import create_admin, delete_admin, get_admin_by_id, get_admin_by_username,get_all_admins,update_admin
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user

router = APIRouter(
    prefix="/admins",
    tags=["Admins"],
)

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_admin(admin: AdminCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Register a new admin user. Only Super Admin can create new admins.
    """
    # Check if current user is super admin
    if current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Only super admin can create admin users")

    # Check if username or email already exists
    if get_admin_by_username(db, admin.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    if db.query(User).filter(User.email == admin.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    if db.query(User).filter(User.contact == admin.contact).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact number already registered"
        )

    # Create admin using repository function
    new_admin = create_admin(db, admin)

    return {"message": "Admin created successfully", "admin_id": new_admin.userid}

@router.get("/",response_model=List[Dict[str, Any]])
def list_admins(
    skip: int = Query(0, ge=0, description="Skip N records"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    admins = get_all_admins(db, skip=skip, limit=limit)

    return [
        {
            "id": admin.userid,
            "username": admin.username,
            "email": admin.email,
            "contact": admin.contact,
            "role": admin.role,
            "is_active": admin.is_active,
            "created_at": admin.created_at.isoformat() if admin.created_at else None
        }
        for admin in admins
    ]

@router.get("/{admin_id}", response_model=Dict[str, Any])
def get_admin_detail(
    admin_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    admin = get_admin_by_id(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    return {
        "id": admin.userid,
        "username": admin.username,
        "email": admin.email,
        "contact": admin.contact,
        "role": admin.role,
        "is_active": admin.is_active,
        "created_at": admin.created_at.isoformat() if admin.created_at else None
    }


@router.patch("/{admin_id}",response_model=Dict[str, str])
def update_admin_user(
    admin_id: int,
    admin_update: AdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can update admin users"
        )

    updated = update_admin(db, admin_id, admin_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Admin not found")

    return {"message": "Admin updated successfully"}

@router.delete("/{admin_id}", response_model=Dict[str, str])
def delete_admin_user(
    admin_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super_admin can delete admin users"
        )

    success = delete_admin(db, admin_id)
    if not success:
        raise HTTPException(status_code=404, detail="Admin not found")

    return {"message": "Admin deleted successfully"}



