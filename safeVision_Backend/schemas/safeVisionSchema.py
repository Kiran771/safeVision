from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator



# Admin Schemas 
class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    contact: Optional[str] = Field(None, min_length=10, max_length=15)
    role: str
    password: str = Field(..., min_length=8)

# Login Request Schema
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


class AdminUpdate(BaseModel):
    username : Optional[str] = Field(None, min_length=3, max_length=60)
    email : Optional[EmailStr] = None
    contact : Optional[str] = Field(None, min_length=10, max_length=20)
    role : Optional[str] = Field(None, min_length=2,  max_length=30)
    password: Optional[str] = Field(None, min_length=8)


class UserOut(BaseModel):
    userid : int
    username : str
    email : str
    contact : Optional[str] = None
    role : str
    is_active : bool
    created_at: datetime
    class Config:
        from_attributes = True


# Emergency Contact Schemas
class EmergencyContactBase(BaseModel):
    authority_name: str = Field(..., min_length=2, max_length=150)
    contact_number: str = Field(..., min_length=10, max_length=20)
    category: str = Field(..., min_length=3, max_length=50)
    latitude: float
    longitude: float
    location: str = Field(..., max_length=255)
    email: EmailStr

class EmergencyContactCreate(EmergencyContactBase):
    pass


class EmergencyContactOut(BaseModel):
    contactid: int
    authority_name: str
    contact_number: str
    category: str
    latitude: float
    longitude: float
    location: str
    email: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True



class EmergencyContactUpdate(BaseModel):
    authority_name: Optional[str] = None
    contact_number: Optional[str] = None
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location: Optional[str] = None
    email: Optional[EmailStr] = None

class CameraCreate(BaseModel):
    location_id: int
    admin_id : int
    status : str = Field(default="active", max_length=20)

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        allowed = {"active", "inactive", "maintenance"}
        if v.lower() not in allowed:
            raise ValueError(f"status must be one of: {allowed}")
        return v.lower()

class CameraUpdate(BaseModel):
    location_id: int
    admin_id : int
    status : str = Field(default="active", max_length=20)

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        allowed = {"active", "inactive", "maintenance"}
        if v.lower() not in allowed:
            raise ValueError(f"status must be one of: {allowed}")
        return v.lower()

class CameraOut(BaseModel):
    cameraid   : int
    location   : str
    location_id: int
    assigned_to: str               
    admin_id   : int          
    status     : str

    class Config:
        from_attributes = True

class AvailableAdminOut(BaseModel):
    userid  : int
    username: str


class LocationOut(BaseModel):
    location_id: int
    name       : str  


class AccidentOut(BaseModel):
    accidentid : int
    cameraid : int
    timestamp : datetime
    confidence : Optional[float] = None
    status : str
    frame_path : Optional[str]   = None
    detection_type : Optional[str]   = None
    location : Optional[str]   = None   

    class Config:
        from_attributes = True


class AccidentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|rejected|pending)$")


class AlertOut(BaseModel):
    alertid : int
    status : str
    alert_time : datetime
    contactid  : int
    accidentid : int
    userid : Optional[int] = None   

    class Config:
        from_attributes = True


class AlertStatsOut(BaseModel):
    total : int
    sent  : int
    failed: int


class DetectionSettingsOut(BaseModel):
    id : int
    camera_id : Optional[int]   = None  
    accident_confidence : float
    fire_confidence : float
    borderline_threshold : float
    consecutive_frames_needed: int
    cooldown_seconds : int
    updated_at : Optional[datetime] = None

    class Config:
        from_attributes = True


class DetectionSettingsUpdate(BaseModel):
    camera_id  : Optional[int]   = None
    accident_confidence : Optional[float] = Field(None, ge=0.0, le=1.0)
    fire_confidence : Optional[float] = Field(None, ge=0.0, le=1.0)
    borderline_threshold : Optional[float] = Field(None, ge=0.0, le=1.0)
    consecutive_frames_needed : Optional[int]  = Field(None, ge=1, le=30)
    cooldown_seconds : Optional[int] = Field(None, ge=1, le=300)
    updated_by : Optional[int] = None 

