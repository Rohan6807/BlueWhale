import io
import csv
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.measurement import Measurement
from app.schemas.measurement import MeasurementCreate, MeasurementBulkCreate, MeasurementResponse
from app.api.deps import get_current_user, verify_patient_access
from app.services.monitoring_engine import MonitoringEngine

router = APIRouter(prefix="/measurements", tags=["Measurements"])

@router.get("", response_model=List[MeasurementResponse])
def get_measurements(
    patient_id: str = Query(..., description="Target patient ID"),
    metric: Optional[str] = Query(None, description="Specific metric filter"),
    start_date: Optional[datetime] = Query(None, description="Start timestamp (UTC)"),
    end_date: Optional[datetime] = Query(None, description="End timestamp (UTC)"),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    query = db.query(Measurement).filter(Measurement.patient_id == patient_id)
    if metric:
        query = query.filter(Measurement.metric == metric)
    if start_date:
        query = query.filter(Measurement.measured_at >= start_date)
    if end_date:
        query = query.filter(Measurement.measured_at <= end_date)

    return query.order_by(Measurement.measured_at.desc()).limit(limit).all()

@router.post("", response_model=MeasurementResponse, status_code=201)
def create_measurement(
    patient_id: str = Query(...),
    payload: MeasurementCreate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    m = Measurement(
        patient_id=patient_id,
        metric=payload.metric,
        numeric_value=payload.numeric_value,
        unit=payload.unit,
        measured_at=payload.measured_at,
        source=payload.source,
        quality=payload.quality,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

@router.post("/bulk", response_model=List[MeasurementResponse], status_code=201)
def create_bulk_measurements(
    patient_id: str = Query(...),
    payload: MeasurementBulkCreate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    created = []
    for item in payload.measurements:
        m = Measurement(
            patient_id=patient_id,
            metric=item.metric,
            numeric_value=item.numeric_value,
            unit=item.unit,
            measured_at=item.measured_at,
            source=item.source,
            quality=item.quality,
        )
        db.add(m)
        created.append(m)

    db.commit()
    return created

@router.post("/import-csv")
async def import_synthetic_csv(
    patient_id: str = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Imports wearable readings from synthetic CSV file and updates patient baselines.
    """
    verify_patient_access(patient_id, current_user, db)

    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    imported_count = 0
    for row in reader:
        try:
            m = Measurement(
                patient_id=patient_id,
                metric=row["metric"].strip(),
                numeric_value=float(row["numeric_value"]),
                unit=row["unit"].strip(),
                measured_at=datetime.fromisoformat(row["measured_at"].strip()),
                source=row.get("source", "csv_import").strip(),
                quality=row.get("quality", "high").strip(),
            )
            db.add(m)
            imported_count += 1
        except Exception:
            continue

    db.commit()

    # Recalculate baselines
    engine_svc = MonitoringEngine(db)
    engine_svc.recalculate_patient_baselines(patient_id)
    engine_svc.evaluate_trend_alerts(patient_id)

    return {
        "status": "success",
        "imported_rows": imported_count,
        "patient_id": patient_id,
        "message": f"Successfully imported {imported_count} measurements and refreshed personal baselines.",
    }

@router.get("/daily-aggregates")
def get_daily_aggregates(
    patient_id: str = Query(...),
    metric: str = Query("heart_rate"),
    days: int = Query(14, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns daily statistics (mean, min, max, count) for trend charting.
    """
    verify_patient_access(patient_id, current_user, db)

    measurements = (
        db.query(Measurement)
        .filter(Measurement.patient_id == patient_id, Measurement.metric == metric)
        .order_by(Measurement.measured_at.asc())
        .all()
    )

    daily_buckets = {}
    for m in measurements:
        day_str = m.measured_at.strftime("%Y-%m-%d")
        daily_buckets.setdefault(day_str, []).append(m.numeric_value)

    result = []
    for day_str in sorted(daily_buckets.keys()):
        vals = daily_buckets[day_str]
        result.append({
            "date": day_str,
            "metric": metric,
            "mean": round(float(sum(vals) / len(vals)), 1),
            "min": round(float(min(vals)), 1),
            "max": round(float(max(vals)), 1),
            "count": len(vals),
        })

    return result
