from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class EmergencyTriggerRequest(BaseModel):
    event_type: str = "simulated_fall_faint"
    simulated_timeout_seconds: Optional[int] = Field(25, ge=5, le=120)

class WearerResponseRequest(BaseModel):
    response: str  # 'ok', 'help'

class CaregiverAcknowledgeRequest(BaseModel):
    acknowledged_by: str

class NotificationAttemptResponse(BaseModel):
    id: str
    emergency_event_id: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    channel: str
    status: str
    message_content: str
    delivery_timestamp: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    idempotent_key: str
    created_at: datetime

    class Config:
        from_attributes = True

class EmergencyContactResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    relationship_type: str
    phone_number: str
    email: str
    priority_order: int
    is_active: bool

    class Config:
        from_attributes = True

class EmergencyEventResponse(BaseModel):
    id: str
    patient_id: str
    event_type: str
    status: str  # 'prompted', 'wearer_ok', 'escalated', 'timed_out', 'acknowledged', 'resolved'
    triggered_at: datetime
    responded_at: Optional[datetime] = None
    wearer_response: Optional[str] = None
    simulated_timeout_seconds: int
    cancellation_reason: Optional[str] = None
    created_at: datetime
    notifications: List[NotificationAttemptResponse] = []

    class Config:
        from_attributes = True
