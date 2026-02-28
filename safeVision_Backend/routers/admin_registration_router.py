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
def register_admin(
    admin: AdminCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user)
):
    """
    Register a new admin user. Only Super Admin can create new admins,
    except for the first admin (Super Admin) which can be created without authentication.
    """
    # Check if this is the first admin
    existing_admins = db.query(User).count()
    if existing_admins == 0:
        # Allow creation without token, force role to Super Admin
        admin.role = "Super Admin"
        new_admin = create_admin(db, admin)
        return {"message": "First Super Admin created successfully", "admin_id": new_admin.userid}

    # For subsequent admins, only Super Admin can create
    if current_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can create admin users")

    # Check if username/email/contact already exists
    if get_admin_by_username(db, admin.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == admin.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.contact == admin.contact).first():
        raise HTTPException(status_code=400, detail="Contact number already registered")

    # Create admin
    new_admin = create_admin(db, admin)
    return {"message": "Admin created successfully", "admin_id": new_admin.userid}


@router.get("/", response_model=List[Dict[str, Any]])
def list_admins(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    token_user: User | None = Depends(get_current_user)  
):
    total_admins = db.query(User).filter(User.role == "Admin").count()

    if total_admins == 0:
        return []

    if not token_user or token_user.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    admins = db.query(User).filter(User.role == "Admin").offset(skip).limit(limit).all()

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


@router.patch("/{admin_id}", response_model=Dict[str, str])
def update_admin_user(
    admin_id: int,
    admin_update: AdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can update admin users"
        )
    
    if db.query(User).filter(User.username == admin_update.username, User.userid != admin_id).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    if db.query(User).filter(User.email == admin_update.email, User.userid != admin_id).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(User).filter(User.contact == admin_update.contact, User.userid != admin_id).first():
        raise HTTPException(status_code=400, detail="Contact number already registered")

    # If password is empty, ignore it in update
    if not admin_update.password:
        admin_update.password = None  

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
    if current_user.role != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can delete admin users"
        )

    success = delete_admin(db, admin_id)
    if not success:
        raise HTTPException(status_code=404, detail="Admin not found")

    return {"message": "Admin deleted successfully"}



