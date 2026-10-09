import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class EmergencyEvent(Base):
    __tablename__ = "emergency_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), default="simulated_fall_faint", nullable=False)
    status = Column(String(50), default="prompted", nullable=False, index=True)  # 'prompted', 'wearer_ok', 'escalated', 'timed_out', 'acknowledged', 'resolved'
    triggered_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    wearer_response = Column(String(50), nullable=True)  # 'ok', 'help', 'timeout'
    simulated_timeout_seconds = Column(Integer, default=25, nullable=False)
    cancellation_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="emergency_events")
    notification_attempts = relationship("NotificationAttempt", back_populates="emergency_event", cascade="all, delete-orphan")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    relationship_type = Column(String(100), nullable=False)  # 'Spouse', 'Adult Child', 'Primary Caregiver', 'Neighbor'
    phone_number = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    priority_order = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    patient = relationship("Patient", back_populates="emergency_contacts")
    notification_attempts = relationship("NotificationAttempt", back_populates="contact")

class NotificationAttempt(Base):
    __tablename__ = "notification_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    emergency_event_id = Column(String(36), ForeignKey("emergency_events.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id = Column(String(36), ForeignKey("emergency_contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    channel = Column(String(50), nullable=False)  # 'sms', 'automated_voice', 'email', 'push'
    status = Column(String(50), default="delivered", nullable=False)  # 'queued', 'delivered', 'failed'
    message_content = Column(Text, nullable=False)
    delivery_timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    idempotent_key = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    emergency_event = relationship("EmergencyEvent", back_populates="notification_attempts")
    contact = relationship("EmergencyContact", back_populates="notification_attempts")
