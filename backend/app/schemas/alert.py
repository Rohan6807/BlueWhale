from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = "patient_user"

class AlertResponse(BaseModel):
    id: str
    patient_id: str
    category: str
    severity: str
    status: str
    rule_id: str
    explanation: str
    evidence_json: Dict[str, Any]
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    class Config:
        from_attributes = True

class AlertEvaluationResult(BaseModel):
    evaluated_patient_id: str
    new_alerts_count: int
    existing_alerts_count: int
    rule_evaluations: Dict[str, Any]
