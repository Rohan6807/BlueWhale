from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime, timezone

class FHIRIntegrationAdapter(ABC):
    """
    Interface for prospective HL7 FHIR R4 clinical interoperability.
    Enables future connection to Epic, Cerner, or other electronic health record systems.
    """

    @abstractmethod
    def export_patient_resource(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def export_observation_resource(self, measurement: Dict[str, Any]) -> Dict[str, Any]:
        pass


class MockFHIRAdapter(FHIRIntegrationAdapter):
    """
    Standard HL7 FHIR R4 representation builder for research prototype demo.
    """

    LOINC_CODES = {
        "heart_rate": {"code": "8867-4", "display": "Heart rate", "unit": "beats/minute", "unit_code": "/min"},
        "hrv_rmssd": {"code": "80404-7", "display": "R-R interval.standard deviation (HRV)", "unit": "ms", "unit_code": "ms"},
        "systolic_bp": {"code": "8480-6", "display": "Systolic blood pressure", "unit": "mmHg", "unit_code": "mm[Hg]"},
        "diastolic_bp": {"code": "8462-4", "display": "Diastolic blood pressure", "unit": "mmHg", "unit_code": "mm[Hg]"},
        "spo2": {"code": "2708-6", "display": "Oxygen saturation in Arterial blood", "unit": "%", "unit_code": "%"},
        "daily_steps": {"code": "55423-8", "display": "Number of steps", "unit": "steps", "unit_code": "1"},
    }

    def export_patient_resource(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "resourceType": "Patient",
            "id": patient_data.get("id"),
            "identifier": [
                {
                    "system": "urn:cardiolens:patient-mrn",
                    "value": patient_data.get("mrn", "UNKNOWN-MRN")
                }
            ],
            "name": [{"use": "official", "text": patient_data.get("display_name")}],
            "gender": patient_data.get("biological_sex", "unknown"),
            "birthDate": patient_data.get("date_of_birth", "1980-01-01"),
            "meta": {
                "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"],
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
            }
        }

    def export_observation_resource(self, measurement: Dict[str, Any]) -> Dict[str, Any]:
        metric = measurement.get("metric", "heart_rate")
        loinc = self.LOINC_CODES.get(metric, {"code": "8867-4", "display": metric, "unit": measurement.get("unit"), "unit_code": "1"})

        return {
            "resourceType": "Observation",
            "id": f"obs-{measurement.get('id')}",
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs"
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": loinc["code"],
                        "display": loinc["display"]
                    }
                ]
            },
            "subject": {
                "reference": f"Patient/{measurement.get('patient_id')}"
            },
            "effectiveDateTime": measurement.get("measured_at"),
            "valueQuantity": {
                "value": measurement.get("numeric_value"),
                "unit": loinc["unit"],
                "system": "http://unitsofmeasure.org",
                "code": loinc["unit_code"]
            },
            "device": {
                "display": measurement.get("source", "wearable_sensor")
            }
        }

fhir_adapter = MockFHIRAdapter()
