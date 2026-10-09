import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    metric = Column(String(50), nullable=False, index=True)  # 'heart_rate', 'hrv_rmssd', 'systolic_bp', 'diastolic_bp', 'spo2', 'sleep_duration_hours', 'sleep_score', 'daily_steps'
    numeric_value = Column(Float, nullable=False)
    unit = Column(String(30), nullable=False)  # 'bpm', 'ms', 'mmHg', '%', 'hours', 'score', 'steps'
    measured_at = Column(DateTime(timezone=True), nullable=False, index=True)
    source = Column(String(100), default="wearable_sensor", nullable=False)  # 'optical_ppg', 'ecg_patch', 'cuff_monitor', 'accelerometer', 'synthetic_generator'
    quality = Column(String(30), default="high", nullable=False)  # 'high', 'medium', 'low', 'degraded_motion'
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="measurements")

    __table_args__ = (
        Index("ix_measurement_patient_metric_time", "patient_id", "metric", "measured_at"),
    )
