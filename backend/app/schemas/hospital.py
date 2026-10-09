from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class HospitalRecordResponse(BaseModel):
    id: str
    patient_id: str
    mrn: str
    primary_physician: str
    hospital_unit: str
    condition_summary: str
    clinical_history_json: Dict[str, Any]
    prior_visits_json: List[Dict[str, Any]]
    lab_summaries_json: List[Dict[str, Any]]
    updated_at: datetime

    class Config:
        from_attributes = True

class ClinicianReviewCreate(BaseModel):
    review_notes: str
    recommended_action: str  # 'routine_followup', 'schedule_telehealth', 'order_holter_monitor', 'in_person_eval', 'no_action_needed'
    alert_id: Optional[str] = None

class ClinicianReviewResponse(BaseModel):
    id: str
    patient_id: str
    clinician_id: Optional[str] = None
    clinician_name: Optional[str] = None
    alert_id: Optional[str] = None
    review_notes: str
    recommended_action: str
    reviewed_at: datetime

    class Config:
        from_attributes = True

class HospitalPatientListItem(BaseModel):
    patient_id: str
    display_name: str
    mrn: str
    date_of_birth: Optional[str] = None
    condition_summary: str
    primary_physician: str
    baseline_status: str
    active_alerts_count: int
    unreviewed_symptoms_count: int
    latest_hr: Optional[float] = None
    latest_hrv: Optional[float] = None
    last_reading_time: Optional[datetime] = None

class ClinicalReportResponse(BaseModel):
    report_id: str
    patient_id: str
    display_name: str
    mrn: str
    generated_at: datetime
    clinician_author: str
    baseline_summary: Dict[str, Any]
    trend_analysis: Dict[str, Any]
    symptom_log_summary: List[Dict[str, Any]]
    alert_history_summary: List[Dict[str, Any]]
    data_quality_assessment: Dict[str, Any]
    safety_disclaimer: str
