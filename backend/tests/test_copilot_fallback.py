def test_copilot_fallback_when_offline(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"query_type": "trends_summary"}
    resp = client.post("/api/v1/copilot/query?patient_id=pat-001", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_ai_generated"] is False
    assert "Deterministic Rule Template" in data["model_identifier"]
    assert len(data["response_markdown"]) > 50
    assert "safety_disclaimer" in data
    assert "evidence_package" in data
    assert data["evidence_package"]["patient_id"] == "pat-001"

def test_copilot_alert_explanation_query(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"query_type": "alert_explanation"}
    resp = client.post("/api/v1/copilot/query?patient_id=pat-001", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "response_markdown" in data

def test_copilot_doctor_prep_query(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {"query_type": "doctor_prep"}
    resp = client.post("/api/v1/copilot/query?patient_id=pat-001", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "Physician Consultation Preparation Guide" in data["response_markdown"]
