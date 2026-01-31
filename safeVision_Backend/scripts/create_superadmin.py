from sqlalchemy.orm import Session
from safeVision_Backend.models.table_creation import User
from safeVision_Backend.core.security import hash_password
from safeVision_Backend.core.psql_db import engine

def create_first_superadmin():
    db = Session(bind=engine)

    # Check if a super admin already exists
    existing = db.query(User).filter(User.Role == "Super Admin").first()
    if existing:
        print(f"Super admin already exists: {existing.UserName}")
        return

    # Create first super admin
    superadmin = User(
        UserName="superadmin",          
        Email="superadmin@example.com",
        Contact="9800000000",          
        Role="Super Admin",
        Password=hash_password("StrongPass123")  
    )

    db.add(superadmin)
    db.commit()
    print("Super admin created successfully!")

if __name__ == "__main__":
    create_first_superadmin()
