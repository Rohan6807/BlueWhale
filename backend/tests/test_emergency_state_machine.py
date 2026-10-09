def test_active_emergency_event(client, doctor_token):
    # Clinician or Sofia Patel can inspect pat-003 active prompted event
    headers = {"Authorization": f"Bearer {doctor_token}"}
    response = client.get("/api/v1/emergency/active?patient_id=pat-003", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data is not None
    assert data["status"] in ["prompted", "escalated", "timed_out"]

def test_wearer_response_ok_cancels_escalation(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    # Trigger a fresh event on pat-001
    trigger_resp = client.post("/api/v1/emergency/trigger?patient_id=pat-001", json={"event_type": "simulated_fall_faint", "simulated_timeout_seconds": 25}, headers=headers)
    assert trigger_resp.status_code == 201
    event_id = trigger_resp.json()["id"]

    # Wearer responds "ok"
    resp = client.post(f"/api/v1/emergency/events/{event_id}/respond", json={"response": "ok"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "wearer_ok"
    assert data["wearer_response"] == "ok"
    assert data["cancellation_reason"] is not None
    # No caregiver notifications should have been sent for "ok" response
    assert len(data["notifications"]) == 0

def test_wearer_response_help_triggers_caregiver_notifications(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    trigger_resp = client.post("/api/v1/emergency/trigger?patient_id=pat-001", json={"event_type": "simulated_fall_faint", "simulated_timeout_seconds": 25}, headers=headers)
    assert trigger_resp.status_code == 201
    event_id = trigger_resp.json()["id"]

    # Wearer clicks "help"
    resp = client.post(f"/api/v1/emergency/events/{event_id}/respond", json={"response": "help"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "escalated"
    assert data["wearer_response"] == "help"
    # Caregiver notifications must be generated
    assert len(data["notifications"]) > 0
    channels = [n["channel"] for n in data["notifications"]]
    assert "sms" in channels

def test_timeout_transition_and_idempotency(client, patient_token, caregiver_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    trigger_resp = client.post("/api/v1/emergency/trigger?patient_id=pat-001", json={"event_type": "simulated_fall_faint", "simulated_timeout_seconds": 25}, headers=headers)
    assert trigger_resp.status_code == 201
    event_id = trigger_resp.json()["id"]

    # Trigger timeout
    to_resp = client.post(f"/api/v1/emergency/events/{event_id}/timeout", headers=headers)
    assert to_resp.status_code == 200
    data = to_resp.json()
    assert data["status"] == "timed_out"
    initial_notif_count = len(data["notifications"])
    assert initial_notif_count > 0

    # Repeating timeout request must be idempotent and not create duplicate notifications
    repeat_to = client.post(f"/api/v1/emergency/events/{event_id}/timeout", headers=headers)
    assert repeat_to.status_code == 200
    assert len(repeat_to.json()["notifications"]) == initial_notif_count

    # Caregiver acknowledges event
    c_headers = {"Authorization": f"Bearer {caregiver_token}"}
    ack_resp = client.post(
        f"/api/v1/emergency/events/{event_id}/acknowledge",
        json={"acknowledged_by": "David Vance (Caregiver)"},
        headers=c_headers,
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"
