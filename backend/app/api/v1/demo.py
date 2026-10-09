from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.patient import Patient
from app.models.measurement import Measurement
from app.models.symptom import Symptom
from app.models.baseline import PersonalBaseline
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse
from app.api.deps import get_current_user, verify_patient_access
from app.data.seed_data import reset_and_seed_database
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/demo", tags=["Demo Management"])

@router.post("/reset")
def reset_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resets the database back to initial factory state with 4 synthetic patients.
    """
    reset_and_seed_database(db)
    log_audit_event(
        db,
        action="DEMO_DATA_RESET",
        user_id=current_user.id,
        details={"message": "Factory demo seed completed."},
    )
    return {
        "status": "success",
        "message": "Demo data reset successfully to initial factory seed with 4 synthetic patients.",
        "patients": ["pat-001 (Eleanor Vance)", "pat-002 (Marcus Chen)", "pat-003 (Sofia Patel)", "pat-004 (Arthur Pendelton)"],
    }

@router.get("/status")
def get_demo_system_status():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "emergency_timeout_seconds": settings.EMERGENCY_TIMEOUT_SECONDS,
        "gemma_configured": bool(settings.GEMMA_API_BASE_URL),
        "gemma_model": settings.GEMMA_MODEL_NAME,
        "disclaimer": settings.DISCLAIMER_TEXT,
        "server_time_utc": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    results = []
    for l in logs:
        u_email = l.user.email if l.user else None
        results.append(
            AuditLogResponse(
                id=l.id,
                user_id=l.user_id,
                user_email=u_email,
                action=l.action,
                target_patient_id=l.target_patient_id,
                details_json=l.details_json,
                ip_address=l.ip_address,
                created_at=l.created_at,
            )
        )
    return results

@router.get("/export/{patient_id}")
def export_patient_demo_data(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports full synthetic timeline for research audit and offline analysis.
    """
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    measurements = (
        db.query(Measurement)
        .filter(Measurement.patient_id == patient_id)
        .order_by(Measurement.measured_at.asc())
        .all()
    )
    symptoms = db.query(Symptom).filter(Symptom.patient_id == patient_id).all()
    alerts = db.query(Alert).filter(Alert.patient_id == patient_id).all()
    baselines = db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()

    log_audit_event(
        db,
        action="EXPORT_PATIENT_DEMO_DATA",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details={"record_count": len(measurements)},
    )

    return {
        "export_metadata": {
            "patient_id": patient.id,
            "display_name": patient.display_name,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "synthetic_disclaimer": settings.DISCLAIMER_TEXT,
        },
        "baselines": [
            {
                "metric": b.metric,
                "median": b.median_value,
                "mad": b.mad_value,
                "p10": b.p10_value,
                "p90": b.p90_value,
                "window_days": b.window_days,
            }
            for b in baselines
        ],
        "measurements": [
            {
                "metric": m.metric,
                "numeric_value": m.numeric_value,
                "unit": m.unit,
                "measured_at": m.measured_at.isoformat(),
                "source": m.source,
                "quality": m.quality,
            }
            for m in measurements
        ],
        "symptoms": [
            {
                "type": s.symptom_type,
                "severity": s.severity,
                "onset_at": s.onset_at.isoformat(),
                "notes": s.notes,
            }
            for s in symptoms
        ],
        "alerts": [
            {
                "category": a.category,
                "severity": a.severity,
                "status": a.status,
                "rule_id": a.rule_id,
                "explanation": a.explanation,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
    }
