import os
from pydantic import EmailStr
from itsdangerous import URLSafeTimedSerializer,SignatureExpired,BadSignature
from fastapi import HTTPException,status
from dotenv import load_dotenv


load_dotenv()

SECRET=os.getenv('VERIFICATION_SECRET_KEY')

if not SECRET:
  raise RuntimeError("VERIFICATION_SECRET_KEY is missing in .env")

serializer=URLSafeTimedSerializer(SECRET)


def generate_verification_token(email:EmailStr):
  return serializer.dumps(
    {'email':email},
    salt="safevision-contact-verification"
  )

def verify_verification_token(token:str):
  try:
    data=serializer.loads(
      token,
      salt="safevision-contact-verification",
      max_age=86400
    )
    return data['email']
  except SignatureExpired:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Verification link has expired"
    )
  except BadSignature:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Invalid verification token"
    )
  except Exception:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Invalid or corrupted link"

    )
  



