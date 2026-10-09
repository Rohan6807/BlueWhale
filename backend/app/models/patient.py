import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    date_of_birth = Column(String(20), nullable=True)
    biological_sex = Column(String(20), nullable=True)  # 'female', 'male', 'other'
    baseline_status = Column(String(50), default="calibrated", nullable=False)  # 'calibrating', 'calibrated', 'stale'
    emergency_mode = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="patient")
    consent = relationship("PatientConsent", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    measurements = relationship("Measurement", back_populates="patient", cascade="all, delete-orphan")
    symptoms = relationship("Symptom", back_populates="patient", cascade="all, delete-orphan")
    baselines = relationship("PersonalBaseline", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")
    emergency_events = relationship("EmergencyEvent", back_populates="patient", cascade="all, delete-orphan")
    emergency_contacts = relationship("EmergencyContact", back_populates="patient", cascade="all, delete-orphan")
    hospital_record = relationship("HospitalRecord", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    clinician_reviews = relationship("ClinicianReview", back_populates="patient", cascade="all, delete-orphan")

class PatientConsent(Base):
    __tablename__ = "patient_consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    allow_caregiver_sharing = Column(Boolean, default=True, nullable=False)
    allow_hospital_sharing = Column(Boolean, default=True, nullable=False)
    allow_ai_summarization = Column(Boolean, default=True, nullable=False)
    consent_updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="consent")
