from pydantic import BaseModel,EmailStr

class registerUser(BaseModel):
    name: str
    contact:str
    email:EmailStr
    password: str


