from typing import Optional
from pydantic import BaseModel,EmailStr, Field

# Schema for creating an admin user
class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    contact: str | None = Field(None, min_length=10, max_length=15)
    role: str
    password: str = Field(..., min_length=8)


# Schema for login request
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


# Schema for updating an admin user
class AdminUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    contact: str | None = None
    role: str | None = None
    password: str | None = None


# Schema fro emergency contact 
class EmergencyContactBase(BaseModel):
    AuthorityName: str
    ContactNumber: str = Field(min_length=10, max_length=15)
    Category: str
    latitude: float
    longitude: float
    email:Optional[EmailStr] = None
    Location: str

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContactResponse(EmergencyContactBase):
    ContactId: int

    class Config:
        from_attributes = True