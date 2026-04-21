# Threshold preset for accident and fire confidence levels
THRESHOLD_PRESETS = {
        "low": {
        "accident_confidence_threshold": 0.40,
        "fire_confidence_threshold":     0.40,
        "auto_confirm_threshold":        None,
    },
    "medium": {
        "accident_confidence_threshold": 0.55,
        "fire_confidence_threshold":     0.55,
        "auto_confirm_threshold":        None,
    },
    "high": {
        "accident_confidence_threshold": 0.70,
        "fire_confidence_threshold":     0.70,
        "auto_confirm_threshold":        None, 
    },
}

# Global variable to disable auto-confirmation of detections based on confidence scores
AUTO_CONFIRM_ENABLED = False

# Mapping of alert categories 
cached_config = {
    "sensitivity": "low",
    **THRESHOLD_PRESETS["low"]
}

# Function to get current detection configuration from cache
def get_config():
    return cached_config

# Function to set sensitivity level and update cached configuration with corresponding thresholds
def set_sensitivity(level: str):
    if level not in THRESHOLD_PRESETS:
        raise ValueError(f"Invalid level: {level}")
    cached_config["sensitivity"] = level
    cached_config.update(THRESHOLD_PRESETS[level])
    print(f"[CONFIG] Sensitivity set to: {level}")

# Function to load detection configuration from database and update cached configuration accordingly
def load_config_from_db(db):
    from safeVision_Backend.models.table_creation import DetectionConfig
    config = db.query(DetectionConfig).first()
    if config:
        set_sensitivity(config.sensitivity)
        print(f"[CONFIG] Restored from DB: {config.sensitivity}")
    else:
        print("[CONFIG] No config in DB yet, using default: low")
