from typing import List, Dict, Any, Optional
import numpy as np

class AnomalyDetector:
    """
    Experimental multivariate anomaly detector using scikit-learn Isolation Forest.
    Strictly labelled as an exploratory research metric, NOT a clinical risk score.
    """

    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination

    def detect_anomalies(self, data_points: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Runs Isolation Forest on multidimensional measurements.
        Returns anomaly scores and indices.
        """
        if len(data_points) < 8:
            return {
                "status": "insufficient_data",
                "message": "At least 8 synchronized multidimensional data points are required for isolation forest analysis.",
                "anomaly_score": 0.0,
                "anomalous_points_count": 0,
                "label": "EXPERIMENTAL STATISTICAL ANOMALY SCORE (RESEARCH ONLY - NOT A CLINICAL RISK METRIC)",
            }

        try:
            from sklearn.ensemble import IsolationForest

            # Extract features: heart_rate, hrv, steps (if available)
            feature_keys = sorted(data_points[0].keys())
            matrix = np.array([[dp.get(k, 0.0) for k in feature_keys] for dp in data_points])

            # Replace any NaNs
            matrix = np.nan_to_num(matrix, nan=0.0)

            model = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=50,
            )
            model.fit(matrix)

            # decision_function: lower score means more abnormal
            scores = model.decision_function(matrix)
            preds = model.predict(matrix)  # -1 is anomaly, 1 is normal

            # Normalize score to 0..1 where 1 is highest anomaly severity
            min_score, max_score = np.min(scores), np.max(scores)
            norm_score = 0.0
            if max_score > min_score:
                norm_score = float(round(1.0 - ((scores[-1] - min_score) / (max_score - min_score)), 3))

            anomalous_count = int(np.sum(preds == -1))

            return {
                "status": "computed",
                "latest_anomaly_score": norm_score,
                "anomalous_points_count": anomalous_count,
                "total_points_evaluated": len(data_points),
                "features_used": feature_keys,
                "label": "EXPERIMENTAL MULTIVARIATE ANOMALY SCORE",
                "disclaimer": "This score measures statistical divergence only. It is NOT a clinical risk score and cannot predict or diagnose any medical condition.",
            }
        except Exception as e:
            return {
                "status": "fallback",
                "error": str(e),
                "latest_anomaly_score": 0.0,
                "label": "EXPERIMENTAL MULTIVARIATE ANOMALY SCORE (UNAVAILABLE)",
                "disclaimer": "Experimental anomaly engine encountered an error or dependencies are still compiling.",
            }

anomaly_detector = AnomalyDetector()
