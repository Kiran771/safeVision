from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from datetime import datetime
from safeVision_Backend.core.psql_db import Base

class User(Base):
    __tablename__ = 'User'
    UserId = Column(Integer, primary_key=True, autoincrement=True, index=True)
    UserName = Column(String, unique=True, nullable=False)
    Email = Column(String, unique=True, nullable=False)
    Contact = Column(String,unique=True)
    Role = Column(String, nullable=False)
    Password = Column(String, nullable=False)


class Camera(Base):
    __tablename__ = 'Camera'
    CameraId = Column(Integer, primary_key=True, autoincrement=True, index=True)
    Location = Column(String)
    Status = Column(String)
    UserId = Column(Integer, ForeignKey('User.UserId'))



class UserCamera(Base):
    __tablename__ = 'userCamera'
    userCameraId = Column(Integer, primary_key=True, autoincrement=True)
    UserId = Column(Integer, ForeignKey('User.UserId'))
    CameraId = Column(Integer, ForeignKey('Camera.CameraId'))
    AssignedDate = Column(DateTime,default=datetime.now)


class Accident(Base):
    __tablename__ = 'Accident'
    AccidentId = Column(Integer, primary_key=True, autoincrement=True)
    CameraId = Column(Integer, ForeignKey('Camera.CameraId'))
    Timestamp = Column(DateTime,default=datetime.now)
    ReconstructionError = Column(Float)
    Status = Column(String)
    framePath = Column(String)



class EmergencyContact(Base):
    __tablename__ = 'EmergencyContact'
    ContactId = Column(Integer, primary_key=True, autoincrement=True)
    AuthorityName = Column(String)
    ContactNumber = Column(String)
    Category = Column(String)
    location=Column(String)



class Alert(Base):
    __tablename__ = 'Alert'
    AlertId = Column(Integer, primary_key=True, autoincrement=True)
    Status = Column(String)
    AlertTime = Column(DateTime,default=datetime.now)
    ContactId = Column(Integer, ForeignKey('EmergencyContact.ContactId'))
    AccidentId = Column(Integer, ForeignKey('Accident.AccidentId'))
    UserId = Column(Integer, ForeignKey('User.UserId'))

