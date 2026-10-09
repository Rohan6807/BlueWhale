import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "CardioLens AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cardiolens.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cardiolens-dev-insecure-secret-key-change-in-prod-7824021487")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for demo convenience
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["*"]

    # AI Configuration (Gemma 4 Adapter)
    GEMMA_API_BASE_URL: str = os.getenv("GEMMA_API_BASE_URL", "")
    GEMMA_API_KEY: str = os.getenv("GEMMA_API_KEY", "")
    GEMMA_MODEL_NAME: str = os.getenv("GEMMA_MODEL_NAME", "google/gemma-4-9b-it")
    GEMMA_TEMPERATURE: float = 0.2
    
    # Simulation & Safety
    DEMO_MODE: bool = True
    EMERGENCY_TIMEOUT_SECONDS: int = 25
    NOTIFICATION_ESCALATION_DELAY_SECONDS: int = 15
    DISCLAIMER_TEXT: str = (
        "RESEARCH PROTOTYPE NOTICE: CardioLens AI is a research demonstration system for "
        "wearable-data trend awareness and fall/fainting response simulation. It is NOT a medical device, "
        "diagnostic tool, or emergency dispatcher. Do not use for clinical decision-making or real emergencies. "
        "If you believe you have an urgent medical condition, call your local emergency service (e.g. 911 or 112) immediately."
    )

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
