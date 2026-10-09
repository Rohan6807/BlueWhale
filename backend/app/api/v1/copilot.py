from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.patient import Patient
from app.schemas.copilot import CopilotQueryRequest, CopilotQueryResponse, EvidencePackage
from app.api.deps import get_current_user, verify_patient_access
from app.services.gemma_adapter import build_patient_evidence_package, gemma_copilot
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/copilot", tags=["Gemma 4 Copilot"])

@router.post("/query", response_model=CopilotQueryResponse)
async def query_copilot(
    patient_id: str = Query(...),
    payload: CopilotQueryRequest = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submits structured query to Gemma 4 Copilot.
    Extracts bounded, verifiable Evidence Package from database before generating response.
    Falls back to deterministic template engine if model endpoint is offline.
    """
    verify_patient_access(patient_id, current_user, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Build evidence package
    evidence_dict = build_patient_evidence_package(db, patient_id, alert_id=payload.alert_id)

    # Query adapter
    ai_result = await gemma_copilot.query(
        query_type=payload.query_type,
        evidence=evidence_dict,
        custom_question=payload.custom_question,
    )

    log_audit_event(
        db,
        action="COPILOT_QUERY",
        user_id=current_user.id,
        target_patient_id=patient_id,
        details={
            "query_type": payload.query_type,
            "is_ai_generated": ai_result["is_ai_generated"],
            "model": ai_result["model_identifier"],
        },
    )

    return CopilotQueryResponse(
        query_type=payload.query_type,
        response_markdown=ai_result["response_markdown"],
        evidence_package=EvidencePackage(**evidence_dict),
        is_ai_generated=ai_result["is_ai_generated"],
        model_identifier=ai_result["model_identifier"],
        generated_at=datetime.now(timezone.utc),
        safety_disclaimer=settings.DISCLAIMER_TEXT,
    )
