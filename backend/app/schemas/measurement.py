from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

VALID_METRICS = {
    "heart_rate": "bpm",
    "hrv_rmssd": "ms",
    "systolic_bp": "mmHg",
    "diastolic_bp": "mmHg",
    "spo2": "%",
    "sleep_duration_hours": "hours",
    "sleep_score": "score",
    "daily_steps": "steps",
}

VALID_QUALITIES = {"high", "medium", "low", "degraded_motion"}

class MeasurementCreate(BaseModel):
    metric: str
    numeric_value: float = Field(..., description="Numerical metric value")
    unit: str
    measured_at: datetime
    source: str = "wearable_sensor"
    quality: str = "high"

    @field_validator("metric")
    def validate_metric(cls, v: str) -> str:
        if v not in VALID_METRICS:
            raise ValueError(f"Unknown metric '{v}'. Allowed: {list(VALID_METRICS.keys())}")
        return v

    @field_validator("quality")
    def validate_quality(cls, v: str) -> str:
        if v not in VALID_QUALITIES:
            raise ValueError(f"Invalid quality '{v}'. Allowed: {list(VALID_QUALITIES)}")
        return v

    @field_validator("numeric_value")
    def validate_value(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Measurement value cannot be negative")
        return v

class MeasurementBulkCreate(BaseModel):
    measurements: List[MeasurementCreate]

class MeasurementResponse(BaseModel):
    id: str
    patient_id: str
    metric: str
    numeric_value: float
    unit: str
    measured_at: datetime
    source: str
    quality: str
    created_at: datetime

    class Config:
        from_attributes = True

class MetricLatest(BaseModel):
    metric: str
    numeric_value: float
    unit: str
    measured_at: datetime
    source: str
    quality: str
    change_vs_baseline_percent: Optional[float] = None
    baseline_median: Optional[float] = None
    status: str = "normal"  # 'normal', 'elevated', 'suppressed', 'caution'

class PatientDashboardSummary(BaseModel):
    patient_id: str
    display_name: str
    baseline_status: str
    emergency_mode: bool
    latest_metrics: List[MetricLatest]
    sensor_quality_score: float  # percentage of high-quality readings
    data_completeness_score: float  # expected vs received ratio
    active_alerts_count: int
    last_synced_at: Optional[datetime] = None
    disclaimer: str
