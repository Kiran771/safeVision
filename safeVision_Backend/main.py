from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from safeVision_Backend.core.psql_db import engine, Base
from safeVision_Backend.routers import admin_router, detection_router, emergency_contact_router
from safeVision_Backend.routers import auth

# Create all tables in the database
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="safeVision Backend")

# Configure CORS
origins = [
    "http://127.0.0.1:5500",   # frontend running with Live Server
    "http://localhost:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # allow requests from frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(admin_router.router, prefix="/admins")
app.include_router(auth.router, prefix="/login")
app.include_router(detection_router.router, prefix="/detection")
app.include_router(emergency_contact_router.router, prefix="/contacts")
