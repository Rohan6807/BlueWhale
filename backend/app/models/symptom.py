import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    symptom_type = Column(String(100), nullable=False, index=True)  # 'chest_discomfort', 'breathlessness', 'dizziness', 'fainting_near_fainting', 'unusual_fatigue', 'palpitations', 'swelling', 'other'
    severity = Column(String(30), nullable=False)  # 'mild', 'moderate', 'severe'
    onset_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    urgent_guidance_displayed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="symptoms")

    __table_args__ = (
        Index("ix_symptom_patient_onset", "patient_id", "onset_at"),
    )
