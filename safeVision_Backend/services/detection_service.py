import cv2
import os
from pathlib import Path
import numpy as np
import tensorflow as tf
from io import BytesIO


# Load model 
BASE_DIR = Path(__file__).resolve().parent
accident_detection_model_path = BASE_DIR.parent / "accident_detection_model" / "accident_detection_final.keras"
model = tf.keras.models.load_model(accident_detection_model_path)


# input image size for the model
IMG_SIZE = 256

# anomaly detection threshold
ANOMALY_THRESHOLD = 0.0040  

# number of consecutive frames to confirm anomaly
ANOMALY_CONSECUTIVE_FRAMES = 3  
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
    """Save only confirmed accident frames (post-processing step 3)"""
    accident_path = os.path.join(ACCIDENT_FOLDER, 
                                f"accident_{video_name}_frame_{frame_count:06d}_mse_{mse:.4f}.jpg")
    cv2.imwrite(accident_path, frame)
    print(f"Accident frame saved: {accident_path}")


# Human-in-the-Loop: Save borderline frames for manual review
def send_for_review(frame, video_name, frame_count, mse):
    """Human-in-the-Loop: Save borderline frames for manual review"""
    review_path = os.path.join(ACCIDENT_FOLDER, f"review{video_name}_frame_{frame_count:06d}_mse_{mse:.4f}.jpg")
    cv2.imwrite(review_path, frame)
    print(f"Borderline detection saved for human review: {review_path} (MSE: {mse:.4f})")


# Main function to process video frames
def generate_detection_frames(video_bytes: bytes, video_name: str):
    """Process video frames for anomaly detection and yield annotated frames"""
    video_stream = BytesIO(video_bytes)
    cap = cv2.VideoCapture(video_stream)

    frame_count = 0
    consecutive_high_mse = 0  

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        # Preprocess and predict
        input_frame = preprocess_frame(frame)
        recon = model.predict(input_frame, verbose=0)

        # Post-processing: Masked MSE
        mse = calculate_masked_mse(input_frame, recon)

        # Post-processing: Temporal consistency
        if mse > ANOMALY_THRESHOLD:
            consecutive_high_mse += 1
        else:
            consecutive_high_mse = 0

        # Final status based on temporal check
        status = "NORMAL"
        color = (0, 255, 0)  # Green for normal

        if consecutive_high_mse >= ANOMALY_CONSECUTIVE_FRAMES:
            status = "ACCIDENT"
            color = (0, 0, 255)  # Red for accident
            # Post-processing: Save ONLY confirmed accident frames
            save_accident_frame(frame, video_name, frame_count, mse)

        # Post-processing: Human-in-the-Loop for borderline detections
        if BORDERLINE_THRESHOLD < mse <= ANOMALY_THRESHOLD:
            send_for_review(frame, video_name, frame_count, mse)

        # Draw text on original frame
        cv2.putText(frame, f"{status} (MSE: {mse:.4f})", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
        cv2.putText(frame, f"Consecutive: {consecutive_high_mse}", (10, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(frame, f"Frame: {frame_count}", (10, 120),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        # Encode as JPEG and yield (no saving of normal frames!)
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()