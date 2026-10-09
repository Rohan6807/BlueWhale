from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.symptom import Symptom
from app.schemas.symptom import SymptomCreate, SymptomResponse
from app.api.deps import get_current_user, verify_patient_access
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/symptoms", tags=["Symptoms"])

HIGH_RISK_SYMPTOMS = {"chest_discomfort", "fainting_near_fainting"}

def evaluate_urgent_guidance(symptom_type: str, severity: str) -> Optional[str]:
    """
    Healthcare Safety Check:
    If serious symptoms are reported, provide immediate safety guidance without delay.
    """
    if symptom_type == "chest_discomfort":
        return (
            "URGENT CLINICAL GUIDANCE: Chest discomfort or pain can be an indicator of an acute coronary syndrome or other medical emergency. "
            "Please call 911 (or your local emergency response service) immediately. Do not drive yourself to an emergency department."
        )
    if symptom_type == "fainting_near_fainting":
        return (
            "SAFETY NOTICE: Syncopal episodes or fainting warrant prompt medical assessment to exclude cardiovascular, autonomic, or metabolic causes. "
            "Sit or lie down with legs elevated. If accompanied by shortness of breath or chest pain, seek emergency medical attention."
        )
    if symptom_type == "breathlessness" and severity == "severe":
        return (
            "URGENT CLINICAL GUIDANCE: Severe sudden breathlessness requires immediate clinical evaluation. "
            "Contact emergency services or proceed to the nearest emergency department."
        )
    return None

@router.get("", response_model=List[SymptomResponse])
def get_symptoms(
    patient_id: str = Query(..., description="Target patient ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    symptoms = (
        db.query(Symptom)
        .filter(Symptom.patient_id == patient_id)
        .order_by(Symptom.onset_at.desc())
        .all()
    )
    results = []
    for s in symptoms:
        guidance = evaluate_urgent_guidance(s.symptom_type, s.severity)
        resp = SymptomResponse(
            id=s.id,
            patient_id=s.patient_id,
            symptom_type=s.symptom_type,
            severity=s.severity,
            onset_at=s.onset_at,
            duration_minutes=s.duration_minutes,
            notes=s.notes,
            urgent_guidance_displayed=s.urgent_guidance_displayed,
            urgent_guidance_message=guidance if s.urgent_guidance_displayed else None,
            created_at=s.created_at,
        )
        results.append(resp)
    return results

@router.post("", response_model=SymptomResponse, status_code=201)
def log_symptom(
    patient_id: str = Query(...),
    payload: SymptomCreate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    guidance = evaluate_urgent_guidance(payload.symptom_type, payload.severity)
    needs_guidance = guidance is not None

    symptom_obj = Symptom(
        patient_id=patient_id,
        symptom_type=payload.symptom_type,
        severity=payload.severity,
        onset_at=payload.onset_at,
        duration_minutes=payload.duration_minutes,
        notes=payload.notes,
        urgent_guidance_displayed=needs_guidance,
    )
    db.add(symptom_obj)
    db.commit()
    db.refresh(symptom_obj)

    log_audit_event(
        db,
        action="LOG_SYMPTOM",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details={"type": payload.symptom_type, "severity": payload.severity, "urgent_guidance": needs_guidance},
    )

    return SymptomResponse(
        id=symptom_obj.id,
        patient_id=symptom_obj.patient_id,
        symptom_type=symptom_obj.symptom_type,
        severity=symptom_obj.severity,
        onset_at=symptom_obj.onset_at,
        duration_minutes=symptom_obj.duration_minutes,
        notes=symptom_obj.notes,
        urgent_guidance_displayed=needs_guidance,
        urgent_guidance_message=guidance,
        created_at=symptom_obj.created_at,
    )
