import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from safeVision_Backend.core.psql_db import engine, Base
from safeVision_Backend.routers import auth,accident_verify_router, admin_registration_router, detection_router, emergency_contact_router,accident_details_router,emergency_contact_router,camera_router


# Create all tables in the database
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="safeVision Backend")

# Configure CORS
origins = [
    "http://127.0.0.1:5500",   
    "http://localhost:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,     
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(admin_registration_router.router)
app.include_router(auth.router)
app.include_router(detection_router.router)
app.include_router(emergency_contact_router.router)
app.include_router(accident_verify_router.router)
app.include_router(accident_details_router.router)
app.include_router(camera_router.router)


frontend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

