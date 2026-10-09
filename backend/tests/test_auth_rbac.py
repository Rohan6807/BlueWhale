def test_login_success(client):
    payload = {"email": "patient@cardiolens.demo", "password": "Demo1234!"}
    resp = client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "patient"
    assert data["patient_id"] == "pat-001"

def test_login_invalid_password(client):
    payload = {"email": "patient@cardiolens.demo", "password": "WrongPassword123"}
    resp = client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 401

def test_demo_persona_switch(client):
    resp = client.post("/api/v1/auth/demo-switch", json={"persona": "clinician"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "clinician"
    assert data["email"] == "doctor@cardiolens.demo"

def test_patient_cannot_access_another_patients_records(client, patient_token):
    # patient_token belongs to pat-001 (Eleanor Vance)
    headers = {"Authorization": f"Bearer {patient_token}"}
    # Trying to access pat-002 (Marcus Chen)
    resp = client.get("/api/v1/patients/pat-002", headers=headers)
    assert resp.status_code == 403  # Forbidden!

def test_clinician_can_access_all_patients(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    resp = client.get("/api/v1/patients/pat-002", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == "pat-002"
