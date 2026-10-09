from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.alert import Alert
from app.schemas.alert import AlertResponse, AlertAcknowledgeRequest, AlertEvaluationResult
from app.api.deps import get_current_user, verify_patient_access
from app.services.monitoring_engine import MonitoringEngine
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    patient_id: str = Query(..., description="Target patient ID"),
    status: Optional[str] = Query(None, description="Status filter: new, acknowledged, resolved"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    query = db.query(Alert).filter(Alert.patient_id == patient_id)
    if status:
        query = query.filter(Alert.status == status)

    return query.order_by(Alert.created_at.desc()).limit(limit).all()

@router.post("/evaluate", response_model=AlertEvaluationResult)
def evaluate_patient_alerts(
    patient_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    engine_svc = MonitoringEngine(db)
    new_alerts = engine_svc.evaluate_trend_alerts(patient_id)
    existing_count = db.query(Alert).filter(Alert.patient_id == patient_id, Alert.status == "new").count()

    log_audit_event(
        db,
        action="EVALUATE_ALERTS",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details={"new_alerts_triggered": len(new_alerts)},
    )

    return AlertEvaluationResult(
        evaluated_patient_id=patient_id,
        new_alerts_count=len(new_alerts),
        existing_alerts_count=existing_count,
        rule_evaluations={
            "rules_checked": [
                "SUSTAINED_ELEVATED_RESTING_HR",
                "HRV_SUPPRESSION_TREND",
                "BLOOD_PRESSURE_SHIFT",
                "MISSING_SENSOR_PERIOD",
            ],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: str,
    payload: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    verify_patient_access(alert.patient_id, current_user, db)

    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = payload.acknowledged_by or current_user.full_name

    db.commit()
    db.refresh(alert)

    log_audit_event(
        db,
        action="ACKNOWLEDGE_ALERT",
        user_id=current_user.id,
        target_patient_id=alert.patient_id,
        details={"alert_id": alert_id, "category": alert.category},
    )

    return alert
