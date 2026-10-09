from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session
from app.models.measurement import Measurement
from app.models.baseline import PersonalBaseline
from app.models.alert import Alert
from app.models.patient import Patient

def compute_robust_statistics(values: List[float]) -> Dict[str, float]:
    """
    Computes median, Median Absolute Deviation (MAD), 10th percentile, and 90th percentile.
    """
    if not values:
        return {"median": 0.0, "mad": 0.0, "p10": 0.0, "p90": 0.0, "count": 0}

    arr = np.array(values, dtype=float)
    med = float(np.median(arr))
    mad = float(np.median(np.abs(arr - med)))
    p10 = float(np.percentile(arr, 10))
    p90 = float(np.percentile(arr, 90))

    return {
        "median": round(med, 2),
        "mad": round(mad, 2),
        "p10": round(p10, 2),
        "p90": round(p90, 2),
        "count": len(arr),
    }

def calculate_robust_z_score(val: float, median: float, mad: float) -> float:
    """
    Computes robust z-score: (val - median) / (1.4826 * (mad + 1e-4))
    1.4826 is the normal distribution consistency constant.
    """
    scale = 1.4826 * (mad + 1e-4)
    return round((val - median) / scale, 2)

class MonitoringEngine:
    def __init__(self, db: Session):
        self.db = db

    def recalculate_patient_baselines(self, patient_id: str, window_days: int = 14) -> List[PersonalBaseline]:
        """
        Calculates robust median and MAD baselines for a patient using the past N days of measurements.
        """
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=window_days)

        measurements = (
            self.db.query(Measurement)
            .filter(
                Measurement.patient_id == patient_id,
                Measurement.measured_at >= since,
                Measurement.quality.in_(["high", "medium"]),
            )
            .all()
        )

        metric_values: Dict[str, List[float]] = {}
        for m in measurements:
            metric_values.setdefault(m.metric, []).append(m.numeric_value)

        saved_baselines: List[PersonalBaseline] = []

        for metric, vals in metric_values.items():
            if len(vals) < 3:
                continue

            stats = compute_robust_statistics(vals)

            existing = (
                self.db.query(PersonalBaseline)
                .filter(PersonalBaseline.patient_id == patient_id, PersonalBaseline.metric == metric)
                .first()
            )

            if existing:
                existing.median_value = stats["median"]
                existing.mad_value = stats["mad"]
                existing.p10_value = stats["p10"]
                existing.p90_value = stats["p90"]
                existing.window_days = window_days
                existing.sample_count = stats["count"]
                existing.computed_at = now
                baseline_obj = existing
            else:
                baseline_obj = PersonalBaseline(
                    patient_id=patient_id,
                    metric=metric,
                    median_value=stats["median"],
                    mad_value=stats["mad"],
                    p10_value=stats["p10"],
                    p90_value=stats["p90"],
                    window_days=window_days,
                    sample_count=stats["count"],
                    computed_at=now,
                )
                self.db.add(baseline_obj)

            saved_baselines.append(baseline_obj)

        self.db.commit()
        return saved_baselines

    def detect_missing_and_stale_data(self, patient_id: str) -> Dict[str, Any]:
        """
        Checks for gaps, last measurement timestamps, and sensor data completeness.
        """
        now = datetime.now(timezone.utc)
        recent_cutoff = now - timedelta(hours=24)

        recent_measurements = (
            self.db.query(Measurement)
            .filter(Measurement.patient_id == patient_id, Measurement.measured_at >= recent_cutoff)
            .all()
        )

        latest_m = (
            self.db.query(Measurement)
            .filter(Measurement.patient_id == patient_id)
            .order_by(Measurement.measured_at.desc())
            .first()
        )

        last_synced_at = latest_m.measured_at if latest_m else None
        hours_since_sync = None
        if last_synced_at:
            # ensure offset-aware comparison
            ts = last_synced_at if last_synced_at.tzinfo else last_synced_at.replace(tzinfo=timezone.utc)
            hours_since_sync = round((now - ts).total_seconds() / 3600.0, 1)

        total_recent = len(recent_measurements)
        high_qual_count = sum(1 for m in recent_measurements if m.quality == "high")
        sensor_quality_score = round((high_qual_count / total_recent) * 100.0, 1) if total_recent > 0 else 0.0

        # Expected ~24 hourly points minimum for 24h period
        data_completeness_score = min(100.0, round((total_recent / 24.0) * 100.0, 1))

        is_stale = hours_since_sync is not None and hours_since_sync > 18.0

        missing_intervals = []
        if is_stale:
            missing_intervals.append(f"No wearable telemetry received for {hours_since_sync} hours.")

        return {
            "last_synced_at": last_synced_at,
            "hours_since_sync": hours_since_sync,
            "is_stale": is_stale,
            "sensor_quality_score": sensor_quality_score,
            "data_completeness_score": data_completeness_score,
            "missing_intervals": missing_intervals,
            "total_recent_readings_24h": total_recent,
        }

    def evaluate_trend_alerts(self, patient_id: str) -> List[Alert]:
        """
        Evaluates explicit trend-change rules against personal baselines.
        Prevents duplicate alerts within 48h window.
        """
        now = datetime.now(timezone.utc)
        recent_3d = now - timedelta(days=3)
        recent_alerts_48h = (
            self.db.query(Alert)
            .filter(
                Alert.patient_id == patient_id,
                Alert.created_at >= now - timedelta(hours=48),
                Alert.status.in_(["new", "acknowledged"]),
            )
            .all()
        )
        active_categories = {a.category for a in recent_alerts_48h}

        baselines = {b.metric: b for b in self.db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()}
        if not baselines:
            # Attempt to calibrate baselines
            self.recalculate_patient_baselines(patient_id)
            baselines = {b.metric: b for b in self.db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()}

        recent_measurements = (
            self.db.query(Measurement)
            .filter(Measurement.patient_id == patient_id, Measurement.measured_at >= recent_3d)
            .order_by(Measurement.measured_at.asc())
            .all()
        )

        metric_map: Dict[str, List[Measurement]] = {}
        for m in recent_measurements:
            metric_map.setdefault(m.metric, []).append(m)

        new_alerts: List[Alert] = []

        # RULE 1: Sustained Elevated Resting Heart Rate
        if "sustained_elevated_hr" not in active_categories and "heart_rate" in baselines and "heart_rate" in metric_map:
            hr_base = baselines["heart_rate"]
            hr_vals = [m.numeric_value for m in metric_map["heart_rate"]]
            if len(hr_vals) >= 5:
                recent_median = float(np.median(hr_vals))
                diff = recent_median - hr_base.median_value
                threshold = max(8.0, 2.0 * hr_base.mad_value)

                if diff >= threshold:
                    robust_z = calculate_robust_z_score(recent_median, hr_base.median_value, hr_base.mad_value)
                    alert = Alert(
                        patient_id=patient_id,
                        category="sustained_elevated_hr",
                        severity="attention",
                        status="new",
                        rule_id="RULE-HR-TREND-01",
                        explanation=(
                            f"Resting heart rate has been sustained at a 3-day median of {recent_median:.1f} bpm, "
                            f"which is +{diff:.1f} bpm above personal baseline median ({hr_base.median_value:.1f} bpm). "
                            "This represents an observable physiological trend change; recommend discussing with your care team."
                        ),
                        evidence_json={
                            "metric": "heart_rate",
                            "recent_median": round(recent_median, 1),
                            "baseline_median": round(hr_base.median_value, 1),
                            "baseline_mad": round(hr_base.mad_value, 1),
                            "difference_bpm": round(diff, 1),
                            "robust_z_score": robust_z,
                            "evaluation_window_days": 3,
                            "observation_count": len(hr_vals),
                            "rule_threshold_used": threshold,
                            "note": "Illustrative trend detection rule based on personal median absolute deviation.",
                        },
                        created_at=now,
                    )
                    self.db.add(alert)
                    new_alerts.append(alert)

        # RULE 2: Sustained HRV Suppression
        if "hrv_suppression" not in active_categories and "hrv_rmssd" in baselines and "hrv_rmssd" in metric_map:
            hrv_base = baselines["hrv_rmssd"]
            hrv_vals = [m.numeric_value for m in metric_map["hrv_rmssd"]]
            if len(hrv_vals) >= 3:
                recent_hrv_median = float(np.median(hrv_vals))
                drop = hrv_base.median_value - recent_hrv_median
                threshold = max(6.0, 1.8 * hrv_base.mad_value)

                if drop >= threshold:
                    alert = Alert(
                        patient_id=patient_id,
                        category="hrv_suppression",
                        severity="advisory",
                        status="new",
                        rule_id="RULE-HRV-SUPPRESSION-02",
                        explanation=(
                            f"Heart Rate Variability (RMSSD) has trended down to a 3-day median of {recent_hrv_median:.1f} ms "
                            f"(a drop of {drop:.1f} ms compared to calibrated personal median of {hr_base_med if 'hr_base_med' in locals() else hrv_base.median_value:.1f} ms). "
                            "Decreased HRV may reflect systemic stress, fatigue, or illness."
                        ),
                        evidence_json={
                            "metric": "hrv_rmssd",
                            "recent_median": round(recent_hrv_median, 1),
                            "baseline_median": round(hrv_base.median_value, 1),
                            "baseline_mad": round(hrv_base.mad_value, 1),
                            "drop_ms": round(drop, 1),
                            "robust_z_score": calculate_robust_z_score(recent_hrv_median, hrv_base.median_value, hrv_base.mad_value),
                            "evaluation_window_days": 3,
                        },
                        created_at=now,
                    )
                    self.db.add(alert)
                    new_alerts.append(alert)

        # RULE 3: Blood Pressure Shift
        if "blood_pressure_shift" not in active_categories and "systolic_bp" in baselines and "systolic_bp" in metric_map:
            sbp_base = baselines["systolic_bp"]
            sbp_vals = [m.numeric_value for m in metric_map["systolic_bp"]]
            if len(sbp_vals) >= 2:
                recent_sbp_median = float(np.median(sbp_vals))
                sbp_diff = recent_sbp_median - sbp_base.median_value
                if sbp_diff >= 12.0 or recent_sbp_median >= 140.0:
                    alert = Alert(
                        patient_id=patient_id,
                        category="blood_pressure_shift",
                        severity="advisory",
                        status="new",
                        rule_id="RULE-BP-ELEVATION-03",
                        explanation=(
                            f"Recent systolic blood pressure readings average {recent_sbp_median:.1f} mmHg, "
                            f"reflecting a shift of +{sbp_diff:.1f} mmHg over your established baseline ({sbp_base.median_value:.1f} mmHg)."
                        ),
                        evidence_json={
                            "metric": "systolic_bp",
                            "recent_median": round(recent_sbp_median, 1),
                            "baseline_median": round(sbp_base.median_value, 1),
                            "difference_mmHg": round(sbp_diff, 1),
                            "evaluation_window_days": 3,
                        },
                        created_at=now,
                    )
                    self.db.add(alert)
                    new_alerts.append(alert)

        # RULE 4: Sensor Inactivity / Stale telemetry
        stale_info = self.detect_missing_and_stale_data(patient_id)
        if stale_info["is_stale"] and "missing_sensor_data" not in active_categories:
            alert = Alert(
                patient_id=patient_id,
                category="missing_sensor_data",
                severity="info",
                rule_id="RULE-SENSOR-GAP-04",
                status="new",
                explanation=(
                    f"Wearable device has not synchronized data for {stale_info['hours_since_sync']} hours. "
                    "Trend calculations may be incomplete until sensor sync resumes."
                ),
                evidence_json={
                    "hours_since_last_sync": stale_info["hours_since_sync"],
                    "data_completeness_pct": stale_info["data_completeness_score"],
                    "note": "Informational notification regarding telemetry continuity.",
                },
                created_at=now,
            )
            self.db.add(alert)
            new_alerts.append(alert)

        if new_alerts:
            self.db.commit()

        return new_alerts
