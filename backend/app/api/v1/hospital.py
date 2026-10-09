import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.patient import Patient
from app.models.measurement import Measurement
from app.models.alert import Alert
from app.models.symptom import Symptom
from app.models.baseline import PersonalBaseline
from app.models.hospital import HospitalRecord, ClinicianReview
from app.schemas.hospital import (
    HospitalRecordResponse,
    ClinicianReviewCreate,
    ClinicianReviewResponse,
    HospitalPatientListItem,
    ClinicalReportResponse,
)
from app.api.deps import get_current_user, require_role, verify_patient_access
from app.services.monitoring_engine import MonitoringEngine
from app.services.fhir_adapter import fhir_adapter
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/hospital", tags=["Hospital Portal"])

@router.get("/patients", response_model=List[HospitalPatientListItem])
def list_hospital_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Renders patient roster for clinician portal with fictional records.
    """
    patients = db.query(Patient).all()
    items: List[HospitalPatientListItem] = []

    for p in patients:
        rec = p.hospital_record
        condition_str = rec.condition_summary if rec else "Unassigned / Ambulatory Monitoring"
        physician_str = rec.primary_physician if rec else "Unassigned"
        mrn_str = rec.mrn if rec else f"MRN-{p.id[:6].upper()}"

        active_alerts = db.query(Alert).filter(Alert.patient_id == p.id, Alert.status == "new").count()
        symptoms_count = db.query(Symptom).filter(Symptom.patient_id == p.id).count()

        latest_hr = (
            db.query(Measurement)
            .filter(Measurement.patient_id == p.id, Measurement.metric == "heart_rate")
            .order_by(Measurement.measured_at.desc())
            .first()
        )
        latest_hrv = (
            db.query(Measurement)
            .filter(Measurement.patient_id == p.id, Measurement.metric == "hrv_rmssd")
            .order_by(Measurement.measured_at.desc())
            .first()
        )

        items.append(
            HospitalPatientListItem(
                patient_id=p.id,
                display_name=p.display_name,
                mrn=mrn_str,
                date_of_birth=p.date_of_birth,
                condition_summary=condition_str,
                primary_physician=physician_str,
                baseline_status=p.baseline_status,
                active_alerts_count=active_alerts,
                unreviewed_symptoms_count=symptoms_count,
                latest_hr=latest_hr.numeric_value if latest_hr else None,
                latest_hrv=latest_hrv.numeric_value if latest_hrv else None,
                last_reading_time=latest_hr.measured_at if latest_hr else None,
            )
        )

    log_audit_event(
        db,
        action="VIEW_CLINICIAN_PATIENT_ROSTER",
        user_id=current_user.id,
        details={"roster_size": len(items)},
    )
    return items

@router.get("/patients/{patient_id}/record", response_model=HospitalRecordResponse)
def get_hospital_record(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    rec = db.query(HospitalRecord).filter(HospitalRecord.patient_id == patient_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Hospital record not found")

    log_audit_event(
        db,
        action="VIEW_HOSPITAL_RECORD",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details={"mrn": rec.mrn},
    )
    return rec

@router.post("/patients/{patient_id}/review", response_model=ClinicianReviewResponse, status_code=201)
def submit_clinician_review(
    patient_id: str,
    payload: ClinicianReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    review = ClinicianReview(
        patient_id=patient_id,
        clinician_id=current_user.id,
        alert_id=payload.alert_id,
        review_notes=payload.review_notes,
        recommended_action=payload.recommended_action,
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    log_audit_event(
        db,
        action="SUBMIT_CLINICIAN_REVIEW",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details={"action": payload.recommended_action},
    )

    return ClinicianReviewResponse(
        id=review.id,
        patient_id=review.patient_id,
        clinician_id=review.clinician_id,
        clinician_name=current_user.full_name,
        alert_id=review.alert_id,
        review_notes=review.review_notes,
        recommended_action=review.recommended_action,
        reviewed_at=review.reviewed_at,
    )

@router.get("/patients/{patient_id}/reviews", response_model=List[ClinicianReviewResponse])
def get_clinician_reviews(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    reviews = (
        db.query(ClinicianReview)
        .filter(ClinicianReview.patient_id == patient_id)
        .order_by(ClinicianReview.reviewed_at.desc())
        .all()
    )
    results = []
    for r in reviews:
        c_name = r.clinician.full_name if r.clinician else "Dr. Staff Clinician"
        results.append(
            ClinicianReviewResponse(
                id=r.id,
                patient_id=r.patient_id,
                clinician_id=r.clinician_id,
                clinician_name=c_name,
                alert_id=r.alert_id,
                review_notes=r.review_notes,
                recommended_action=r.recommended_action,
                reviewed_at=r.reviewed_at,
            )
        )
    return results

@router.get("/patients/{patient_id}/report", response_model=ClinicalReportResponse)
def generate_clinical_report(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates a consolidated clinical report summary suitable for printing or doctor consultations.
    """
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    rec = patient.hospital_record
    mrn = rec.mrn if rec else "MRN-PENDING"

    engine_svc = MonitoringEngine(db)
    stale_info = engine_svc.detect_missing_and_stale_data(patient_id)

    # Baselines summary
    baselines = db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()
    baseline_summary = {
        b.metric: {
            "median": b.median_value,
            "mad": b.mad_value,
            "window_days": b.window_days,
            "sample_count": b.sample_count,
        }
        for b in baselines
    }

    # Trend calculations (latest vs median)
    trend_analysis = {}
    for b in baselines:
        latest = (
            db.query(Measurement)
            .filter(Measurement.patient_id == patient_id, Measurement.metric == b.metric)
            .order_by(Measurement.measured_at.desc())
            .first()
        )
        if latest:
            diff = latest.numeric_value - b.median_value
            trend_analysis[b.metric] = {
                "latest_value": latest.numeric_value,
                "unit": latest.unit,
                "diff_from_baseline": round(diff, 1),
                "is_elevated": diff > (1.8 * b.mad_value),
            }

    # Symptoms
    symptoms = (
        db.query(Symptom)
        .filter(Symptom.patient_id == patient_id)
        .order_by(Symptom.onset_at.desc())
        .limit(10)
        .all()
    )
    symptom_summary = [
        {
            "type": s.symptom_type,
            "severity": s.severity,
            "onset": s.onset_at.isoformat(),
            "duration_min": s.duration_minutes,
            "notes": s.notes,
        }
        for s in symptoms
    ]

    # Alerts
    alerts = (
        db.query(Alert)
        .filter(Alert.patient_id == patient_id)
        .order_by(Alert.created_at.desc())
        .limit(10)
        .all()
    )
    alert_summary = [
        {
            "category": a.category,
            "severity": a.severity,
            "status": a.status,
            "explanation": a.explanation,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]

    log_audit_event(
        db,
        action="GENERATE_CLINICAL_REPORT",
        user_id=current_user.id,
        target_patient_id=patient_id,
    )

    return ClinicalReportResponse(
        report_id=f"RPT-{uuid.uuid4().hex[:8].upper()}",
        patient_id=patient_id,
        display_name=patient.display_name,
        mrn=mrn,
        generated_at=datetime.now(timezone.utc),
        clinician_author=current_user.full_name,
        baseline_summary=baseline_summary,
        trend_analysis=trend_analysis,
        symptom_log_summary=symptom_summary,
        alert_history_summary=alert_summary,
        data_quality_assessment=stale_info,
        safety_disclaimer=settings.DISCLAIMER_TEXT,
    )

@router.get("/patients/{patient_id}/fhir")
def export_fhir_data(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports FHIR R4 Bundle representation for hospital EMR interoperability.
    """
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    rec = patient.hospital_record
    patient_dict = {
        "id": patient.id,
        "mrn": rec.mrn if rec else "MRN-000",
        "display_name": patient.display_name,
        "biological_sex": patient.biological_sex,
        "date_of_birth": patient.date_of_birth,
    }

    patient_resource = fhir_adapter.export_patient_resource(patient_dict)

    recent_m = (
        db.query(Measurement)
        .filter(Measurement.patient_id == patient_id)
        .order_by(Measurement.measured_at.desc())
        .limit(10)
        .all()
    )

    observation_resources = [
        fhir_adapter.export_observation_resource({
            "id": m.id,
            "patient_id": m.patient_id,
            "metric": m.metric,
            "numeric_value": m.numeric_value,
            "unit": m.unit,
            "measured_at": m.measured_at.isoformat(),
            "source": m.source,
        })
        for m in recent_m
    ]

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": patient_resource}] + [{"resource": obs} for obs in observation_resources],
    }
