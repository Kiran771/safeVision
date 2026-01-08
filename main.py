from fastapi import FastAPI
from safeVision_Backend.core.psql_db import engine ,Base
from safeVision_Backend.models import table_creation

# Create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI()