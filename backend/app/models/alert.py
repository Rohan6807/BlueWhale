import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # 'sustained_elevated_hr', 'hrv_suppression', 'blood_pressure_shift', 'activity_suppression', 'multivariate_anomaly', 'missing_sensor_data'
    severity = Column(String(30), default="advisory", nullable=False)  # 'info', 'advisory', 'attention', 'urgent_medical_review'
    status = Column(String(30), default="new", nullable=False, index=True)  # 'new', 'acknowledged', 'resolved'
    rule_id = Column(String(100), nullable=False)
    explanation = Column(Text, nullable=False)
    evidence_json = Column(JSON, nullable=False)  # detailed metrics, baseline reference, z-score/deviation, window
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(String(255), nullable=True)

    patient = relationship("Patient", back_populates="alerts")

    __table_args__ = (
        Index("ix_alert_patient_status_created", "patient_id", "status", "created_at"),
    )
