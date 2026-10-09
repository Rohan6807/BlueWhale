from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.services.security import verify_password
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.schemas.auth import Token, LoginRequest, UserResponse
from app.api.deps import create_access_token, get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

class DemoSwitchRequest(BaseModel):
    persona: str  # 'patient', 'marcus', 'sofia', 'arthur', 'caregiver', 'clinician'

@router.post("/login", response_model=Token)
def login_for_access_token(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    patient_id = None
    if user.patient:
        patient_id = user.patient.id

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )

    log_audit_event(db, action="USER_LOGIN", user_id=user.id, target_patient_id=patient_id)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        role=user.role,
        patient_id=patient_id,
        full_name=user.full_name,
    )

@router.post("/demo-switch", response_model=Token)
def switch_demo_persona(payload: DemoSwitchRequest, db: Session = Depends(get_db)):
    """
    Convenient demo persona switcher for testing and presentations.
    """
    persona_map = {
        "patient": "patient@cardiolens.demo",
        "eleanor": "patient@cardiolens.demo",
        "marcus": "marcus@cardiolens.demo",
        "sofia": "sofia@cardiolens.demo",
        "arthur": "arthur@cardiolens.demo",
        "caregiver": "caregiver@cardiolens.demo",
        "clinician": "doctor@cardiolens.demo",
        "doctor": "doctor@cardiolens.demo",
    }
    target_email = persona_map.get(payload.persona.lower())
    if not target_email:
        raise HTTPException(status_code=400, detail=f"Unknown persona '{payload.persona}'. Allowed: {list(persona_map.keys())}")

    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo persona user not found in database. Please run demo seed.")

    patient_id = user.patient.id if user.patient else None
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )

    log_audit_event(
        db,
        action="DEMO_PERSONA_SWITCH",
        user_id=user.id,
        target_patient_id=patient_id,
        details={"persona": payload.persona},
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        role=user.role,
        patient_id=patient_id,
        full_name=user.full_name,
    )

@router.get("/me", response_model=UserResponse)
def get_user_me(current_user: User = Depends(get_current_user)):
    return current_user
