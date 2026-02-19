from fastapi import APIRouter, HTTPException, Path, Depends
from sqlalchemy.orm import Session
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.models.table_creation import Accident

router = APIRouter(prefix="/accidents", tags=["Accidents"])

@router.post("/{accident_id}/verify")
def verify_accident(accident_id: int = Path(...), db: Session = Depends(get_db)):
    accident = db.query(Accident).filter(Accident.accidentid == accident_id).first()
    if not accident:
        raise HTTPException(status_code=404, detail="Accident not found")
    accident.status = "verified"
    db.commit()
    return {"message": f"Accident {accident_id} verified"}

@router.post("/{accident_id}/reject")
def reject_accident(accident_id: int = Path(...), db: Session = Depends(get_db)):
    accident = db.query(Accident).filter(Accident.accidentid == accident_id).first()
    if not accident:
        raise HTTPException(status_code=404, detail="Accident not found")
    accident.status = "rejected"
    db.commit()
    return {"message": f"Accident {accident_id} rejected"}