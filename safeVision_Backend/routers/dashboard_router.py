from typing import Any, Dict
from fastapi import APIRouter, Depends,HTTPException
from sqlalchemy.orm import Session
from safeVision_Backend.core.psql_db import get_db
from safeVision_Backend.core.security import get_current_user
from safeVision_Backend.repositories import camera_management_repo
from safeVision_Backend.repositories.dashboard_repo import (
    get_detection_stats, get_incident_breakdown, get_status_breakdown,
    get_daily_accident_counts, get_accidents_per_camera, get_high_confidence_count
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"],dependencies=[Depends(get_current_user)])

# Endpoint to get dashboard stats for admin users
@router.get("/admin/stats",response_model=Dict[str, Any])
def get_admin_dashboard_stats(camera_id:int=None,db: Session = Depends(get_db),current_user = Depends(get_current_user)
):
    try:
        if not camera_id:
            cameras    = camera_management_repo.get_cameras_by_user(db, current_user.userid)
            camera_id  = cameras[0]["camera_id"] if cameras else None
        stats = get_detection_stats(db,camera_id=camera_id)
        incidents = get_incident_breakdown(db,camera_id=camera_id)
        status = get_status_breakdown(db,camera_id=camera_id)
        
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
                    'labels': ['Resolved', 'Rejected Alarm'],
                    'data': [status['confirmed'], status['false_alarm']]
                },
                'alert_distribution': {
                    'labels': ['Confirmed', 'Pending', 'Rejected Alarm'],
                    'data': [status['confirmed'], status['pending'], status['false_alarm']]
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to get dashboard stats for specific time periods (24hrs, 7days, 30days)
@router.get("/time-period-stats", response_model=Dict[str, Any])
def get_time_period_stats(period: str = "7days", camera_id: int = None,db: Session = Depends(get_db)):
    try:
        days_map = {
            '24hrs': 1,
            '7days': 7,
            '30days': 30
        }
        days = days_map.get(period, 7)
        stats = get_detection_stats(db, days=days, camera_id=camera_id)
        status = get_status_breakdown(db, days=days, camera_id=camera_id)
        incidents = get_incident_breakdown(db, days=days, camera_id=camera_id)
        response_data = {
            'period': period,
            'days': days,
            'total_alerts': stats['total_alerts'],
            'confirmed': status['confirmed'],
            'pending': status['pending'],
            'false_alarm': status['false_alarm'],
            'total': status['total'],
            'chart_data': {
                'labels': ['Confirmed', 'Pending', 'Rejected Alarm'],
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

# Endpoint to get dashboard stats for superadmin users
@router.get("/superadmin/stats", response_model=Dict[str, Any])
def get_superadmin_dashboard_stats(db: Session = Depends(get_db)):
    try:
        stats    = get_detection_stats(db)
        incidents= get_incident_breakdown(db)
        status   = get_status_breakdown(db)
        daily    = get_daily_accident_counts(db, days=7)
        cam_stats= get_accidents_per_camera(db)
        hi_conf  = get_high_confidence_count(db)
        return {
            'metrics': {
                'total_alerts':      stats['total_alerts'],
                'unverified_incidents': stats['unverified'],
                'confirmed':         stats['confirmed'],
                'high_confidence':   hi_conf
            },
            'incidents': {
                'fire_incident': incidents['fire_incident'],
                'car_incidents': incidents['car_incidents']
            },
            'status_breakdown': {
                'confirmed':   status['confirmed'],
                'pending':     status['pending'],
                'false_alarm': status['false_alarm'],
                'total':       status['total']
            },
            'charts': {
                'alert_distribution': {
                    'labels': ['Confirmed', 'Pending', 'Rejected'],
                    'data':   [status['confirmed'], status['pending'], status['false_alarm']]
                },
                'daily_counts': daily,     
                'camera_stats': cam_stats     
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

