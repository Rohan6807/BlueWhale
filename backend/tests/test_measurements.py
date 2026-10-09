from datetime import datetime, timezone

def test_get_measurements(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = client.get("/api/v1/measurements?patient_id=pat-001&limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "metric" in data[0]
    assert "numeric_value" in data[0]
    assert "unit" in data[0]
    assert "measured_at" in data[0]

def test_measurement_validation_invalid_metric(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "metric": "invalid_unknown_metric",
        "numeric_value": 72.0,
        "unit": "bpm",
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "source": "wearable",
        "quality": "high",
    }
    response = client.post("/api/v1/measurements?patient_id=pat-001", json=payload, headers=headers)
    assert response.status_code == 422  # validation error

def test_measurement_validation_negative_value(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "metric": "heart_rate",
        "numeric_value": -15.0,
        "unit": "bpm",
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "source": "wearable",
        "quality": "high",
    }
    response = client.post("/api/v1/measurements?patient_id=pat-001", json=payload, headers=headers)
    assert response.status_code == 422

def test_create_valid_measurement(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    payload = {
        "metric": "heart_rate",
        "numeric_value": 72.5,
        "unit": "bpm",
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "source": "optical_ppg",
        "quality": "high",
    }
    response = client.post("/api/v1/measurements?patient_id=pat-001", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["numeric_value"] == 72.5
    assert data["metric"] == "heart_rate"

def test_daily_aggregates(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = client.get("/api/v1/measurements/daily-aggregates?patient_id=pat-001&metric=heart_rate", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "mean" in data[0]
    assert "min" in data[0]
    assert "max" in data[0]
