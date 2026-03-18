THRESHOLD_PRESETS = {
        "low": {
        "accident_confidence_threshold": 0.50,
        "fire_confidence_threshold":     0.40,
        "auto_confirm_threshold":        None,
    },
    "medium": {
        "accident_confidence_threshold": 0.65,
        "fire_confidence_threshold":     0.55,
        "auto_confirm_threshold":        None,
    },
    "high": {
        "accident_confidence_threshold": 0.80,
        "fire_confidence_threshold":     0.70,
        "auto_confirm_threshold":        None, 
    },
}

AUTO_CONFIRM_ENABLED = False

_cached_config = {
    "sensitivity": "medium",
    **THRESHOLD_PRESETS["medium"]
}

def get_config():
    return _cached_config

def set_sensitivity(level: str):
    if level not in THRESHOLD_PRESETS:
        raise ValueError(f"Invalid level: {level}")
    _cached_config["sensitivity"] = level
    _cached_config.update(THRESHOLD_PRESETS[level])
    print(f"[CONFIG] Sensitivity set to: {level}")

def load_config_from_db(db):
    from safeVision_Backend.models.table_creation import DetectionConfig
    config = db.query(DetectionConfig).first()
    if config:
        set_sensitivity(config.sensitivity)
        print(f"[CONFIG] Restored from DB: {config.sensitivity}")
    else:
        print("[CONFIG] No config in DB yet, using default: medium")
