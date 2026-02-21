from pydantic_settings import BaseSettings,SettingsConfigDict

class Settings(BaseSettings):
    POSTGRES_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    BREVO_API_KEY: str
    BREVO_EMAIL_FROM: str
    VERIFICATION_SECRET_KEY: str


    model_config=SettingsConfigDict(
        env_file = ".env" ,
        case_sensitive=False
    ) 
    
    

settings = Settings()
