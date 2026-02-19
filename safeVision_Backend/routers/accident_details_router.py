from fastapi import APIRouter, HTTPException, Path, Depends
from sqlalchemy.orm import Session
from typing import List
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.models.table_creation import Accident, Camera

router = APIRouter(prefix="/accidents", tags=["Accidents"])


# Get all accidents with camera location
@router.get("/", response_model=List[dict])
def get_all_accidents(db: Session = Depends(get_db)):
    accidents = db.query(Accident).all()
    results = []
    for accident in accidents:
        # Fetch camera location if exists
        camera = db.query(Camera).filter(Camera.cameraid == accident.cameraid).first()
        camera_location = camera.location if camera else "Unknown"

        results.append({
            "accidentid": accident.accidentid,
            "cameraid": accident.cameraid,
            "location": camera_location,
            "confidence": accident.confidence,
            "reconstruction_error": accident.reconstruction_error,
            "frame_path": accident.frame_path,
            "reconstructed_frame_path": accident.reconstructed_frame_path,
            "status": accident.status,
            "timestamp": accident.timestamp.isoformat() if accident.timestamp else None
        })
    return results

# Get accident details by ID 
@router.get("/{accident_id}")
def get_accident(accident_id: int = Path(...), db: Session = Depends(get_db)):
    # Fetch accident
    accident = db.query(Accident).filter(Accident.accidentid == accident_id).first()
    if not accident:
        raise HTTPException(status_code=404, detail="Accident not found")
    
    # Fetch camera location
    camera = db.query(Camera).filter(Camera.cameraid == accident.cameraid).first()
    camera_location = camera.location if camera else "Unknown"

    # Prepare response
    response = {
        "accidentid": accident.accidentid,
        "cameraid": accident.cameraid,
        "location": camera_location,
        "confidence": accident.confidence,
        "reconstruction_error": accident.reconstruction_error,
        "frame_path": accident.frame_path,
        "reconstructed_frame_path": accident.reconstructed_frame_path,
        "status": accident.status,
        "timestamp": accident.timestamp.isoformat() if accident.timestamp else None
    }

    return response
