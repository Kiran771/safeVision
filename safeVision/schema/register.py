from pydantic import BaseModel,EmailStr

class register(BaseModel):
    name: str
    contact:str
    email:EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
