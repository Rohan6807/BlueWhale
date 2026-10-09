import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

def generate_patient_telemetry(
    patient_id: str,
    days: int = 14,
    scenario: str = "normal",  # 'normal', 'sustained_elevated_hr', 'faint_event', 'stale_hypertensive'
    seed: int = 42
) -> List[Dict[str, Any]]:
    """
    Deterministically generates realistic wearable biometric time series.
    Outputs hourly resting measurements and daily aggregations.
    All data is synthetic and explicitly labelled.
    """
    rng = random.Random(seed)
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start_time = now - timedelta(days=days)

    records: List[Dict[str, Any]] = []

    # Baseline centers
    base_hr = 68.0
    base_hrv = 45.0
    base_sbp = 118.0
    base_dbp = 76.0

    if scenario == "sustained_elevated_hr":
        base_hr = 72.0
        base_hrv = 40.0
    elif scenario == "stale_hypertensive":
        base_sbp = 135.0
        base_dbp = 86.0

    total_hours = days * 24
    for h in range(total_hours):
        t = start_time + timedelta(hours=h)
        is_recent_3d = (now - t).total_seconds() <= (3 * 86400)

        # Diurnal curve (lower HR at night: 00:00 to 06:00)
        hour_of_day = t.hour
        night_dip = -8.0 if (hour_of_day >= 0 and hour_of_day <= 6) else 2.0

        # Scenario shifts
        hr_shift = 0.0
        hrv_shift = 0.0
        sbp_shift = 0.0

        if scenario == "sustained_elevated_hr" and is_recent_3d:
            hr_shift = 14.0  # +14 bpm sustained
            hrv_shift = -18.0  # severely depressed HRV

        if scenario == "stale_hypertensive":
            if is_recent_3d:
                sbp_shift = 12.0
            # If in the last 20 hours, simulate missing/stale sensor gap!
            if (now - t).total_seconds() <= (20 * 3600):
                continue  # skip records to create sensor gap

        # Noise
        hr = round(base_hr + night_dip + hr_shift + rng.uniform(-3.5, 3.5), 1)
        hrv = max(10.0, round(base_hrv - (night_dip * 0.5) + hrv_shift + rng.uniform(-4.0, 4.0), 1))

        # Hourly Heart Rate reading
        quality = "high"
        if rng.random() < 0.04:
            quality = "degraded_motion"

        records.append({
            "patient_id": patient_id,
            "metric": "heart_rate",
            "numeric_value": hr,
            "unit": "bpm",
            "measured_at": t,
            "source": "optical_ppg_sensor",
            "quality": quality,
        })

        # HRV RMSSD reading
        records.append({
            "patient_id": patient_id,
            "metric": "hrv_rmssd",
            "numeric_value": hrv,
            "unit": "ms",
            "measured_at": t,
            "source": "optical_ppg_sensor",
            "quality": quality,
        })

        # Blood pressure readings (recorded 2x daily: 08:00 and 20:00)
        if hour_of_day in (8, 20):
            sbp = round(base_sbp + sbp_shift + rng.uniform(-4.0, 5.0), 1)
            dbp = round(base_dbp + (sbp_shift * 0.4) + rng.uniform(-3.0, 3.0), 1)
            records.append({
                "patient_id": patient_id,
                "metric": "systolic_bp",
                "numeric_value": sbp,
                "unit": "mmHg",
                "measured_at": t,
                "source": "cuff_monitor",
                "quality": "high",
            })
            records.append({
                "patient_id": patient_id,
                "metric": "diastolic_bp",
                "numeric_value": dbp,
                "unit": "mmHg",
                "measured_at": t,
                "source": "cuff_monitor",
                "quality": "high",
            })

        # Daily summaries (Sleep and Steps, emitted once a day at 07:00)
        if hour_of_day == 7:
            sleep_hours = round(rng.uniform(6.2, 8.4), 1)
            sleep_score = int(rng.uniform(72, 92))
            steps = int(rng.uniform(6500, 11500))
            if scenario == "sustained_elevated_hr" and is_recent_3d:
                sleep_score -= 18
                steps = int(steps * 0.45)  # fatigue-related activity drop

            records.append({
                "patient_id": patient_id,
                "metric": "sleep_duration_hours",
                "numeric_value": sleep_hours,
                "unit": "hours",
                "measured_at": t,
                "source": "sleep_tracker",
                "quality": "high",
            })
            records.append({
                "patient_id": patient_id,
                "metric": "sleep_score",
                "numeric_value": float(sleep_score),
                "unit": "score",
                "measured_at": t,
                "source": "sleep_tracker",
                "quality": "high",
            })
            records.append({
                "patient_id": patient_id,
                "metric": "daily_steps",
                "numeric_value": float(steps),
                "unit": "steps",
                "measured_at": t,
                "source": "accelerometer",
                "quality": "high",
            })

    return records
