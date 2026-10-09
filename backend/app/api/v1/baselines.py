from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.patient import Patient
from app.models.measurement import Measurement
from app.models.baseline import PersonalBaseline
from app.schemas.baseline import (
    PersonalBaselineResponse,
    BaselineComparisonItem,
    BaselineComparisonResponse,
)
from app.api.deps import get_current_user, verify_patient_access
from app.services.monitoring_engine import (
    MonitoringEngine,
    calculate_robust_z_score,
)
from app.services.anomaly_detector import anomaly_detector

router = APIRouter(prefix="/baselines", tags=["Baselines"])

@router.get("/{patient_id}", response_model=List[PersonalBaselineResponse])
def get_patient_baselines(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    baselines = db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()
    if not baselines:
        # Calibrate dynamically if empty
        engine_svc = MonitoringEngine(db)
        baselines = engine_svc.recalculate_patient_baselines(patient_id)
    return baselines

@router.post("/{patient_id}/recalculate", response_model=List[PersonalBaselineResponse])
def recalculate_baselines(
    patient_id: str,
    window_days: int = Query(14, ge=3, le=60),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    engine_svc = MonitoringEngine(db)
    baselines = engine_svc.recalculate_patient_baselines(patient_id, window_days=window_days)
    return baselines

@router.get("/{patient_id}/comparison", response_model=BaselineComparisonResponse)
def get_baseline_comparison(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    baselines = {b.metric: b for b in db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()}
    if not baselines:
        engine_svc = MonitoringEngine(db)
        baselines = {b.metric: b for b in engine_svc.recalculate_patient_baselines(patient_id)}

    comparisons: List[BaselineComparisonItem] = []
    monitored_metrics = ["heart_rate", "hrv_rmssd", "systolic_bp", "diastolic_bp", "daily_steps"]

    for metric in monitored_metrics:
        latest = (
            db.query(Measurement)
            .filter(Measurement.patient_id == patient_id, Measurement.metric == metric)
            .order_by(Measurement.measured_at.desc())
            .first()
        )
        base = baselines.get(metric)
        if latest and base:
            z = calculate_robust_z_score(latest.numeric_value, base.median_value, base.mad_value)
            if abs(z) >= 2.5:
                status = "significant_deviation"
                interp = f"Observed reading is {abs(z):.1f} MAD away from your established personal median. Persistent shifts merit discussion with your physician."
            elif abs(z) >= 1.5:
                status = "mild_deviation"
                interp = f"Observed reading deviates mildly ({abs(z):.1f} MAD) from personal median baseline."
            else:
                status = "within_normal_baseline"
                interp = "Observed reading is well within your personal historical bounds."

            comparisons.append(
                BaselineComparisonItem(
                    metric=metric,
                    unit=latest.unit,
                    current_value=latest.numeric_value,
                    baseline_median=base.median_value,
                    baseline_mad=base.mad_value,
                    deviation_score=z,
                    status=status,
                    interpretation=interp,
                )
            )
        elif latest and not base:
            comparisons.append(
                BaselineComparisonItem(
                    metric=metric,
                    unit=latest.unit,
                    current_value=latest.numeric_value,
                    baseline_median=0.0,
                    baseline_mad=0.0,
                    deviation_score=0.0,
                    status="insufficient_baseline",
                    interpretation="Accumulating baseline history; requires at least 3 historical measurements.",
                )
            )

    return BaselineComparisonResponse(
        patient_id=patient_id,
        comparisons=comparisons,
        computed_at=datetime.now(timezone.utc),
        disclaimer=settings.DISCLAIMER_TEXT,
    )

@router.get("/{patient_id}/experimental-anomaly-score")
def get_experimental_anomaly_score(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Experimental multivariate isolation forest anomaly detector.
    Explicitly labeled as research metric only, NOT a clinical risk score.
    """
    verify_patient_access(patient_id, current_user, db)

    # Collect multidimensional feature samples
    measurements = (
        db.query(Measurement)
        .filter(
            Measurement.patient_id == patient_id,
            Measurement.metric.in_(["heart_rate", "hrv_rmssd", "daily_steps"]),
        )
        .order_by(Measurement.measured_at.asc())
        .all()
    )

    # Bucket by timestamp rounded to hour
    buckets = {}
    for m in measurements:
        ts = m.measured_at.strftime("%Y-%m-%d %H:00")
        buckets.setdefault(ts, {})[m.metric] = m.numeric_value

    data_points = [v for v in buckets.values() if "heart_rate" in v and "hrv_rmssd" in v]
    return anomaly_detector.detect_anomalies(data_points)
