from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user
from safeVision_Backend.repositories.alert_repo import (
    get_all_alerts,
    get_alerts_by_accident,
    get_alert_stats
)

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/")
def list_alerts(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return get_all_alerts(db, skip=skip, limit=limit)

@router.get("/stats")
def alert_stats(db: Session = Depends(get_db)):
    return get_alert_stats(db)

@router.get("/{accident_id}")
def alerts_for_accident(accident_id: int, db: Session = Depends(get_db)):
    return get_alerts_by_accident(db, accident_id)