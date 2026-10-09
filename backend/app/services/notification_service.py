from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.emergency import EmergencyEvent, EmergencyContact, NotificationAttempt
from app.models.patient import Patient

class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def trigger_caregiver_notifications(
        self,
        event: EmergencyEvent,
        reason: str = "Wearer requested assistance or did not respond to vibration prompt"
    ) -> List[NotificationAttempt]:
        """
        Executes idempotent simulated caregiver notification escalation.
        Notifies priority 1 contact first, then priority 2 contact.
        """
        patient = self.db.query(Patient).filter(Patient.id == event.patient_id).first()
        patient_name = patient.display_name if patient else "Wearer"

        # Fetch emergency contacts ordered by priority
        contacts = (
            self.db.query(EmergencyContact)
            .filter(
                EmergencyContact.patient_id == event.patient_id,
                EmergencyContact.is_active == True,
            )
            .order_by(EmergencyContact.priority_order.asc())
            .all()
        )

        created_attempts: List[NotificationAttempt] = []
        now = datetime.now(timezone.utc)

        for contact in contacts:
            # Construct a deterministic idempotent key to prevent duplicates
            idempotent_key_sms = f"SIM-SMS-{event.id}-{contact.id}-seq{contact.priority_order}"
            idempotent_key_voice = f"SIM-VOICE-{event.id}-{contact.id}-seq{contact.priority_order}"

            # 1. SMS Channel
            existing_sms = (
                self.db.query(NotificationAttempt)
                .filter(NotificationAttempt.idempotent_key == idempotent_key_sms)
                .first()
            )
            if not existing_sms:
                sms_body = (
                    f"[CARDIOLENS SIMULATION] ALERT: Possible fall or fainting prompt for {patient_name} "
                    f"triggered at {event.triggered_at.strftime('%H:%M:%S UTC')}. Reason: {reason}. "
                    "This is a simulated hackathon exercise. In a real emergency, call 911."
                )
                attempt_sms = NotificationAttempt(
                    emergency_event_id=event.id,
                    contact_id=contact.id,
                    channel="sms",
                    status="delivered",
                    message_content=sms_body,
                    delivery_timestamp=now,
                    idempotent_key=idempotent_key_sms,
                    created_at=now,
                )
                self.db.add(attempt_sms)
                created_attempts.append(attempt_sms)

            # 2. Automated Voice Call Channel for primary contact
            if contact.priority_order == 1:
                existing_voice = (
                    self.db.query(NotificationAttempt)
                    .filter(NotificationAttempt.idempotent_key == idempotent_key_voice)
                    .first()
                )
                if not existing_voice:
                    voice_body = (
                        f"[AUTOMATED VOICE CALL SIMULATION] Urgent prompt: {patient_name} has generated an unconfirmed "
                        f"fall/fainting sensor event. Press 1 on your portal to acknowledge."
                    )
                    attempt_voice = NotificationAttempt(
                        emergency_event_id=event.id,
                        contact_id=contact.id,
                        channel="automated_voice",
                        status="delivered",
                        message_content=voice_body,
                        delivery_timestamp=now,
                        idempotent_key=idempotent_key_voice,
                        created_at=now,
                    )
                    self.db.add(attempt_voice)
                    created_attempts.append(attempt_voice)

        self.db.commit()
        return created_attempts

    def acknowledge_event(
        self,
        event_id: str,
        acknowledged_by: str
    ) -> Optional[EmergencyEvent]:
        """
        Marks the event and all associated notification attempts as acknowledged by caregiver.
        """
        event = self.db.query(EmergencyEvent).filter(EmergencyEvent.id == event_id).first()
        if not event:
            return None

        now = datetime.now(timezone.utc)
        event.status = "acknowledged"

        attempts = (
            self.db.query(NotificationAttempt)
            .filter(NotificationAttempt.emergency_event_id == event_id)
            .all()
        )
        for att in attempts:
            if not att.acknowledged_at:
                att.acknowledged_at = now
                att.acknowledged_by = acknowledged_by

        self.db.commit()
        self.db.refresh(event)
        return event
