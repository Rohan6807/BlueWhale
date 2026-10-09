from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.v1 import api_v1_router
from app.models.patient import Patient
from app.data.seed_data import reset_and_seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    # Check if database has seeded data; if empty, seed demo data automatically
    db = SessionLocal()
    try:
        p_count = db.query(Patient).count()
        if p_count == 0:
            reset_and_seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="CardioLens AI API",
    version=settings.VERSION,
    description=(
        "Research Demonstration Platform for Wearable-Data Trend Awareness and Emergency Simulation. "
        "NOTICE: CardioLens AI is a research demonstration prototype, NOT an approved medical device or diagnostic system. "
        "Basic wearable measurements do not diagnose cardiac disorders, predict cardiac arrest, or guarantee safety."
    ),
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    lifespan=lifespan,
)

# CORS Configuration
origins = settings.BACKEND_CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_disclaimer_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Research-Prototype"] = "CardioLens-AI-Hackathon-Prototype"
    response.headers["X-Medical-Disclaimer"] = "Not a medical device. For demonstration purposes only."
    return response

# Root and Health check endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "disclaimer": settings.DISCLAIMER_TEXT,
    }

# Mount API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
