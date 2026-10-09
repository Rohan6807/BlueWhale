import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class HospitalRecord(Base):
    __tablename__ = "hospital_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    mrn = Column(String(50), unique=True, nullable=False, index=True)  # Fictional Medical Record Number
    primary_physician = Column(String(255), nullable=False)
    hospital_unit = Column(String(100), default="Cardiology Outpatient Clinic", nullable=False)
    condition_summary = Column(Text, nullable=False)
    clinical_history_json = Column(JSON, nullable=False)  # list of diagnoses, allergies, current medications
    prior_visits_json = Column(JSON, nullable=False)      # list of past appointments & clinical findings
    lab_summaries_json = Column(JSON, nullable=False)     # recent lab tests (Lipid panel, Troponin, CBC, etc.)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="hospital_record")

class ClinicianReview(Base):
    __tablename__ = "clinician_reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    clinician_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    alert_id = Column(String(36), ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True)
    review_notes = Column(Text, nullable=False)
    recommended_action = Column(String(100), nullable=False)  # 'routine_followup', 'schedule_telehealth', 'order_holter_monitor', 'in_person_eval', 'no_action_needed'
    reviewed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="clinician_reviews")
    clinician = relationship("User")
