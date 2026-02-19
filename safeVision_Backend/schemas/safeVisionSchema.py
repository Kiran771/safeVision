from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# Admin / User Schemas 
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

# Admin update schema
class AdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    contact: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


# Emergency Contact Schemas
class EmergencyContactBase(BaseModel):
    authority_name: str = Field(..., min_length=2, max_length=150)
    contact_number: str = Field(..., min_length=10, max_length=20)
    category: str = Field(..., min_length=3, max_length=50)
    latitude: float
    longitude: float
    location: str = Field(..., max_length=255)
    email: Optional[EmailStr] = None

class EmergencyContactCreate(EmergencyContactBase):
    class Config:
        from_attributes = True


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


class EmergencyContactResponse(EmergencyContactBase):
    id: int

    class Config:
        from_attributes = True   
