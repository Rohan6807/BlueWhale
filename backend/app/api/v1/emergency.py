from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.emergency import EmergencyEvent, EmergencyContact, NotificationAttempt
from app.schemas.emergency import (
    EmergencyEventResponse,
    EmergencyTriggerRequest,
    WearerResponseRequest,
    CaregiverAcknowledgeRequest,
    EmergencyContactResponse,
    NotificationAttemptResponse,
)
from app.api.deps import get_current_user, verify_patient_access
from app.services.notification_service import NotificationService
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/emergency", tags=["Emergency Simulation"])

@router.get("/active", response_model=Optional[EmergencyEventResponse])
def get_active_emergency_event(
    patient_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    # Check for event currently in prompted, escalated, or timed_out state
    event = (
        db.query(EmergencyEvent)
        .filter(
            EmergencyEvent.patient_id == patient_id,
            EmergencyEvent.status.in_(["prompted", "escalated", "timed_out"]),
        )
        .order_by(EmergencyEvent.triggered_at.desc())
        .first()
    )

    if not event:
        return None

    # Eager load notifications
    notifs = (
        db.query(NotificationAttempt)
        .filter(NotificationAttempt.emergency_event_id == event.id)
        .order_by(NotificationAttempt.created_at.asc())
        .all()
    )

    resp = EmergencyEventResponse.model_validate(event)
    resp.notifications = [NotificationAttemptResponse.model_validate(n) for n in notifs]
    return resp

@router.get("/events", response_model=List[EmergencyEventResponse])
def get_emergency_events_history(
    patient_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)

    events = (
        db.query(EmergencyEvent)
        .filter(EmergencyEvent.patient_id == patient_id)
        .order_by(EmergencyEvent.triggered_at.desc())
        .limit(20)
        .all()
    )

    results = []
    for ev in events:
        notifs = (
            db.query(NotificationAttempt)
            .filter(NotificationAttempt.emergency_event_id == ev.id)
            .all()
        )
        r = EmergencyEventResponse.model_validate(ev)
        r.notifications = [NotificationAttemptResponse.model_validate(n) for n in notifs]
        results.append(r)
    return results

@router.post("/trigger", response_model=EmergencyEventResponse, status_code=201)
def trigger_simulated_event(
    patient_id: str = Query(...),
    payload: EmergencyTriggerRequest = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a server-managed possible fall/faint simulation event.
    """
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Cancel any previous active prompted events
    active_prev = (
        db.query(EmergencyEvent)
        .filter(
            EmergencyEvent.patient_id == patient_id,
            EmergencyEvent.status == "prompted",
        )
        .all()
    )
    for p in active_prev:
        p.status = "resolved"
        p.cancellation_reason = "Superseded by new test trigger"

    now = datetime.now(timezone.utc)
    event = EmergencyEvent(
        patient_id=patient_id,
        event_type=payload.event_type,
        status="prompted",
        triggered_at=now,
        simulated_timeout_seconds=payload.simulated_timeout_seconds or 25,
    )
    patient.emergency_mode = True
    db.add(event)
    db.commit()
    db.refresh(event)

    log_audit_event(
        db,
        action="TRIGGER_EMERGENCY_SIMULATION",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details={"event_id": event.id, "type": event.event_type},
    )

    resp = EmergencyEventResponse.model_validate(event)
    resp.notifications = []
    return resp

@router.post("/events/{event_id}/respond", response_model=EmergencyEventResponse)
def submit_wearer_response(
    event_id: str,
    payload: WearerResponseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validates wearer prompt response ('ok' or 'help') with state machine transitions.
    """
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    verify_patient_access(event.patient_id, current_user, db)

    if event.status not in ["prompted", "timed_out"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot respond to event with current status '{event.status}'",
        )

    now = datetime.now(timezone.utc)
    event.responded_at = now
    event.wearer_response = payload.response

    patient = db.query(Patient).filter(Patient.id == event.patient_id).first()

    if payload.response == "ok":
        event.status = "wearer_ok"
        event.cancellation_reason = "Wearer confirmed safe via prompt ('I am OK')"
        if patient:
            patient.emergency_mode = False
        db.commit()
    elif payload.response == "help":
        event.status = "escalated"
        db.commit()
        # Trigger caregiver escalation immediately
        notif_svc = NotificationService(db)
        notif_svc.trigger_caregiver_notifications(
            event,
            reason="Wearer explicitly requested assistance via smartwatch prompt ('Need help')",
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid response. Must be 'ok' or 'help'")

    log_audit_event(
        db,
        action="WEARER_SIMULATION_RESPONSE",
        user_id=current_user.id,
        target_patient_id=event.patient_id,
        details={"event_id": event.id, "wearer_response": payload.response, "new_status": event.status},
    )

    notifs = (
        db.query(NotificationAttempt)
        .filter(NotificationAttempt.emergency_event_id == event.id)
        .all()
    )
    resp = EmergencyEventResponse.model_validate(event)
    resp.notifications = [NotificationAttemptResponse.model_validate(n) for n in notifs]
    return resp

@router.post("/events/{event_id}/timeout", response_model=EmergencyEventResponse)
def trigger_event_timeout(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Transitions event state when the countdown timer expires without response.
    Triggers simulated caregiver escalation.
    """
    event = db.query(EmergencyEvent).filter(EmergencyEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    verify_patient_access(event.patient_id, current_user, db)

    if event.status != "prompted":
        # If already responded or timed out, maintain current status
        notifs = db.query(NotificationAttempt).filter(NotificationAttempt.emergency_event_id == event.id).all()
        resp = EmergencyEventResponse.model_validate(event)
        resp.notifications = [NotificationAttemptResponse.model_validate(n) for n in notifs]
        return resp

    event.status = "timed_out"
    event.wearer_response = "timeout"
    event.responded_at = datetime.now(timezone.utc)
    db.commit()

    # Trigger caregiver notifications
    notif_svc = NotificationService(db)
    notif_svc.trigger_caregiver_notifications(
        event,
        reason=f"Wearer did not respond to smartwatch vibration prompt within {event.simulated_timeout_seconds} seconds",
    )

    log_audit_event(
        db,
        action="EMERGENCY_PROMPT_TIMEOUT",
        user_id=current_user.id,
        target_patient_id=event.patient_id,
        details={"event_id": event.id},
    )

    notifs = db.query(NotificationAttempt).filter(NotificationAttempt.emergency_event_id == event.id).all()
    resp = EmergencyEventResponse.model_validate(event)
    resp.notifications = [NotificationAttemptResponse.model_validate(n) for n in notifs]
    return resp

@router.post("/events/{event_id}/acknowledge", response_model=EmergencyEventResponse)
def acknowledge_emergency_event(
    event_id: str,
    payload: CaregiverAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Caregiver portal action: marks the emergency notification as acknowledged.
    """
    notif_svc = NotificationService(db)
    event = notif_svc.acknowledge_event(event_id, payload.acknowledged_by)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    patient = db.query(Patient).filter(Patient.id == event.patient_id).first()
    if patient:
        patient.emergency_mode = False
        db.commit()

    log_audit_event(
        db,
        action="CAREGIVER_ACKNOWLEDGE_EMERGENCY",
        user_id=current_user.id,
        target_patient_id=event.patient_id,
        details={"event_id": event.id, "acknowledged_by": payload.acknowledged_by},
    )

    notifs = db.query(NotificationAttempt).filter(NotificationAttempt.emergency_event_id == event.id).all()
    resp = EmergencyEventResponse.model_validate(event)
    resp.notifications = [NotificationAttemptResponse.model_validate(n) for n in notifs]
    return resp

@router.get("/contacts", response_model=List[EmergencyContactResponse])
def get_emergency_contacts(
    patient_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    return (
        db.query(EmergencyContact)
        .filter(EmergencyContact.patient_id == patient_id, EmergencyContact.is_active == True)
        .order_by(EmergencyContact.priority_order.asc())
        .all()
    )

@router.get("/notifications", response_model=List[NotificationAttemptResponse])
def get_notification_logs(
    patient_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_patient_access(patient_id, current_user, db)
    return (
        db.query(NotificationAttempt)
        .join(EmergencyEvent)
        .filter(EmergencyEvent.patient_id == patient_id)
        .order_by(NotificationAttempt.created_at.desc())
        .limit(30)
        .all()
    )
