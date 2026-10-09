from datetime import datetime, timedelta, timezone
from app.services.monitoring_engine import MonitoringEngine
from app.models.measurement import Measurement
from app.models.alert import Alert

def test_stale_data_detection(db_session):
    engine = MonitoringEngine(db_session)
    # pat-004 has a missing telemetry gap in recent 20 hours
    stale_info = engine.detect_missing_and_stale_data("pat-004")
    assert stale_info["is_stale"] is True
    assert stale_info["hours_since_sync"] is not None
    assert stale_info["hours_since_sync"] >= 18.0

def test_duplicate_alert_prevention(db_session):
    engine = MonitoringEngine(db_session)
    # pat-002 already has evaluated alerts
    initial_alerts = db_session.query(Alert).filter(Alert.patient_id == "pat-002").count()

    # Re-evaluating immediately should NOT duplicate existing alerts within 48h
    new_alerts = engine.evaluate_trend_alerts("pat-002")
    assert len(new_alerts) == 0

    final_alerts = db_session.query(Alert).filter(Alert.patient_id == "pat-002").count()
    assert initial_alerts == final_alerts

def test_alert_evidence_json_structure(db_session):
    alert = db_session.query(Alert).filter(Alert.patient_id == "pat-002").first()
    assert alert is not None
    assert isinstance(alert.evidence_json, dict)
    assert alert.category in ["sustained_elevated_hr", "hrv_suppression"]
    assert alert.rule_id.startswith("RULE-")
    assert len(alert.explanation) > 10

def test_acknowledge_alert_endpoint(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    # Fetch alerts for pat-002
    resp = client.get("/api/v1/alerts?patient_id=pat-002", headers=headers)
    assert resp.status_code == 200
    alerts = resp.json()
    assert len(alerts) > 0

    target_alert_id = alerts[0]["id"]
    ack_resp = client.post(
        f"/api/v1/alerts/{target_alert_id}/acknowledge",
        json={"acknowledged_by": "Dr. Rachel Adams"},
        headers=headers,
    )
    assert ack_resp.status_code == 200
    ack_data = ack_resp.json()
    assert ack_data["status"] == "acknowledged"
    assert ack_data["acknowledged_by"] == "Dr. Rachel Adams"
    assert ack_data["acknowledged_at"] is not None
