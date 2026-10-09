import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class PersonalBaseline(Base):
    __tablename__ = "personal_baselines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    metric = Column(String(50), nullable=False, index=True)
    median_value = Column(Float, nullable=False)
    mad_value = Column(Float, nullable=False)  # Median Absolute Deviation
    p10_value = Column(Float, nullable=False)   # 10th percentile
    p90_value = Column(Float, nullable=False)   # 90th percentile
    window_days = Column(Integer, default=14, nullable=False)
    sample_count = Column(Integer, default=0, nullable=False)
    computed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="baselines")

    __table_args__ = (
        Index("ix_baseline_patient_metric", "patient_id", "metric"),
    )
