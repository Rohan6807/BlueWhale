import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from app.config import settings
from app.models.patient import Patient
from app.models.measurement import Measurement
from app.models.baseline import PersonalBaseline
from app.models.alert import Alert
from app.models.symptom import Symptom
from app.models.hospital import HospitalRecord
from app.services.monitoring_engine import MonitoringEngine

def build_patient_evidence_package(db: Session, patient_id: str, alert_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Assembles a rigorous, bounded evidence payload from real database records.
    Never relies on hallucinated figures.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    display_name = patient.display_name if patient else "Demo Patient"

    monitoring = MonitoringEngine(db)
    stale_info = monitoring.detect_missing_and_stale_data(patient_id)

    # Baselines
    baselines = db.query(PersonalBaseline).filter(PersonalBaseline.patient_id == patient_id).all()
    baseline_dict = {
        b.metric: {
            "median": b.median_value,
            "mad": b.mad_value,
            "p10": b.p10_value,
            "p90": b.p90_value,
            "window_days": b.window_days,
            "sample_count": b.sample_count,
        }
        for b in baselines
    }

    # Latest measurements
    recent_m = (
        db.query(Measurement)
        .filter(Measurement.patient_id == patient_id)
        .order_by(Measurement.measured_at.desc())
        .limit(20)
        .all()
    )
    metrics_summary = {}
    for m in recent_m:
        if m.metric not in metrics_summary:
            metrics_summary[m.metric] = {
                "latest_value": m.numeric_value,
                "unit": m.unit,
                "measured_at": m.measured_at.isoformat(),
                "source": m.source,
                "quality": m.quality,
            }

    # Alerts
    alerts = (
        db.query(Alert)
        .filter(Alert.patient_id == patient_id)
        .order_by(Alert.created_at.desc())
        .limit(5)
        .all()
    )
    alerts_list = [
        {
            "id": a.id,
            "category": a.category,
            "severity": a.severity,
            "status": a.status,
            "rule_id": a.rule_id,
            "explanation": a.explanation,
            "evidence": a.evidence_json,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]

    # Specific targeted alert if provided
    targeted_alert = None
    if alert_id:
        target_obj = db.query(Alert).filter(Alert.id == alert_id).first()
        if target_obj:
            targeted_alert = {
                "id": target_obj.id,
                "category": target_obj.category,
                "severity": target_obj.severity,
                "rule_id": target_obj.rule_id,
                "explanation": target_obj.explanation,
                "evidence": target_obj.evidence_json,
            }

    # Symptoms
    symptoms = (
        db.query(Symptom)
        .filter(Symptom.patient_id == patient_id)
        .order_by(Symptom.onset_at.desc())
        .limit(5)
        .all()
    )
    symptoms_list = [
        {
            "symptom_type": s.symptom_type,
            "severity": s.severity,
            "onset_at": s.onset_at.isoformat(),
            "notes": s.notes,
            "duration_minutes": s.duration_minutes,
        }
        for s in symptoms
    ]

    # Clinical history (authorized check)
    has_consent = patient and patient.consent and patient.consent.allow_ai_summarization
    clinical_history_summary = None
    if has_consent:
        h_rec = db.query(HospitalRecord).filter(HospitalRecord.patient_id == patient_id).first()
        if h_rec:
            clinical_history_summary = {
                "mrn": h_rec.mrn,
                "condition_summary": h_rec.condition_summary,
                "diagnoses_and_medications": h_rec.clinical_history_json,
                "recent_labs": h_rec.lab_summaries_json,
            }

    return {
        "patient_id": patient_id,
        "display_name": display_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metrics_summary": metrics_summary,
        "baselines": baseline_dict,
        "recent_alerts": alerts_list,
        "targeted_alert": targeted_alert,
        "recent_symptoms": symptoms_list,
        "data_quality_assessment": {
            "sensor_quality_score": stale_info["sensor_quality_score"],
            "data_completeness_score": stale_info["data_completeness_score"],
            "is_stale": stale_info["is_stale"],
            "hours_since_last_sync": stale_info["hours_since_sync"],
        },
        "missing_data_intervals": stale_info["missing_intervals"],
        "clinical_history_authorized": bool(has_consent and clinical_history_summary),
        "clinical_history_summary": clinical_history_summary,
    }


def generate_deterministic_response(query_type: str, evidence: Dict[str, Any], custom_question: Optional[str] = None) -> str:
    """
    High-fidelity deterministic template fallback compliant with healthcare safety guidelines.
    """
    name = evidence.get("display_name", "Wearer")
    metrics = evidence.get("metrics_summary", {})
    baselines = evidence.get("baselines", {})
    alerts = evidence.get("recent_alerts", [])
    quality = evidence.get("data_quality_assessment", {})
    missing = evidence.get("missing_data_intervals", [])

    if query_type == "trends_summary" or "trend" in (custom_question or "").lower():
        md = [
            f"### Weekly Health Trend Analysis for {name}",
            "",
            "**Data Continuity & Completeness:**",
            f"- Data Completeness: **{quality.get('data_completeness_score', 0)}%** (Sensor signal quality: **{quality.get('sensor_quality_score', 0)}%**)",
        ]
        if missing:
            md.append(f"- ⚠️ Telemetry Notice: {missing[0]}")

        md.append("\n**Observed Metric Trajectories vs. Established Personal Baselines:**")
        for metric, data in metrics.items():
            base = baselines.get(metric)
            val = data.get("latest_value")
            unit = data.get("unit")
            if base:
                med = base.get("median")
                diff = val - med
                direction = "higher than" if diff > 0 else "lower than" if diff < 0 else "identical to"
                md.append(f"- **{metric.replace('_', ' ').title()}**: Current reading is `{val} {unit}` ({abs(diff):.1f} {unit} {direction} your 14-day median baseline of `{med} {unit}`).")
            else:
                md.append(f"- **{metric.replace('_', ' ').title()}**: Current reading is `{val} {unit}` (Baseline calibration still accumulating data).")

        md.append("\n**Active Advisory Signals:**")
        if alerts:
            for a in alerts[:2]:
                md.append(f"- **{a['category'].replace('_', ' ').title()}** ({a['severity']}): {a['explanation']}")
        else:
            md.append("- No persistent deviation alerts are currently active.")

        md.append("\n> **Important:** Wearable metrics reflect physiological trends and lifestyle factors. They do not constitute a medical diagnosis. Consult a physician for clinical assessment.")
        return "\n".join(md)

    elif query_type == "alert_explanation" or evidence.get("targeted_alert"):
        target = evidence.get("targeted_alert") or (alerts[0] if alerts else None)
        if not target:
            return "No active alert was found for explanation. Your wearable readings are currently within your personal baseline bounds."

        ev = target.get("evidence", {})
        md = [
            f"### Alert Investigation: {target.get('category', '').replace('_', ' ').title()}",
            "",
            f"**Rule Triggered:** `{target.get('rule_id', 'RULE-EVAL')}`",
            f"**Severity Level:** `{target.get('severity', 'advisory').upper()}`",
            "",
            "**Quantitative Evidence:**",
            f"- Observed Value / Median: `{ev.get('recent_median', 'N/A')}`",
            f"- Established Personal Median: `{ev.get('baseline_median', 'N/A')}`",
            f"- Robust Z-Score / Deviation: `{ev.get('robust_z_score', 'N/A')}` standard deviations from median",
            f"- Evaluation Duration: `{ev.get('evaluation_window_days', '3')} days`",
            "",
            "**Clinical Context & Next Steps:**",
            target.get("explanation", ""),
            "",
            "> **Medical Safety Reminder:** This alert indicates a mathematical deviation from your historical measurements. If you experience dizziness, chest pain, or shortness of breath, please seek emergency medical attention."
        ]
        return "\n".join(md)

    elif query_type == "measurements_summary":
        md = [
            f"### Current Sensor Measurement Summary for {name}",
            "",
            "| Metric | Current Reading | Unit | Quality Rating | Calibrated Baseline Median |",
            "|---|---|---|---|---|",
        ]
        for metric, data in metrics.items():
            base = baselines.get(metric, {})
            base_med = base.get("median", "Calibrating...")
            md.append(f"| **{metric.replace('_', ' ').title()}** | `{data.get('latest_value')}` | {data.get('unit')} | {data.get('quality')} | {base_med} |")

        md.append("\n**Sensor Ingestion Health:**")
        md.append(f"- Sensor Integrity Score: **{quality.get('sensor_quality_score', 0)}%**")
        md.append(f"- Hours Since Last Sync: **{quality.get('hours_since_last_sync', '0')}h**")
        return "\n".join(md)

    elif query_type == "doctor_prep":
        history = evidence.get("clinical_history_summary")
        symptoms = evidence.get("recent_symptoms", [])
        md = [
            f"### Physician Consultation Preparation Guide for {name}",
            "",
            "**Key Discussion Points for Your Doctor:**",
            "1. **Observed Baseline Shifts:**",
        ]
        for a in alerts[:2]:
            md.append(f"   - {a['explanation']}")
        if not alerts:
            md.append("   - No significant persistent shifts detected this week.")

        md.append("2. **Recent Patient-Reported Symptoms:**")
        if symptoms:
            for s in symptoms[:3]:
                md.append(f"   - {s['symptom_type'].replace('_', ' ').title()} (Severity: {s['severity']}, Onset: {s['onset_at'][:10]})")
        else:
            md.append("   - No symptoms logged during this monitoring cycle.")

        if history:
            md.append("3. **Authorized Medical Context:**")
            md.append(f"   - Condition: {history.get('condition_summary')}")

        md.append("\n**Questions to ask your healthcare provider:**")
        md.append("- Does the observed variation in my resting heart rate or blood pressure warrant medication adjustment?")
        md.append("- Should we consider formal diagnostic monitoring such as a Holter patch?")
        md.append("- Are there lifestyle or hydration modifications you advise based on these wearable trends?")
        return "\n".join(md)

    elif query_type == "history_summary":
        history = evidence.get("clinical_history_summary")
        if not history:
            return f"Clinical record sharing is either not authorized under patient consent settings or no hospital record was found for {name}."

        md = [
            f"### Authorized Fictional Clinical Record Summary for {name}",
            f"- **MRN (Fictional):** `{history.get('mrn')}`",
            f"- **Primary Condition:** {history.get('condition_summary')}",
            "",
            "**Diagnoses & Active Regimens:**",
        ]
        dh = history.get("diagnoses_and_medications", {})
        for diag in dh.get("diagnoses", []):
            md.append(f"- Diagnosis: **{diag}**")
        for med in dh.get("medications", []):
            md.append(f"- Current Medication: **{med}**")

        md.append("\n**Recent Hospital Lab Summaries:**")
        for lab in history.get("recent_labs", []):
            md.append(f"- **{lab.get('test_name')}**: `{lab.get('value')} {lab.get('unit')}` (Status: {lab.get('status')})")

        return "\n".join(md)

    else:
        # Generic query fallback
        return (
            f"### Summary for {name}\n\n"
            f"Review of current metrics shows: {len(metrics)} monitored physiological signals. "
            f"Active alerts: {len(alerts)}. Overall sensor data completeness is {quality.get('data_completeness_score', 0)}%. "
            "Please refer to the specific trend views or consult your clinician for personalized interpretation."
        )


class GemmaCopilotAdapter:
    """
    Adapter for Google Gemma 4.
    Supports local inference server (e.g., vLLM / Ollama) or hosted endpoint.
    Gracefully and safely falls back to the deterministic template engine if offline.
    """

    async def query(
        self,
        query_type: str,
        evidence: Dict[str, Any],
        custom_question: Optional[str] = None
    ) -> Dict[str, Any]:
        api_base = settings.GEMMA_API_BASE_URL.strip()
        api_key = settings.GEMMA_API_KEY.strip()
        model_name = settings.GEMMA_MODEL_NAME

        # If no endpoint configured, return deterministic template immediately
        if not api_base:
            text = generate_deterministic_response(query_type, evidence, custom_question)
            return {
                "response_markdown": text,
                "is_ai_generated": False,
                "model_identifier": "Deterministic Rule Template Engine (Fallback / Offline)",
            }

        # Format system prompt and evidence for Gemma 4
        system_instruction = (
            "You are CardioLens Copilot, a healthcare research assistant powered by Google Gemma 4. "
            "You are provided with a structured EVIDENCE JSON containing wearable metrics, personal baselines, "
            "and alert history for an authorized fictional patient. "
            "STRICT RULES:\n"
            "1. ONLY state facts and numbers directly contained in the supplied EVIDENCE JSON.\n"
            "2. Never hallucinate diagnoses, medications, blood test results, or risk probabilities.\n"
            "3. Wearable trends are NOT clinical diagnoses. Use cautious, objective language.\n"
            "4. Never advise changing prescriptions. Always recommend clinical assessment.\n"
            "5. If sensor data is stale or missing, explicitly note it as an analytical limitation."
        )

        user_content = f"QUERY TYPE: {query_type}\nCUSTOM QUESTION: {custom_question or 'N/A'}\n\nEVIDENCE JSON:\n{json.dumps(evidence, indent=2)}"

        endpoint_url = f"{api_base.rstrip('/')}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content},
            ],
            "temperature": settings.GEMMA_TEMPERATURE,
            "max_tokens": 800,
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(endpoint_url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    answer = data["choices"][0]["message"]["content"]
                    # Clean internal reasoning tags if present
                    if "</thought>" in answer:
                        answer = answer.split("</thought>", 1)[-1].strip()
                    return {
                        "response_markdown": answer,
                        "is_ai_generated": True,
                        "model_identifier": f"Google Gemma 4 ({model_name})",
                    }
        except Exception:
            pass  # Fall through to deterministic fallback

        fallback_text = generate_deterministic_response(query_type, evidence, custom_question)
        return {
            "response_markdown": fallback_text,
            "is_ai_generated": False,
            "model_identifier": "Deterministic Rule Template Engine (Gemma 4 Endpoint Offline / Fallback)",
        }

gemma_copilot = GemmaCopilotAdapter()
