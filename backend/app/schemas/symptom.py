from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

VALID_SYMPTOMS = {
    "chest_discomfort",
    "breathlessness",
    "dizziness",
    "fainting_near_fainting",
    "unusual_fatigue",
    "palpitations",
    "swelling",
    "other",
}

VALID_SEVERITIES = {"mild", "moderate", "severe"}

class SymptomCreate(BaseModel):
    symptom_type: str
    severity: str
    onset_at: datetime
    duration_minutes: Optional[int] = Field(None, ge=1, le=10000)
    notes: Optional[str] = None

    @field_validator("symptom_type")
    def validate_type(cls, v: str) -> str:
        if v not in VALID_SYMPTOMS:
            raise ValueError(f"Unknown symptom type '{v}'. Allowed: {list(VALID_SYMPTOMS)}")
        return v

    @field_validator("severity")
    def validate_severity(cls, v: str) -> str:
        if v not in VALID_SEVERITIES:
            raise ValueError(f"Unknown severity '{v}'. Allowed: {list(VALID_SEVERITIES)}")
        return v

class SymptomResponse(BaseModel):
    id: str
    patient_id: str
    symptom_type: str
    severity: str
    onset_at: datetime
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    urgent_guidance_displayed: bool
    urgent_guidance_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
