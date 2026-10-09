from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.patients import router as patients_router
from app.api.v1.measurements import router as measurements_router
from app.api.v1.symptoms import router as symptoms_router
from app.api.v1.baselines import router as baselines_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.emergency import router as emergency_router
from app.api.v1.hospital import router as hospital_router
from app.api.v1.copilot import router as copilot_router
from app.api.v1.demo import router as demo_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(patients_router)
api_v1_router.include_router(measurements_router)
api_v1_router.include_router(symptoms_router)
api_v1_router.include_router(baselines_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(emergency_router)
api_v1_router.include_router(hospital_router)
api_v1_router.include_router(copilot_router)
api_v1_router.include_router(demo_router)

__all__ = ["api_v1_router"]
