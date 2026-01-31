from fastapi import FastAPI
from safeVision_Backend.core.psql_db import engine ,Base
from safeVision_Backend.routers import admin_router, detection_router,emergency_contact_router
from safeVision_Backend.routers import auth

# Create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="safeVision Backend")


app.include_router(admin_router.router, prefix="/admins")
app.include_router(auth.router, prefix="/login")
app.include_router(detection_router.router, prefix="/detection")
app.include_router(emergency_contact_router.router, prefix="/contacts")
