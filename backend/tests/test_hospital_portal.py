def test_hospital_patient_roster(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    resp = client.get("/api/v1/hospital/patients", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 4
    names = {p["display_name"] for p in data}
    assert "Eleanor Vance" in names
    assert "Marcus Chen" in names

def test_hospital_record_retrieval(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    resp = client.get("/api/v1/hospital/patients/pat-002/record", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "mrn" in data
    assert "clinical_history_json" in data
    assert "prior_visits_json" in data

def test_submit_clinician_review(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    payload = {
        "review_notes": "Wearable trends indicate improving recovery. Continue baseline monitoring.",
        "recommended_action": "routine_followup",
    }
    resp = client.post("/api/v1/hospital/patients/pat-001/review", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["recommended_action"] == "routine_followup"
    assert data["clinician_name"] == "Dr. Rachel Adams, MD"

def test_generate_clinical_report(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    resp = client.get("/api/v1/hospital/patients/pat-002/report", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "report_id" in data
    assert "baseline_summary" in data
    assert "trend_analysis" in data
    assert "safety_disclaimer" in data

def test_fhir_bundle_export(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    resp = client.get("/api/v1/hospital/patients/pat-001/fhir", headers=headers)
    assert resp.status_code == 200
    bundle = resp.json()
    assert bundle["resourceType"] == "Bundle"
    assert len(bundle["entry"]) > 0
