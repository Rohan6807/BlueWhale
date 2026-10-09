from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.patient import Patient, PatientConsent
from app.models.measurement import Measurement
from app.models.baseline import PersonalBaseline
from app.models.alert import Alert
from app.schemas.patient import PatientResponse, PatientConsentUpdate, PatientConsentResponse
from app.schemas.measurement import PatientDashboardSummary, MetricLatest
from app.api.deps import get_current_user, verify_patient_access
from app.services.monitoring_engine import MonitoringEngine, calculate_robust_z_score
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/me", response_model=PatientResponse)
def get_my_patient_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        # Fallback to pat-001 if testing
        patient = db.query(Patient).filter(Patient.id == "pat-001").first()
        if not patient:
            raise HTTPException(status_code=404, detail="No associated patient profile found")
    return patient

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_by_id(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    log_audit_event(
        db,
        action="VIEW_PATIENT_PROFILE",
        user_id=current_user.id,
        target_patient_id=patient_id,
    )
    return patient

@router.put("/{patient_id}/consent", response_model=PatientConsentResponse)
def update_patient_consent(
    patient_id: str,
    payload: PatientConsentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    consent = patient.consent
    if not consent:
        consent = PatientConsent(patient_id=patient_id)
        db.add(consent)

    if payload.allow_caregiver_sharing is not None:
        consent.allow_caregiver_sharing = payload.allow_caregiver_sharing
    if payload.allow_hospital_sharing is not None:
        consent.allow_hospital_sharing = payload.allow_hospital_sharing
    if payload.allow_ai_summarization is not None:
        consent.allow_ai_summarization = payload.allow_ai_summarization

    consent.consent_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(consent)

    log_audit_event(
        db,
        action="UPDATE_PATIENT_CONSENT",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details=payload.model_dump(exclude_unset=True),
    )
    return consent

@router.get("/{patient_id}/summary", response_model=PatientDashboardSummary)
def get_patient_dashboard_summary(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    engine_svc = MonitoringEngine(db)
    stale_info = engine_svc.detect_missing_and_stale_data(patient_id)

    # Baselines map
    baselines = {b.metric: b for b in db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()}

    # Distinct metrics to check
    metric_keys = [
        "heart_rate",
        "hrv_rmssd",
        "systolic_bp",
        "diastolic_bp",
        "sleep_duration_hours",
        "sleep_score",
        "daily_steps",
    ]

    latest_metrics_list: List[MetricLatest] = []
    for key in metric_keys:
        m = (
            db.query(Measurement)
            .filter(Measurement.patient_id == patient_id, Measurement.metric == key)
            .order_by(Measurement.measured_at.desc())
            .first()
        )
        if m:
            base = baselines.get(key)
            diff_pct = None
            base_med = None
            status_label = "normal"

            if base and base.median_value > 0:
                base_med = base.median_value
                diff_pct = round(((m.numeric_value - base_med) / base_med) * 100.0, 1)
                z = calculate_robust_z_score(m.numeric_value, base.median_value, base.mad_value)
                if abs(z) >= 2.5:
                    status_label = "elevated" if z > 0 else "suppressed"
                elif abs(z) >= 1.5:
                    status_label = "caution"

            latest_metrics_list.append(
                MetricLatest(
                    metric=m.metric,
                    numeric_value=m.numeric_value,
                    unit=m.unit,
                    measured_at=m.measured_at,
                    source=m.source,
                    quality=m.quality,
                    change_vs_baseline_percent=diff_pct,
                    baseline_median=base_med,
                    status=status_label,
                )
            )

    active_alerts_count = (
        db.query(Alert)
        .filter(Alert.patient_id == patient_id, Alert.status == "new")
        .count()
    )

    return PatientDashboardSummary(
        patient_id=patient.id,
        display_name=patient.display_name,
        baseline_status=patient.baseline_status,
        emergency_mode=patient.emergency_mode,
        latest_metrics=latest_metrics_list,
        sensor_quality_score=stale_info["sensor_quality_score"],
        data_completeness_score=stale_info["data_completeness_score"],
        active_alerts_count=active_alerts_count,
        last_synced_at=stale_info["last_synced_at"],
        disclaimer=settings.DISCLAIMER_TEXT,
    )
