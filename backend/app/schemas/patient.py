from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientConsentUpdate(BaseModel):
    allow_caregiver_sharing: Optional[bool] = None
    allow_hospital_sharing: Optional[bool] = None
    allow_ai_summarization: Optional[bool] = None

class PatientConsentResponse(BaseModel):
    id: str
    patient_id: str
    allow_caregiver_sharing: bool
    allow_hospital_sharing: bool
    allow_ai_summarization: bool
    consent_updated_at: datetime

    class Config:
        from_attributes = True

class PatientResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    date_of_birth: Optional[str] = None
    biological_sex: Optional[str] = None
    baseline_status: str
    emergency_mode: bool
    created_at: datetime
    consent: Optional[PatientConsentResponse] = None

    class Config:
        from_attributes = True
