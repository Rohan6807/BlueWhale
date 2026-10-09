def test_end_to_end_patient_journey(client, patient_token, doctor_token, caregiver_token):
    """
    Simulates complete hackathon demo lifecycle:
    1. Patient logs in & queries dashboard summary
    2. Checks trend comparison and personal baseline
    3. Logs a syncopal near-fainting symptom
    4. Triggers simulated fall/faint event on smartwatch
    5. Wearer countdown times out -> notifies caregiver
    6. Caregiver reviews alert and acknowledges
    7. Clinician inspects patient record & submits clinical review
    """
    p_headers = {"Authorization": f"Bearer {patient_token}"}
    d_headers = {"Authorization": f"Bearer {doctor_token}"}
    c_headers = {"Authorization": f"Bearer {caregiver_token}"}

    # Step 1: Patient queries summary
    summary_resp = client.get("/api/v1/patients/pat-001/summary", headers=p_headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["display_name"] == "Eleanor Vance"
    assert len(summary["latest_metrics"]) > 0

    # Step 2: Query personal baselines
    base_resp = client.get("/api/v1/baselines/pat-001/comparison", headers=p_headers)
    assert base_resp.status_code == 200
    assert len(base_resp.json()["comparisons"]) > 0

    # Step 3: Log a symptom report
    symp_payload = {
        "symptom_type": "fainting_near_fainting",
        "severity": "moderate",
        "onset_at": "2026-10-09T08:00:00Z",
        "notes": "Near-syncope when standing quickly",
    }
    symp_resp = client.post("/api/v1/symptoms?patient_id=pat-001", json=symp_payload, headers=p_headers)
    assert symp_resp.status_code == 201
    assert symp_resp.json()["urgent_guidance_displayed"] is True

    # Step 4: Trigger simulated fall/faint event
    trig_resp = client.post("/api/v1/emergency/trigger?patient_id=pat-001", json={"event_type": "simulated_fall_faint", "simulated_timeout_seconds": 25}, headers=p_headers)
    assert trig_resp.status_code == 201
    event_id = trig_resp.json()["id"]

    # Step 5: Countdown timer expires -> timeout transition
    to_resp = client.post(f"/api/v1/emergency/events/{event_id}/timeout", headers=p_headers)
    assert to_resp.status_code == 200
    assert to_resp.json()["status"] == "timed_out"
    assert len(to_resp.json()["notifications"]) > 0

    # Step 6: Caregiver acknowledges emergency
    ack_resp = client.post(
        f"/api/v1/emergency/events/{event_id}/acknowledge",
        json={"acknowledged_by": "David Vance (Primary Caregiver)"},
        headers=c_headers,
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "acknowledged"

    # Step 7: Clinician conducts review
    clin_payload = {
        "review_notes": "Presyncope event resolved. Recommended orthostatic vital signs check and hydration counseling.",
        "recommended_action": "schedule_telehealth",
    }
    rev_resp = client.post("/api/v1/hospital/patients/pat-001/review", json=clin_payload, headers=d_headers)
    assert rev_resp.status_code == 201
    assert rev_resp.json()["recommended_action"] == "schedule_telehealth"

    # Step 8: Clinician generates clinical report
    rpt_resp = client.get("/api/v1/hospital/patients/pat-001/report", headers=d_headers)
    assert rpt_resp.status_code == 200
    assert "report_id" in rpt_resp.json()
