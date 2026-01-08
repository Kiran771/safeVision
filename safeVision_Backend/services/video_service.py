import cv2
import numpy as np
import tensorflow as tf
from io import BytesIO

# Load model 
MODEL_PATH = "traffic_autoencoder_final.h5"  
model = tf.keras.models.load_model(MODEL_PATH)

IMG_SIZE = 512
ANOMALY_THRESHOLD = 'not defined'

def preprocess_frame(frame):
    """Resize and normalize frame for model"""
    frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
    frame = frame.astype(np.float32) / 255.0
    frame = np.expand_dims(frame, axis=0)  
    return frame

def generate_detection_frames(video_bytes: bytes):
    """
    Generator that yields processed frames with anomaly detection
    Input: raw video bytes
    Output: JPEG frames with overlay text (NORMAL/ACCIDENT)
    """
    # Open video from bytes
    video_stream = BytesIO(video_bytes)
    cap = cv2.VideoCapture(video_stream)

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        # Preprocess and predict
        input_frame = preprocess_frame(frame)
        recon = model.predict(input_frame, verbose=0)
        mse = np.mean((input_frame - recon) ** 2)

        # Detect anomaly
        status = "ACCIDENT" if mse > ANOMALY_THRESHOLD else "NORMAL"
        color = (0, 0, 255) if status == "ACCIDENT" else (0, 255, 0)  # Red/Green

        # Draw text on frame
        cv2.putText(frame, f"{status} (MSE: {mse:.4f})", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
        cv2.putText(frame, f"Frame: {frame_count}", (10, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        # Encode as JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        yield (b'--frame\r\n' 
        b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()