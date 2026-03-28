import time
import cv2
import os
import tempfile
from pathlib import Path
from ultralytics import YOLO
from safeVision_Backend.core.psql_db import SessionLocal
from safeVision_Backend.repositories.accident_repo import save_detection,save_borderline_detection,add_notification
from safeVision_Backend.core.detection_config import get_config



# Load model 
BASE_DIR = Path(__file__).resolve().parent
accident_detection_model_path = BASE_DIR.parent / "accident_fire_detection_model" / "best_v5.pt"
fire_detection_model_path = BASE_DIR.parent / "accident_fire_detection_model" / "best_fire_detection.pt"

accident_model=YOLO(str(accident_detection_model_path))
fire_model=YOLO(str(fire_detection_model_path))


# consecutive frames required to confirm accident
consecutive_frames_needed = 4

# accident confirmation cooldown to prevent multiple detections of same event
accident_cooldown_seconds = 50

# frame skip interval to balance perfromance and detection speed
frame_skip_interval = 4

MISS_TOLERANCE = 2  

ACCIDENT_FOLDER = "accident_frames"
FIRE_FOLDER     = "fire_frames"
REVIEW_FOLDER   = "review_frames"
os.makedirs(ACCIDENT_FOLDER, exist_ok=True)
os.makedirs(FIRE_FOLDER, exist_ok=True)
os.makedirs(REVIEW_FOLDER, exist_ok=True)


def annotate_accident_frame(frame,boxes,model_name):
    has_accident=False
    max_conf=0.0
    for box in boxes:
        class_id = int(box.cls[0]) 
        conf = float(box.conf[0])
        label = model_name[class_id]
        x1,y1,x2,y2 = map(int,box.xyxy[0])

        if label != 'ACCIDENT':
            continue
        has_accident = True
        max_conf=max(max_conf,conf)
        cv2.rectangle(frame,(x1,y1),(x2,y2),(0,0,255),3)
        label_text = f"ACCIDENT {conf:.0%}" 
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7,2)  
        cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw, y1), (0, 0, 255), -1) 
        cv2.putText(frame, label_text, (x1, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    return frame,has_accident,max_conf

def annotate_fire_frame(frame,boxes,model_name):
    has_fire=False
    max_conf=0.0

    FIRE_COLOR  = (0, 140, 255)   
    SMOKE_COLOR = (128, 128, 128)

    for box in boxes:
        class_id = int(box.cls[0]) 
        conf = float(box.conf[0])
        label = model_name[class_id]
        x1,y1,x2,y2 = map(int,box.xyxy[0])

        has_fire = True
        max_conf=max(max_conf,conf)

        color= SMOKE_COLOR if 'smoke' in label.lower() else FIRE_COLOR
        cv2.rectangle(frame,(x1,y1),(x2,y2),color,3)
        label_text = f"{label} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw, y1), color, -1)
        cv2.putText(frame, label_text, (x1, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    return frame,has_fire,max_conf

def draw_status_overlay(frame,frame_count,acc_conf,fire_conf,
                    is_accident,is_fire,  is_borderline ,vehicle_count):
    h,w= frame.shape[:2]

    overlay=frame.copy()
    cv2.rectangle(overlay, (0,h - 90),(w,h),(0,0,0),-1)

    cv2.addWeighted(overlay,0.6,frame,0.4,0,frame)

    if is_accident:
        status_text='ACCIDENT DETECTED'
        status_color=(0,0,255)
    elif is_fire:
        status_text='FIRE DETECTED'
        status_color=(0,140,255)
    elif is_borderline:
        status_text='BORDERLINE REVIEW'
        status_color=(0,165,255)
    else: 
        status_text='MONITORING'
        status_color=(0,255,0)

    cv2.putText(frame,status_text,(20,h-55),
                    cv2.FONT_HERSHEY_DUPLEX, 0.9, status_color, 2
                )
    
    cv2.putText(frame, f"Accident Conf:{acc_conf:.0%} Fire Conf:{fire_conf:.0%} Vehicles:{vehicle_count}",
                    (20, h - 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
                )
    cv2.putText(frame, f"Frame: {frame_count}", (w - 160, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2
                )
    return frame

def save_frame_img(frame,folder,prefix, video_name, frame_count, conf):
    
    filename = f"{prefix}_{video_name}_frame_{frame_count:06d}_conf{conf:.2f}.jpg"
    path = os.path.join(folder, filename)
    cv2.imwrite(path, frame)
    print(f"[SAVE] {path}")
    return path



def generate_detection_frames(
    video_bytes: bytes | None = None,
    video_name: str = "video",
    video_path: str | None = None,
    camera_id: int = 3,
    playback_time: float = 0.0
):
    
    config = get_config()
    accident_conf_thresh = config["accident_confidence_threshold"]
    fire_conf_thresh     = config["fire_confidence_threshold"]
    border_line_thresh   = accident_conf_thresh * 0.55

    
    print(f"[CONFIG] Sensitivity: {config['sensitivity']}")
    print(f"[CONFIG] Accident threshold: {accident_conf_thresh}")
    print(f"[CONFIG] Fire threshold:     {fire_conf_thresh}")

    temp_file = None
    last_accident_time = 0
    last_fire_time = 0
    last_borderline_time = 0
    consecutive_accident = 0
    consecutive_fire = 0
    accident_active = False
    fire_active= False
    borderline_active= False
    accident_miss_streak = 0  
    fire_miss_streak  = 0

    try:
        if video_path:
            cap_source = video_path
        elif video_bytes:
            tmp_fd,tmp_name = tempfile.mkstemp(suffix=".mp4")
            with os.fdopen(tmp_fd, 'wb') as f:
                f.write(video_bytes)
                f.flush()
                os.fsync(f.fileno())
            cap_source = tmp_name
            temp_file = tmp_name
        else:
            raise ValueError("Either video_bytes or video_path must be provided")
        time.sleep(0.2)

        cap=cv2.VideoCapture(cap_source)

        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {cap_source}")
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_interval = 1.0 / fps
        print(f"[INFO] Video opened: {cap_source}, FPS: {fps:.2f}")

        frame_count  = 0 
        while cap.isOpened(): 
            loop_start = time.time()
            ret, frame = cap.read() 
            if not ret:
                break
            frame_count += 1
            if frame_count % frame_skip_interval != 0:
                time.sleep(frame_interval)
                continue
            
            if frame is None or frame.size == 0:
                print(f"[WARNING] Skipping invalid frame {frame_count}")
                continue

            
            accident_results  = accident_model(
                frame, 
                conf=accident_conf_thresh, verbose=False
            )
            fire_results = fire_model(
                frame, conf=fire_conf_thresh, verbose=False
            )
    
            acc_boxes = accident_results[0].boxes
            frame, is_accident, acc_conf = annotate_accident_frame(
                frame, acc_boxes, accident_model.names)
            
            fire_boxes = fire_results[0].boxes
            frame, is_fire, fire_conf = annotate_fire_frame(
                frame, fire_boxes, fire_model.names)
            
            is_borderline_accident = False
            if not is_accident  and len(acc_boxes)>0:
                for box in acc_boxes:
                    raw_conf = float(box.conf[0])
                    if border_line_thresh <=raw_conf < accident_conf_thresh:
                        is_borderline_accident = True
                        break
            is_borderline_fire = False
            if not is_fire and len(fire_boxes)>0:
                for box in fire_boxes:
                    raw_conf= float(box.conf[0])
                    if border_line_thresh <= raw_conf < fire_conf_thresh:
                        is_borderline_fire = True
                        break
            is_borderline = is_borderline_accident or is_borderline_fire
            if is_accident:
                consecutive_accident += 1
                accident_miss_streak  = 0
            else:
                accident_miss_streak += 1
                if accident_miss_streak > MISS_TOLERANCE:
                    consecutive_accident = 0
                    accident_miss_streak = 0

            if is_fire:
                consecutive_fire += 1
                fire_miss_streak  = 0
            else:
                fire_miss_streak += 1
                if fire_miss_streak > MISS_TOLERANCE:
                    consecutive_fire = 0
                    fire_miss_streak = 0

            accident_box_count = sum(
                1 for box in acc_boxes 
                if accident_model.names[int(box.cls[0])] == 'ACCIDENT' 
                and  float(box.conf[0]) >= accident_conf_thresh
            )

            confirmed_accident = (
                consecutive_accident >= consecutive_frames_needed 
                and acc_conf >= accident_conf_thresh+0.05
                )
            confirmed_fire  = (
                consecutive_fire >= consecutive_frames_needed
                and fire_conf >= fire_conf_thresh + 0.05
            )

            vehicle_count = len(acc_boxes) 
            heavy_traffic =vehicle_count >= 8

            frame = draw_status_overlay(
                    frame, 
                    frame_count, 
                    acc_conf, 
                    fire_conf, 
                    confirmed_accident, 
                    confirmed_fire,
                    is_borderline,
                    vehicle_count 
            )

            current_time = time.time()

            if confirmed_accident and current_time - last_accident_time > accident_cooldown_seconds:
                    if not accident_active:
                        frame_path = save_frame_img(
                                frame, 
                                ACCIDENT_FOLDER, 
                                "accident", 
                                video_name, 
                                frame_count, 
                                acc_conf
                            )

                        db = SessionLocal()
                        try: 
                                save_detection(
                                    db = db,
                                    camera_id = camera_id,
                                    detection_type = "accident",
                                    confidence = acc_conf,
                                    frame_path = frame_path,
                                    status ='pending'
                                )
                                add_notification(
                                        f"Accident detected at Camera #{camera_id} with {acc_conf:.0%} confidence — pending review",
                                        type="error"
                                )
                        finally:
                                db.close()
                        accident_active= True
                        last_accident_time = current_time
            else:
                accident_active= False
                

            if confirmed_fire and (current_time - last_fire_time > accident_cooldown_seconds):
                    if not fire_active:
                        frame_path = save_frame_img(frame, 
                                FIRE_FOLDER,
                                "fire",
                                video_name,
                                frame_count,
                                fire_conf

                            )
                        db = SessionLocal()
                        try:
                            save_detection(
                                db = db,
                                camera_id      = camera_id,
                                detection_type = "fire",
                                confidence     = fire_conf,
                                frame_path     = frame_path,
                                status='pending'
                            )
                            add_notification(
                                f"Fire detected at Camera #{camera_id} with {fire_conf:.0%} confidence — pending review",
                                type="error"
                            )
                        finally:
                            db.close()
                        fire_active = True
                        last_fire_time = current_time

            else:
                fire_active = False

            if is_borderline and (current_time - last_borderline_time > accident_cooldown_seconds):
                    if not borderline_active:
                        borderline_type = 'borderline_accident' if is_borderline_accident else 'borderline_fire'
                        frame_path = save_frame_img( frame, 
                            REVIEW_FOLDER, 
                            "review", 
                            video_name, frame_count, 
                            acc_conf if is_borderline_accident else fire_conf 
                        ) 
                        db = SessionLocal()

                        try: 

                            save_borderline_detection( 
                                db = db, 
                                camera_id  = camera_id, 
                                confidence  = acc_conf  if is_borderline_accident else fire_conf,
                                frame_path  = frame_path, 
                                detection_type = borderline_type 
                            ) 
                            add_notification(
                                f"Borderline {'accident' if is_borderline_accident else 'fire'} detected at Camera #{camera_id} — flagged for review",
                                type="warning"
                            )
                        finally:
                            db.close()
                        borderline_active = True
                        last_borderline_time =current_time
            else: 
                borderline_active = False
        
        
            should_stream = (
                    confirmed_accident or confirmed_fire or
                    is_borderline or is_accident    or
                    is_fire or heavy_traffic
                )
            should_stream = True 
            if should_stream:
                success, buffer = cv2.imencode(
                        ".jpg", frame,
                        [int(cv2.IMWRITE_JPEG_QUALITY), 85]
                )
                if success:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n"
                        b"X-Frame-Number: "  + str(frame_count).encode() + b"\r\n"
                        b"X-Accident-Conf: " + f"{acc_conf:.3f}".encode() + b"\r\n"
                        b"X-Fire-Conf: "     + f"{fire_conf:.3f}".encode() + b"\r\n\r\n" +
                        buffer.tobytes() + b"\r\n"
                    )

            processing_time = time.time() - loop_start
            sleep_time = (frame_interval * frame_skip_interval) - processing_time

            if sleep_time > 0:
                time.sleep(sleep_time)

    except Exception as e: 
        print(f"[ERROR] {str(e)}")
        raise
    finally:
        if 'cap' in locals():
            cap.release()
        if temp_file and os.path.exists(temp_file):
            try: 
                os.remove(temp_file)
                print(f"[CLEANUP] removed: {temp_file}")
            except Exception as e:
                print(f"[CLEANUP ERROR]{e}")

    print(f"[Detection end] {frame_count} frame from: {video_name}")

