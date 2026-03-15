from typing import Any, Dict
from fastapi import APIRouter, Depends,HTTPException
from sqlalchemy.orm import Session
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.repositories import dashboard_repo

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin/stats",response_model=Dict[str, Any])
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    try:
        stats = dashboard_repo.get_detection_stats(db)
        incidents = dashboard_repo.get_incident_breakdown(db)
        status = dashboard_repo.get_status_breakdown(db)
        
        return {
            'metrics': {
                'total_alerts': stats['total_alerts'],
                'unverified_incidents': stats['unverified'],
                'confirmed': stats['confirmed']
            },
            'incidents': {
                'fire_incident': incidents['fire_incident'],
                'car_incidents': incidents['car_incidents']
            },
            'status_breakdown': {
                'confirmed': status['confirmed'],
                'pending': status['pending'],
                'false_alarm': status['false_alarm'],
                'total': status['total']
            },
            'charts': {
                'pending_reviews': {
                    'labels': ['Resolved', 'False Alarm'],
                    'data': [status['confirmed'], status['false_alarm']]
                },
                'alert_distribution': {
                    'labels': ['confirmed', 'Pending', 'False Alarm'],
                    'data': [status['confirmed'], status['pending'], status['false_alarm']]
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/time-period-stats", response_model=Dict[str, Any])

def get_time_period_stats(period: str = "7days", db: Session = Depends(get_db)):
    try:
        days_map = {
            '24hrs': 1,
            '7days': 7,
            '30days': 30
        }
        days = days_map.get(period, 7)
        stats = dashboard_repo.get_detection_stats(db, days=days)
        status = dashboard_repo.get_status_breakdown(db, days=days)
        incidents = dashboard_repo.get_incident_breakdown(db, days=days)
        response_data = {
            'period': period,
            'days': days,
            'total_alerts': stats['total_alerts'],
            'confirmed': status['confirmed'],
            'pending': status['pending'],
            'false_alarm': status['false_alarm'],
            'total': status['total'],
            'chart_data': {
                'labels': ['Confirmed', 'Pending', 'False Alarm'],
                'data': [status['confirmed'], status['pending'], status['false_alarm']]
            },

            'incidents': {
                'fire_incident': incidents['fire_incident'],
                'car_incidents': incidents['car_incidents'],
                'total_incidents': incidents['total']
            }
        }
        
        return response_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




