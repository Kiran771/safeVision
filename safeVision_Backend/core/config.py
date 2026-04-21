from pydantic_settings import BaseSettings,SettingsConfigDict

# Load app configuration from environment variables using Pydantic BaseSettings 
class Settings(BaseSettings):
    POSTGRES_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    BREVO_API_KEY: str
    BREVO_EMAIL_FROM: str
    VERIFICATION_SECRET_KEY: str


    model_config=SettingsConfigDict(
        env_file = ".env" ,
        case_sensitive=False
    ) 

# Create a global settings instance that can be imported and used throughout the application
settings = Settings()
