from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PersonalBaselineResponse(BaseModel):
    id: str
    patient_id: str
    metric: str
    median_value: float
    mad_value: float
    p10_value: float
    p90_value: float
    window_days: int
    sample_count: int
    computed_at: datetime

    class Config:
        from_attributes = True

class BaselineComparisonItem(BaseModel):
    metric: str
    unit: str
    current_value: float
    baseline_median: float
    baseline_mad: float
    deviation_score: float  # (current - median) / (1.4826 * mad) robust z-score
    status: str  # 'within_normal_baseline', 'mild_deviation', 'significant_deviation', 'insufficient_baseline'
    interpretation: str

class BaselineComparisonResponse(BaseModel):
    patient_id: str
    comparisons: List[BaselineComparisonItem]
    computed_at: datetime
    disclaimer: str
