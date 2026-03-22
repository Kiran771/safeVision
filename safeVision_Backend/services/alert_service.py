from sqlalchemy.orm import Session
from safeVision_Backend.core.email import send_accident_alert_email
from safeVision_Backend.core.psql_db import SessionLocal
from safeVision_Backend.repositories.alert_repo import (
    save_alert,
    get_active_contacts_by_category,
    get_accident_location,
)
from safeVision_Backend.repositories.accident_repo import get_detection_by_id,add_notification
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
                f"Alert failed — Incident #{accident_id} not found",
                type="error"
            )
            return

        if "fire" in (detection.detection_type or ""):
            alert_key = "fire"
        else:
            alert_key = "accident"

        categories = ALERT_CATEGORIES.get(alert_key, ["police", "medical"])

        location  = get_accident_location(db, accident_id)

        timestamp = (
            detection.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            if detection.timestamp
            else str(datetime.now())
        )

        print(f"[ALERT] Dispatching for {alert_key} at {location}")

        sent_count = 0    
        failed_count = 0 
        for category in categories:
            contacts = get_active_contacts_by_category(db, category)

            if not contacts:
                print(f"[ALERT] No active contacts for: {category}")
                add_notification(
                    f"No active contacts found for {category}",
                    type="warning"
                )
                continue

            for contact in contacts:
                if not contact.email:
                    print(f"[ALERT] No email for: {contact.authority_name}")
                    add_notification(
                        f"No email for {contact.authority_name} ({category})",
                        type="warning"
                    )
                    continue

                success = send_accident_alert_email(
                    to_email = contact.email,
                    authority_name = contact.authority_name,
                    camera_location = location,
                    confidence  = detection.confidence or 0.0,
                    detection_type = alert_key,
                    timestamp = timestamp,
                )

                save_alert(
                    db = db,
                    accident_id = accident_id,
                    contact_id = contact.contactid,
                    user_id = user_id,
                    status = "sent" if success else "failed",
                )

                if success:
                    sent_count += 1
                    add_notification(
                        f"Alert sent to {contact.authority_name} "
                        f"({category}) for {alert_key} at {location}",
                        type="success"
                    )
                else:
                    failed_count += 1
                    add_notification(
                        f"Alert FAILED for {contact.authority_name} "
                        f"({category}) — check email configuration",
                        type="error"
                    )

                print(
                    f"[ALERT] {'Sent' if success else 'Failed'} → "
                    f"{contact.authority_name} ({category}) | {contact.email}"
                )


        if sent_count > 0 and failed_count == 0:
            add_notification(
                f"All {sent_count} alerts sent for "
                f"{alert_key} #{accident_id} at {location}",
                type="success"
            )
        elif sent_count > 0 and failed_count > 0:
            add_notification(
                f"{sent_count} sent, {failed_count} failed "
                f"for incident #{accident_id}",
                type="warning"
            )
        elif sent_count == 0 and failed_count > 0:
            add_notification(
                f"All {failed_count} alerts failed "
                f"for incident #{accident_id} — check email config",
                type="error"
            )
    finally:
        db.close()
