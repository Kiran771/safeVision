from collections import deque
import time
import cv2
import os
import tempfile
from pathlib import Path
import numpy as np
import tensorflow as tf
from safeVision_Backend.core.psql_db import SessionLocal
from safeVision_Backend.models.table_creation import Accident,Camera



# Load model 
BASE_DIR = Path(__file__).resolve().parent
accident_detection_model_path = BASE_DIR.parent / "accident_detection_model" / "accident_detection_final.keras"
model = tf.keras.models.load_model(accident_detection_model_path)


# input image size for the model
IMG_SIZE = 256

# anomaly detection threshold
ANOMALY_THRESHOLD = 0.0040  

# number of consecutive frames to confirm anomaly
ANOMALY_CONSECUTIVE_FRAMES = 6  
# threshold for borderline cases
BORDERLINE_THRESHOLD = 0.0025

# Applying static masking to focus on vehicles rather than surroundings
mask = np.ones((IMG_SIZE, IMG_SIZE, 3), dtype=np.float32)
mask[:int(IMG_SIZE * 0.09), :, :] = 0.4 # Downweight sky region


# Folder to save ONLY accident frames (no storage for normal frames)
ACCIDENT_FOLDER = "accident_frames"
os.makedirs(ACCIDENT_FOLDER, exist_ok=True)

# Preprocessing input frame for model prediction
def preprocess_frame(frame):
    """Resize with aspect ratio preserved + black padding, then normalize"""
    h, w = frame.shape[:2]  
    # Calculate scale to fit inside target size without stretching
    scale = min(IMG_SIZE / w, IMG_SIZE / h)
    new_w = int(w * scale)
    new_h = int(h * scale)

    # Resize proportionally (aspect ratio preserved)
    resized = cv2.resize(frame, (new_w, new_h))

    # Create black canvas of target size
    padded = np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)

    # Center the resized image
    start_x = (IMG_SIZE - new_w) // 2
    start_y = (IMG_SIZE - new_h) // 2
    padded[start_y:start_y + new_h, start_x:start_x + new_w] = resized

    # Normalize to 0 & 1
    padded = padded.astype(np.float32) / 255.0

    # Add batch dimension for model
    padded = np.expand_dims(padded, axis=0)

    return padded

# Post-processing: calculate masked MSE after downweighting background
def calculate_masked_mse(input_frame, recon):
    """Compute MSE with mask (downweight background - post-processing)"""
    error = (input_frame - recon) ** 2
    masked_error = error * mask
    return np.mean(masked_error)

# Save only confirmed accident frames
def save_accident_frame(frame, video_name, frame_count, mse):
    """Save only confirmed accident frames"""
    accident_path = os.path.join(ACCIDENT_FOLDER, 
                                f"accident_{video_name}_frame_{frame_count:06d}_mse_{mse:.4f}.jpg")
    cv2.imwrite(accident_path, frame)
    print(f"Accident frame saved: {accident_path}")
    return accident_path


# Human-in-the-Loop: Save borderline frames for manual review
def send_for_review(frame, video_name, frame_count, mse):
    """Human-in-the-Loop: Save borderline frames for manual review"""
    review_path = os.path.join(ACCIDENT_FOLDER, f"review{video_name}_frame_{frame_count:06d}_mse_{mse:.4f}.jpg")
    cv2.imwrite(review_path, frame)
    print(f"Borderline detection saved for human review: {review_path} (MSE: {mse:.4f})")

# Save accident details to database for further processing
def save_accident_to_db(camera_id, mse, confidence, frame_path, reconstructed_path):
    db = SessionLocal()
    try:
        # Fetch camera location
        camera = db.query(Camera).filter(Camera.cameraid == camera_id).first()
        camera_location = camera.location if camera else None

        accident = Accident(
            cameraid=camera_id,
            location=camera_location,  # save location from camera
            reconstruction_error=float(mse),
            confidence=float(confidence),
            frame_path=frame_path,
            reconstructed_frame_path=reconstructed_path,
            status="pending"
        )
        db.add(accident)
        db.commit()
        db.refresh(accident)
        print(f"[DB] Accident saved ID={accident.accidentid}")

    finally:
        db.close()


# Compute confidence score for detected anomaly based on error, baseline, and threshold
def compute_confidence(error, baseline, threshold):
    """
    Hybrid confidence:
    - compares error to baseline behavior
    - scales relative to detection threshold
    """

    if error <= baseline:
        return 0.0

    # how far above normal behavior
    relative_spike = (error - baseline) / (threshold - baseline + 1e-6)

    # sigmoid smoothing for stability
    confidence = 1 / (1 + np.exp(-5 * (relative_spike - 0.5)))

    return float(np.clip(confidence, 0, 1))


# Main function to process video frames and yield detected accident frames as JPEG bytes
def generate_detection_frames(
    video_bytes: bytes | None = None,
    video_name: str = "video",
    video_path: str | None = None,
    camera_id: int = 1
):
    print(f"[ANALYSIS START] Video: {video_name}, path: {video_path or 'from bytes'}")

    cap_source = None
    temp_file_to_clean = None
    last_saved_time = 0
    SAVE_COOLDOWN = 8 


    try:
        # Prepare video source
        if video_path:
            cap_source = video_path
        elif video_bytes:
            tmp_fd, tmp_name = tempfile.mkstemp(suffix=".mp4")
            with os.fdopen(tmp_fd, "wb") as f:
                f.write(video_bytes)
                f.flush()
                os.fsync(f.fileno())
            cap_source = tmp_name
            temp_file_to_clean = tmp_name
        else:
            raise ValueError("Either video_bytes or video_path required")

        time.sleep(0.2) 

        cap = cv2.VideoCapture(cap_source)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {cap_source}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_interval = 1.0 / fps
        print(f"[INFO] FPS: {fps:.2f}")

        frame_count = 0
        consecutive_high_mse = 0
        running_normal_mse = None
        last_mse = []
        last_yield_time = time.time()

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print(f"[INFO] Video ended after {frame_count} frames")
                break

            frame_count += 1
            if frame_count % 3 != 0:
                continue
            print(f"[FRAME] Processing frame {frame_count}", end="\r") 

            if frame is None or frame.size == 0:
                print(f"[WARNING] Skipping invalid frame {frame_count}")
                continue

            input_frame = preprocess_frame(frame)
            recon = model.predict(input_frame, verbose=0)[0]

            recon_image = (recon * 255).astype(np.uint8)
            reconstructed_path = os.path.join(ACCIDENT_FOLDER, 
            f"recon_{video_name}_frame_{frame_count:06d}.jpg")
            cv2.imwrite(reconstructed_path, recon_image)

            mse = calculate_masked_mse(input_frame[0], recon)
            last_mse.append(mse)
            if len(last_mse) > 5:
                last_mse.pop(0)
            smoothed_mse = np.median(last_mse)

            if running_normal_mse is None:
                running_normal_mse = smoothed_mse
            else:
                running_normal_mse = 0.9 * running_normal_mse + 0.1 * smoothed_mse

            dynamic_threshold = max(ANOMALY_THRESHOLD, running_normal_mse + 0.002)
            dynamic_borderline_threshold = max(BORDERLINE_THRESHOLD, running_normal_mse + 0.001)

            confidence = compute_confidence(
                error=smoothed_mse,
                baseline=running_normal_mse,
                threshold=dynamic_threshold
            )


            if smoothed_mse > dynamic_threshold:
                consecutive_high_mse += 1
            else:
                consecutive_high_mse = 0

            is_accident = consecutive_high_mse >= ANOMALY_CONSECUTIVE_FRAMES
            is_borderline = dynamic_borderline_threshold < smoothed_mse <= dynamic_threshold

            if is_accident or is_borderline:
                current_time = time.time()
                if current_time - last_yield_time < frame_interval:
                    time.sleep(frame_interval - (current_time - last_yield_time))
                last_yield_time = current_time

                status = "ACCIDENT DETECTED" if is_accident else "BORDERLINE"
                color = (0, 0, 255) if is_accident else (0, 165, 255)

                cv2.putText(frame, f"{status} MSE: {smoothed_mse:.4f}", (30, 80),
                            cv2.FONT_HERSHEY_DUPLEX, 1.0, color, 6, cv2.LINE_AA)
                cv2.putText(frame, f"Frame {frame_count} Consec: {consecutive_high_mse}", (30, 140),
                            cv2.FONT_HERSHEY_DUPLEX, 1.0, color, 6, cv2.LINE_AA)

                if is_accident:
                    h, w = frame.shape[:2]
                    cv2.rectangle(frame, (40, 40), (w-40, h-40), (0, 0, 255), 8)
                    if current_time - last_saved_time > SAVE_COOLDOWN:
                        frame_path = save_accident_frame(
                            frame,
                            video_name,
                            frame_count,
                            smoothed_mse
                        )

                        save_accident_to_db(
                            camera_id=camera_id,
                            mse=smoothed_mse,
                            confidence=confidence,
                            reconstructed_path=reconstructed_path,
                            frame_path=frame_path

                        )

                        last_saved_time = current_time

                elif is_borderline:
                    if current_time - last_saved_time > SAVE_COOLDOWN:
                        send_for_review(
                            frame,
                            video_name,
                            frame_count,
                            smoothed_mse
                        )
                        last_saved_time = current_time

                success, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                if not success:
                    print(f"[WARNING] JPEG encode failed at frame {frame_count}")
                    continue

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"X-Frame-Number: " + str(frame_count).encode() + b"\r\n\r\n" +
                    buffer.tobytes() +
                    b"\r\n"
                )

    except Exception as e:
        print(f"[ERROR] During processing: {e}")
        raise

    finally:
        if 'cap' in locals():
            cap.release()
        if temp_file_to_clean and os.path.exists(temp_file_to_clean):
            try:
                os.remove(temp_file_to_clean)
                print(f"[CLEANUP] Removed temp file: {temp_file_to_clean}")
            except Exception as cleanup_err:
                print(f"[CLEANUP ERROR] {cleanup_err}")

    print(f"[ANALYSIS END] Video: {video_name}")
