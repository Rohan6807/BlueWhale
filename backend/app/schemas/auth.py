from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    role: str
    patient_id: Optional[str] = None
    full_name: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, description="Full name must be at least 2 characters")

    @field_validator("email")
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("Please provide a valid email address")
        return clean

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "patient"

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    patient_id: Optional[str] = None

    class Config:
        from_attributes = True
