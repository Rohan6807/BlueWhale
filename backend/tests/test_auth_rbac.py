def test_unauthenticated_request_rejected(client):
    """
    Ensure unauthenticated requests are strictly rejected with 401 Unauthorized
    rather than silently falling back to a default demo patient.
    """
    resp = client.get("/api/v1/patients/pat-001")
    assert resp.status_code == 401

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

def test_signup_success(client):
    new_user = {
        "email": "newpatient@cardiolens.demo",
        "password": "SecurePassword123!",
        "full_name": "Test New Patient",
    }
    resp = client.post("/api/v1/auth/signup", json=new_user)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newpatient@cardiolens.demo"
    assert data["role"] == "patient"
    assert data["patient_id"] is not None

    # Verify that the new user can log in immediately
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "newpatient@cardiolens.demo", "password": "SecurePassword123!"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["role"] == "patient"
    assert login_data["email"] == "newpatient@cardiolens.demo"

def test_signup_duplicate_email(client):
    # Try signing up with existing patient email
    payload = {
        "email": "patient@cardiolens.demo",
        "password": "Password123!",
        "full_name": "Duplicate User",
    }
    resp = client.post("/api/v1/auth/signup", json=payload)
    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"]

def test_forgot_and_reset_password(client):
    # Request reset instructions
    forgot_resp = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "patient@cardiolens.demo"},
    )
    assert forgot_resp.status_code == 200

    # Reset password
    reset_resp = client.post(
        "/api/v1/auth/reset-password",
        json={"email": "patient@cardiolens.demo", "new_password": "NewSecretPassword99!"},
    )
    assert reset_resp.status_code == 200

    # Verify login with old password fails
    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "patient@cardiolens.demo", "password": "Demo1234!"},
    )
    assert old_login.status_code == 401

    # Verify login with new password succeeds
    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "patient@cardiolens.demo", "password": "NewSecretPassword99!"},
    )
    assert new_login.status_code == 200

    # Restore original demo password so other tests aren't affected
    client.post(
        "/api/v1/auth/reset-password",
        json={"email": "patient@cardiolens.demo", "new_password": "Demo1234!"},
    )

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

