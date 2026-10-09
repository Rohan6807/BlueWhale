from app.services.monitoring_engine import compute_robust_statistics, calculate_robust_z_score

def test_compute_robust_statistics():
    vals = [65.0, 68.0, 70.0, 71.0, 72.0, 75.0, 95.0]  # with outlier 95
    stats = compute_robust_statistics(vals)
    assert stats["median"] == 71.0
    assert stats["mad"] > 0
    assert stats["count"] == 7

def test_calculate_robust_z_score():
    med = 70.0
    mad = 3.0
    # Val equal to median should have z = 0
    z_zero = calculate_robust_z_score(70.0, med, mad)
    assert z_zero == 0.0

    # Val above median
    z_above = calculate_robust_z_score(78.0, med, mad)
    assert z_above > 1.5

def test_get_patient_baselines_endpoint(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = client.get("/api/v1/baselines/pat-001", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    metrics = {b["metric"] for b in data}
    assert "heart_rate" in metrics

def test_baseline_comparison_endpoint(client, patient_token):
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = client.get("/api/v1/baselines/pat-001/comparison", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "comparisons" in data
    assert len(data["comparisons"]) > 0
    assert "disclaimer" in data
