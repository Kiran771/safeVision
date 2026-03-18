from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user
from safeVision_Backend.core.detection_config import set_sensitivity, get_config
from safeVision_Backend.models.table_creation import DetectionConfig

router = APIRouter(
    prefix="/settings",
    tags=["Settings"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/sensitivity/{level}")
def update_sensitivity(
    level: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if level not in ["low", "medium", "high"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid level. Choose: low, medium, high"
        )
    set_sensitivity(level)

    config = db.query(DetectionConfig).first()
    if config:
        config.sensitivity = level
        config.updated_by  = current_user.userid
    else:
        config = DetectionConfig(
            sensitivity = level,
            updated_by  = current_user.userid
        )
        db.add(config)

    db.commit()

    return {
        "message"    : f"Sensitivity updated to {level}",
        "sensitivity": level,
        "thresholds" : get_config()
    }

@router.get("/sensitivity")
def current_sensitivity():
    return get_config()