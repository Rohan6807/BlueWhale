import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.services.security import hash_password
from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.patient import Patient, PatientConsent
from app.models.measurement import Measurement
from app.models.symptom import Symptom
from app.models.baseline import PersonalBaseline
from app.models.alert import Alert
from app.models.emergency import EmergencyEvent, EmergencyContact, NotificationAttempt
from app.models.hospital import HospitalRecord, ClinicianReview
from app.models.audit import AuditLog
from app.data.synthetic_generator import generate_patient_telemetry
from app.services.monitoring_engine import MonitoringEngine

def reset_and_seed_database(db: Session):
    """
    Clears all tables and populates a rich, reproducible demo database
    with 4 fictional patients, baseline calibrations, simulated alerts,
    and emergency simulation scenarios.
    """
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Purge existing data
    db.query(AuditLog).delete()
    db.query(ClinicianReview).delete()
    db.query(HospitalRecord).delete()
    db.query(NotificationAttempt).delete()
    db.query(EmergencyContact).delete()
    db.query(EmergencyEvent).delete()
    db.query(Alert).delete()
    db.query(PersonalBaseline).delete()
    db.query(Symptom).delete()
    db.query(Measurement).delete()
    db.query(PatientConsent).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()

    now = datetime.now(timezone.utc)
    demo_password_hash = hash_password("Demo1234!")

    # 1. Clinician User
    doctor_user = User(
        id="usr-doc-001",
        email="doctor@cardiolens.demo",
        hashed_password=demo_password_hash,
        full_name="Dr. Rachel Adams, MD",
        role="clinician",
    )
    db.add(doctor_user)

    # 2. Caregiver User
    caregiver_user = User(
        id="usr-care-001",
        email="caregiver@cardiolens.demo",
        hashed_password=demo_password_hash,
        full_name="David Vance",
        role="caregiver",
    )
    db.add(caregiver_user)

    # 3. Four Fictional Patients
    patients_data = [
        {
            "user_id": "usr-pat-001",
            "email": "patient@cardiolens.demo",
            "full_name": "Eleanor Vance",
            "patient_id": "pat-001",
            "dob": "1982-04-12",
            "sex": "female",
            "scenario": "normal",
            "condition": "Healthy Baseline Calibration (Demographic Control)",
            "physician": "Dr. Rachel Adams, MD",
            "mrn": "MRN-EV-4421",
        },
        {
            "user_id": "usr-pat-002",
            "email": "marcus@cardiolens.demo",
            "full_name": "Marcus Chen",
            "patient_id": "pat-002",
            "dob": "1966-11-20",
            "sex": "male",
            "scenario": "sustained_elevated_hr",
            "condition": "Post-Viral Fatigue & Autonomic Reactivity Monitoring",
            "physician": "Dr. Rachel Adams, MD",
            "mrn": "MRN-MC-8832",
        },
        {
            "user_id": "usr-pat-003",
            "email": "sofia@cardiolens.demo",
            "full_name": "Sofia Patel",
            "patient_id": "pat-003",
            "dob": "1995-07-03",
            "sex": "female",
            "scenario": "normal",
            "condition": "Episodic Orthostatic Presyncope / Near-Fainting",
            "physician": "Dr. Nathan Cole, MD",
            "mrn": "MRN-SP-1094",
        },
        {
            "user_id": "usr-pat-004",
            "email": "arthur@cardiolens.demo",
            "full_name": "Arthur Pendelton",
            "patient_id": "pat-004",
            "dob": "1956-02-18",
            "sex": "male",
            "scenario": "stale_hypertensive",
            "condition": "Essential Hypertension & Telemetry Non-Adherence",
            "physician": "Dr. Rachel Adams, MD",
            "mrn": "MRN-AP-6675",
        },
    ]

    for pd in patients_data:
        # Create User
        u = User(
            id=pd["user_id"],
            email=pd["email"],
            hashed_password=demo_password_hash,
            full_name=pd["full_name"],
            role="patient",
        )
        db.add(u)

        # Create Patient
        p = Patient(
            id=pd["patient_id"],
            user_id=pd["user_id"],
            display_name=pd["full_name"],
            date_of_birth=pd["dob"],
            biological_sex=pd["sex"],
            baseline_status="calibrated",
            emergency_mode=(pd["patient_id"] == "pat-003"),
        )
        db.add(p)

        # Create Consents
        consent = PatientConsent(
            id=f"cns-{pd['patient_id']}",
            patient_id=pd["patient_id"],
            allow_caregiver_sharing=True,
            allow_hospital_sharing=True,
            allow_ai_summarization=True,
        )
        db.add(consent)

        # Create Emergency Contacts (2 contacts for escalation)
        c1 = EmergencyContact(
            id=f"cnt-1-{pd['patient_id']}",
            patient_id=pd["patient_id"],
            name="David Vance" if pd["patient_id"] != "pat-003" else "Raj Patel",
            relationship_type="Spouse" if pd["patient_id"] != "pat-003" else "Brother",
            phone_number="+1 (555) 234-5678",
            email="caregiver@cardiolens.demo" if pd["patient_id"] != "pat-003" else "raj.patel@cardiolens.demo",
            priority_order=1,
        )
        c2 = EmergencyContact(
            id=f"cnt-2-{pd['patient_id']}",
            patient_id=pd["patient_id"],
            name="Sarah Vance-Miller" if pd["patient_id"] != "pat-003" else "Meera Patel",
            relationship_type="Adult Child" if pd["patient_id"] != "pat-003" else "Mother",
            phone_number="+1 (555) 876-5432",
            email="sarah.vance@cardiolens.demo",
            priority_order=2,
        )
        db.add_all([c1, c2])

        # Create Hospital Record
        h_rec = HospitalRecord(
            id=f"hr-{pd['patient_id']}",
            patient_id=pd["patient_id"],
            mrn=pd["mrn"],
            primary_physician=pd["physician"],
            hospital_unit="Cardiology Outpatient Clinic",
            condition_summary=pd["condition"],
            clinical_history_json={
                "diagnoses": [pd["condition"], "Seasonal allergies"],
                "medications": ["Multivitamin daily", "Lisinopril 10mg PO daily" if "Hypertension" in pd["condition"] else "None"],
                "allergies": ["Penicillin (mild rash)"],
            },
            prior_visits_json=[
                {
                    "date": (now - timedelta(days=45)).strftime("%Y-%m-%d"),
                    "provider": pd["physician"],
                    "reason": "Annual Outpatient Cardiovascular Screening",
                    "findings": "Resting ECG showed normal sinus rhythm. Advised wearable monitoring.",
                }
            ],
            lab_summaries_json=[
                {"test_name": "Serum Troponin I", "value": "<0.01", "unit": "ng/mL", "status": "normal"},
                {"test_name": "BNP (B-Type Natriuretic)", "value": "42", "unit": "pg/mL", "status": "normal"},
                {"test_name": "Serum Potassium", "value": "4.2", "unit": "mEq/L", "status": "normal"},
            ],
        )
        db.add(h_rec)

        # Generate 14 days of realistic synthetic measurements
        measurements_raw = generate_patient_telemetry(
            patient_id=pd["patient_id"],
            days=14,
            scenario=pd["scenario"],
            seed=hash(pd["patient_id"]) % 10000,
        )
        for m_data in measurements_raw:
            m_obj = Measurement(
                patient_id=m_data["patient_id"],
                metric=m_data["metric"],
                numeric_value=m_data["numeric_value"],
                unit=m_data["unit"],
                measured_at=m_data["measured_at"],
                source=m_data["source"],
                quality=m_data["quality"],
            )
            db.add(m_obj)

    db.commit()

    # Add specific symptom logs
    # Sofia Patel logged dizziness & near-fainting
    sym1 = Symptom(
        patient_id="pat-003",
        symptom_type="fainting_near_fainting",
        severity="moderate",
        onset_at=now - timedelta(hours=2),
        duration_minutes=4,
        notes="Felt sudden darkness and lightheadedness when rising rapidly from couch.",
        urgent_guidance_displayed=True,
    )
    sym2 = Symptom(
        patient_id="pat-002",
        symptom_type="unusual_fatigue",
        severity="moderate",
        onset_at=now - timedelta(days=2),
        duration_minutes=180,
        notes="Heavy exhaustion after climbing one flight of stairs.",
        urgent_guidance_displayed=False,
    )
    db.add_all([sym1, sym2])

    # Add an active emergency event prompt for Sofia Patel (pat-003) to demonstrate simulator immediately!
    emerg_event = EmergencyEvent(
        id="evt-demo-sofia-001",
        patient_id="pat-003",
        event_type="simulated_fall_faint",
        status="prompted",
        triggered_at=now - timedelta(seconds=10),
        simulated_timeout_seconds=25,
    )
    db.add(emerg_event)
    db.commit()

    # Recalculate baselines and evaluate monitoring rules for each patient
    monitoring = MonitoringEngine(db)
    for pd in patients_data:
        monitoring.recalculate_patient_baselines(pd["patient_id"], window_days=14)
        monitoring.evaluate_trend_alerts(pd["patient_id"])

    # Add a sample clinician review for Marcus Chen
    clin_review = ClinicianReview(
        patient_id="pat-002",
        clinician_id=doctor_user.id,
        review_notes="Reviewed 14-day wearable trend. Sustained heart rate elevation noted following viral symptoms. Recommended 24-hour Holter patch.",
        recommended_action="order_holter_monitor",
        reviewed_at=now - timedelta(hours=5),
    )
    db.add(clin_review)

    # Add Audit log
    audit_init = AuditLog(
        action="SYSTEM_DEMO_SEED",
        user_id="usr-doc-001",
        target_patient_id="pat-001",
        details_json={"note": "Initial synthetic dataset seeded with 4 patient profiles."},
    )
    db.add(audit_init)
    db.commit()
    print("Seed complete: 4 patients, 14-day telemetry, baselines, alerts, emergency simulation.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        reset_and_seed_database(db)
    finally:
        db.close()
