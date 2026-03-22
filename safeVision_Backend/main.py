import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from safeVision_Backend.core.psql_db import engine, Base
from safeVision_Backend.routers import (
    auth,
    accident_verify_router, 
    admin_registration_router, 
    detection_router, 
    emergency_contact_router,
    camera_router,
    accident_verify_router,
    dashboard_router,
    settings_router,
    alert_router,
    
)


# Create all tables in the database
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(title="safeVision Backend")

# Configure CORS
origins = [
    "http://127.0.0.1:8000", 
    "http://localhost:8000",
    "http://127.0.0.1:5500",   
    "http://localhost:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,     
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers  = [  
        "X-Frame-Number", 
        "X-Accident-Conf", 
        "X-Fire-Conf" 
    ]
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if any(request.url.path.startswith(p) for p in ["/js", "/css", "/html"]):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Include routers
app.include_router(admin_registration_router.router)
app.include_router(auth.router)
app.include_router(detection_router.router)
app.include_router(emergency_contact_router.public_router)
app.include_router(emergency_contact_router.router)
app.include_router(accident_verify_router.router)
app.include_router(camera_router.router)
app.include_router(dashboard_router.router)
app.include_router(settings_router.router)
app.include_router(alert_router.router)


frontend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

