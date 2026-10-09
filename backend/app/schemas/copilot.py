from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class EvidencePackage(BaseModel):
    patient_id: str
    display_name: str
    generated_at: datetime
    metrics_summary: Dict[str, Any]
    baselines: Dict[str, Any]
    recent_alerts: List[Dict[str, Any]]
    recent_symptoms: List[Dict[str, Any]]
    data_quality_assessment: Dict[str, Any]
    missing_data_intervals: List[str]
    clinical_history_authorized: bool
    clinical_history_summary: Optional[Dict[str, Any]] = None

class CopilotQueryRequest(BaseModel):
    query_type: str  # 'trends_summary', 'alert_explanation', 'measurements_summary', 'doctor_prep', 'history_summary', 'custom'
    alert_id: Optional[str] = None
    custom_question: Optional[str] = None

class CopilotQueryResponse(BaseModel):
    query_type: str
    response_markdown: str
    evidence_package: EvidencePackage
    is_ai_generated: bool  # True if Gemma 4 generated, False if deterministic template fallback
    model_identifier: str  # e.g., 'Gemma 4 (google/gemma-4-9b-it)' or 'Deterministic Rule Template Engine (Fallback)'
    generated_at: datetime
    safety_disclaimer: str
