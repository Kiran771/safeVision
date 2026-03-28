from sqlalchemy.orm import Session
from safeVision_Backend.core.email import send_accident_alert_email
from safeVision_Backend.core.psql_db import SessionLocal
from safeVision_Backend.repositories.alert_repo import (
    save_alert,
    get_active_contacts_by_category,
    get_accident_location,
    get_accident_coordinates
)
from safeVision_Backend.repositories.accident_repo import get_detection_by_id,add_notification
from safeVision_Backend.utils.haversine import haversine_distance, get_nearest_contact 
from datetime import datetime

ALERT_CATEGORIES = {
    "accident": ["police", "medical"],
    "fire":     ["police", "fire_department", "medical"],
}


def dispatch_alerts(accident_id: int, user_id: int = None):
    db = SessionLocal()
    try:
        detection = get_detection_by_id(db, accident_id)
        if not detection:
            print(f"[ALERT] No detection found for id: {accident_id}")
            add_notification(
                f"Alert failed: Incident #{accident_id} not found",
                type="error"
            )
            return

        if "fire" in (detection.detection_type or ""):
            alert_key = "fire"
        else:
            alert_key = "accident"

        categories = ALERT_CATEGORIES.get(alert_key, ["police", "medical"])
        location   = get_accident_location(db, accident_id)
        timestamp  = (
            detection.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            if detection.timestamp
            else str(datetime.now())
        )

        acc_lat, acc_lon = get_accident_coordinates(db, accident_id)

        if acc_lat is None or acc_lon is None:
            print(f"[ALERT] No coordinates found for accident #{accident_id}")
            add_notification(
                f"Alert failed: Camera location has no coordinates. Please update the location.",
                type="error"
            )
            return

        print(f"[ALERT] Dispatching for {alert_key} at {location} ({acc_lat}, {acc_lon})")

        sent_count   = 0
        failed_count = 0

        for category in categories:
            contacts = get_active_contacts_by_category(db, category)

            if not contacts:
                print(f"[ALERT] No active contacts for: {category}")
                add_notification(
                    f"No active {category.replace('_', ' ').title()} contact found - skipped",
                    type="warning"
                )
                continue

            nearest = get_nearest_contact(acc_lat, acc_lon, contacts)

            if not nearest:
                continue

            if not nearest.email:
                print(f"[ALERT] No email for: {nearest.authority_name}")
                add_notification(
                    f"{nearest.authority_name} has no email registered — alert not sent",
                    type="warning"
                )
                continue

            distance = haversine_distance(
                acc_lat, acc_lon,
                nearest.latitude, nearest.longitude
            )

            print(f"[ALERT] Nearest {category}: {nearest.authority_name} "
                f"— {distance:.2f} km away")

            success = send_accident_alert_email(
                to_email        = nearest.email,
                authority_name  = nearest.authority_name,
                camera_location = location,
                confidence      = detection.confidence or 0.0,
                detection_type  = alert_key,
                timestamp       = timestamp,
                frame_path      = detection.frame_path, 
            )

            save_alert(
                db          = db,
                accident_id = accident_id,
                contact_id  = nearest.contactid,
                user_id     = user_id,
                status      = "sent" if success else "failed",
            )

            if success:
                sent_count += 1
                add_notification(
                    f"{category.replace('_', ' ').title()} alerted: {nearest.authority_name} ({distance:.1f} km away)",
                    type="success"
                )

            else:
                failed_count += 1
                add_notification(
                    f"Failed to alert {nearest.authority_name} ({category.replace('_', ' ').title()}) — check email settings",
                    type="error"
                )

            print(
                f"[ALERT] {'Sent' if success else 'Failed'} → "
                f"{nearest.authority_name} ({category}) | "
                f"{nearest.email} | {distance:.2f} km"
            )

    finally:
        db.close()