from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.sql import func
from datetime import datetime
from safeVision_Backend.core.psql_db import Base


class User(Base):
    __tablename__ = 'users'

    userid = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String(60), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    contact = Column(String(20),unique=True)   
    role = Column(String(30), nullable=False)
    password_hash = Column(String(255), nullable=False) 
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Camera(Base):
    __tablename__ = 'cameras'

    cameraid = Column(Integer, primary_key=True, autoincrement=True, index=True)
    location = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, default='active')
    userid = Column(Integer, ForeignKey('users.userid'), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserCamera(Base):
    __tablename__ = 'user_cameras'

    usercameraid = Column(Integer, primary_key=True, autoincrement=True)
    userid = Column(Integer, ForeignKey('users.userid'), nullable=False, index=True)
    cameraid = Column(Integer, ForeignKey('cameras.cameraid'), nullable=False, index=True)
    assigned_date  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active  = Column(Boolean, default=True, nullable=False)


class Accident(Base):
    __tablename__ = 'accidents'

    accidentid = Column(Integer, primary_key=True, autoincrement=True, index=True)
    cameraid  = Column(Integer, ForeignKey('cameras.cameraid'), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    reconstruction_error = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    status = Column(String(30), nullable=False, default='pending')
    reconstructed_frame_path = Column(String(500), nullable=True)
    frame_path = Column(String(500), nullable=True)


class EmergencyContact(Base):
    __tablename__ = 'emergency_contacts'

    contactid = Column(Integer, primary_key=True, autoincrement=True, index=True)
    authority_name = Column(String(150), nullable=False)
    contact_number = Column(String(20), nullable=False)
    category = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location  = Column(String(255), nullable=False)
    email   = Column(String(120), nullable=True)
    is_active  = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Alert(Base):
    __tablename__ = 'alerts'

    alertid = Column(Integer, primary_key=True, autoincrement=True, index=True)
    status  = Column(String(30), nullable=False, default='pending', index=True)
    alert_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    contactid = Column(Integer, ForeignKey('emergency_contacts.contactid'), nullable=False, index=True)
    accidentid = Column(Integer, ForeignKey('accidents.accidentid'), nullable=False, index=True)
    userid = Column(Integer, ForeignKey('users.userid'), nullable=True, index=True)