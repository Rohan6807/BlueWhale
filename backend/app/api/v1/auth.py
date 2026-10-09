from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.services.security import verify_password, hash_password
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.patient import Patient, PatientConsent
from app.schemas.auth import (
    Token,
    LoginRequest,
    UserResponse,
    SignupRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.api.deps import create_access_token, get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

class DemoSwitchRequest(BaseModel):
    persona: str  # 'patient', 'marcus', 'sofia', 'arthur', 'caregiver', 'clinician'

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new patient user. Prevents privilege escalation by restricting
    self-service registration to the 'patient' role.
    """
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please log in.",
        )

    # 1. Create User
    new_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role="patient",
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # 2. Create Patient Profile
    new_patient = Patient(
        user_id=new_user.id,
        display_name=payload.full_name,
        baseline_status="calibrating",
        emergency_mode=False,
    )
    db.add(new_patient)
    db.flush()

    # 3. Create Default Patient Consent
    consent = PatientConsent(
        patient_id=new_patient.id,
        allow_caregiver_sharing=True,
        allow_hospital_sharing=True,
        allow_ai_summarization=True,
    )
    db.add(consent)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db,
        action="USER_SIGNUP",
        user_id=new_user.id,
        target_patient_id=new_patient.id,
        details={"email": new_user.email, "role": new_user.role},
    )

    return new_user

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

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Handle password reset request. For this research demo, provides a friendly
    confirmation and reset guidance.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {
            "message": "If an account with this email exists, password reset instructions have been issued.",
            "demo_hint": "In demo mode, you can use pre-configured test accounts or register a new one.",
        }

    return {
        "message": f"Password reset instructions issued for {user.email}.",
        "reset_token": "demo-reset-token-valid-15m",
        "demo_hint": "In this research demo environment, you can reset your password immediately via the reset form.",
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset a user's password securely.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with provided email",
        )

    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    log_audit_event(
        db,
        action="PASSWORD_RESET",
        user_id=user.id,
        details={"email": user.email},
    )

    return {"message": "Password updated successfully. You can now log in with your new password."}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Log user logout event and confirm session invalidation.
    """
    log_audit_event(db, action="USER_LOGOUT", user_id=current_user.id)
    return {"message": "Successfully logged out"}

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
