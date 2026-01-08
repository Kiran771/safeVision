from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from safeVision_Backend.core.config import settings 

# settings to get database URL
DATABASE_URL = settings.POSTGRES_URL

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=True,  
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,  
    max_overflow=20  
)

# Create session 
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()