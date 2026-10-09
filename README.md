# CardioLens AI

> **Wearable Telemetry Monitoring, Robust Personal Trend Awareness, and Emergency Response Simulation Platform.**
>
> ⚠️ **HEALTHCARE SAFETY & RESEARCH PROTOTYPE DISCLAIMER**
> CardioLens AI is a hackathon research demonstration platform and software prototype. It is **NOT** an FDA-cleared, CE-marked medical device, diagnostic tool, or emergency dispatcher. Consumer wearable measurements (PPG, accelerometers, cuff monitors) cannot reliably diagnose cardiac disease, predict sudden cardiac arrest, or guarantee individual safety. If you or someone near you experiences chest tightness, acute breathlessness, or syncope, immediately dial **911** or your local emergency number.

---

## 1. Product Architecture & Overview

CardioLens AI bridges the gap between raw consumer wearable metrics and clinical oversight through three interconnected portals and an AI copilot:

1. **Patient Portal**: Continuous vital tracking (Resting Heart Rate, HRV RMSSD, Blood Pressure, Sleep Duration/Score, Daily Steps), calibrated 14-day Median Absolute Deviation (MAD) corridors, data completeness & sensor quality tracking, self-reported symptom journal with immediate safety triage, and doctor consultation prep.
2. **Caregiver / Emergency Response Portal**: Multi-channel simulated escalation receiver (SMS & Voice), real-time smartwatch prompt response status, wearer telemetry snapshots, and one-click acknowledgement.
3. **Hospital / Clinician Portal**: Role-protected EHR workspace with fictional clinical histories, prior outpatient encounters, laboratory panels, diagnostic alert evidence JSON inspection, prospective HL7 FHIR R4 exports, and formal clinical review note signing.
4. **Gemma 4 AI Copilot**: Ground-truth assistant panel powered by Google Gemma 4 (or deterministic template fallback) answering longitudinal inquiries without fabricating diagnoses.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript 5, Vite 6, Tailwind CSS 3, React Router 6, Recharts, React Hook Form, Zod, Lucide React.
- **Backend**: Python 3.12/3.13, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PostgreSQL / SQLite, Pandas, NumPy, scikit-learn (Isolation Forest).
- **AI Integration**: Google Gemma 4 server-side adapter with deterministic rule template fallback.
- **Interoperability**: Mock HL7 FHIR R4 Bundle exporter with standard LOINC codes.
- **Infrastructure**: Docker & Docker Compose, DigitalOcean App Platform specification (`.do/app.yaml`).

---

## 3. Quick Start & Execution Commands

### Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

### 1. Configure Environment Variables
```bash
cp .env.example .env
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Apply Migrations & Seed Demo Data
```bash
# Apply Alembic database migrations
alembic upgrade head

# Seed reproducible 4-patient fictional dataset
python -m app.data.seed_data
```

### 4. Start the Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at: `http://localhost:8000/api/v1/docs`

### 5. Frontend Setup & Launch
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. Automated Testing Suite

Run the full pytest suite (31 automated unit, integration, and E2E tests):
```bash
cd backend
python -m pytest -v tests
```

Test coverage includes:
- Telemetry validation, metric name checks, negative values rejection.
- Robust statistics (Median, MAD, percentiles), robust z-scores.
- Trend detection rules, duplicate alert prevention (within 48 hours), sensor gap detection.
- Emergency state machine (`prompted` ➔ `wearer_ok` / `escalated` / `timed_out` ➔ `acknowledged`).
- Idempotent notification creation for SMS and voice channels.
- Role-based access control (RBAC), unauthorized cross-patient data access rejection (403 Forbidden).
- Hospital report generation, clinician review signing, FHIR R4 exports.
- Gemma 4 Copilot deterministic template fallback.
- End-to-end simulated patient journey.

---

## 5. Fictional Demo Personas & Scenarios

Use the Persona dropdown in the application header to switch instantly:

| Persona | Role | Scenario Description |
|---|---|---|
| **Eleanor Vance** (`pat-001`) | Patient | 42F Control subject. Calibrated stable baseline, 98% telemetry completeness. |
| **Marcus Chen** (`pat-002`) | Patient | 58M Post-viral fatigue. Sustained resting HR elevation (+14 bpm) & suppressed HRV. Triggers advisory trend alert. |
| **Sofia Patel** (`pat-003`) | Patient | 29F Episodic presyncope. Active simulated fall/faint smartwatch prompt ready for live testing. |
| **Arthur Pendelton** (`pat-004`) | Patient | 68M Essential hypertension. Demonstrates &gt;20-hour sensor telemetry gap and data completeness warnings. |
| **David Vance** | Caregiver | Spouse / responder mode with simulated SMS dispatch logs and acknowledgement action. |
| **Dr. Rachel Adams** | Clinician | Cardiologist view in Hospital Portal with EHR records and report generation. |

*Default password for all demo accounts:* `Demo1234!`

---

## 6. API Reference (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status and prototype disclaimer |
| `POST` | `/auth/login` | Issues JWT token |
| `POST` | `/auth/demo-switch` | One-click demo persona switcher |
| `GET` | `/patients/{id}/summary` | Dashboard summary (latest vitals, quality, completeness) |
| `PUT` | `/patients/{id}/consent` | Updates caregiver/hospital/AI consent flags |
| `GET` | `/measurements` | Filtered measurement series by date and metric |
| `POST` | `/measurements/import-csv` | Import synthetic CSV telemetry file |
| `GET` | `/baselines/{id}/comparison`| Robust z-score comparisons against personal median |
| `POST` | `/alerts/evaluate` | Evaluates multi-day trend shifts against rules |
| `POST` | `/alerts/{id}/acknowledge` | Acknowledges active alert |
| `POST` | `/symptoms` | Logs symptom report with immediate triage guidance |
| `POST` | `/emergency/trigger` | Triggers simulated fall/faint smartwatch prompt |
| `POST` | `/emergency/events/{id}/respond` | Wearer submits "ok" (cancels) or "help" (escalates) |
| `POST` | `/emergency/events/{id}/timeout` | Countdown timeout handler (triggers caregiver dispatch) |
| `POST` | `/emergency/events/{id}/acknowledge` | Caregiver confirms receipt |
| `GET` | `/hospital/patients` | Fictional outpatient roster for clinicians |
| `GET` | `/hospital/patients/{id}/record` | Fictional medical history, prior visits, lab panels |
| `POST` | `/hospital/patients/{id}/review` | Signs clinician outpatient review |
| `GET` | `/hospital/patients/{id}/report` | Generates clinical consultation report |
| `GET` | `/hospital/patients/{id}/fhir` | Exports HL7 FHIR R4 Bundle |
| `POST` | `/copilot/query` | Structured Gemma 4 query with bounded evidence package |
| `POST` | `/demo/reset` | Factory reset demo database |

---

## 7. Docker & DigitalOcean Deployment

### Run with Docker Compose
```bash
docker-compose up --build
```
- Frontend: `http://localhost:80` (or `http://localhost:5173`)
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

### Deploying to DigitalOcean App Platform
1. Push repository to GitHub.
2. In DigitalOcean console, select **Apps** ➔ **Create App** ➔ **GitHub**.
3. Select this repository and branch `main`.
4. App Platform will automatically detect `.do/app.yaml` with:
   - Python Backend service with `/api/v1/health` check.
   - Node/Vite Static Site Frontend.
   - DigitalOcean Managed PostgreSQL database.
5. Add production `SECRET_KEY` in App Platform environment variables.

---

## 8. Safety & Compliance Limitations

- **Non-Diagnostic:** All rules, scores, and AI summaries are labeled as educational demonstration tools.
- **No Hallucinated Diagnoses:** Gemma 4 Copilot receives an explicit, bounded JSON evidence payload and is instructed never to fabricate medications, lab values, or risk percentages. If the AI model endpoint is unreachable, the system automatically uses a deterministic template engine.
- **Immediate Urgent Triage:** Symptoms such as chest discomfort or syncope trigger immediate red emergency guidance banners without requiring the user to complete a questionnaire.
