import {
  AuthToken,
  User,
  Patient,
  PatientDashboardSummary,
  Measurement,
  DailyAggregate,
  PersonalBaseline,
  BaselineComparisonResponse,
  Alert,
  Symptom,
  EmergencyEvent,
  EmergencyContact,
  NotificationAttempt,
  HospitalPatientListItem,
  HospitalRecord,
  ClinicianReview,
  ClinicalReport,
  CopilotQueryResponse,
  AuditLogItem,
  PatientConsent,
} from '../types';

const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('cardiolens_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'Network request failed';
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch {
      errorDetail = `${res.status} ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthToken> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthToken>(res);
  },

  async signup(fullName: string, email: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password }),
    });
    return handleResponse<User>(res);
  },

  async forgotPassword(email: string): Promise<{ message: string; demo_hint?: string; reset_token?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async resetPassword(email: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, new_password: newPassword }),
    });
    return handleResponse(res);
  },

  async logout(): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      return handleResponse(res);
    } catch {
      return { message: 'Logged out' };
    }
  },

  async switchDemoPersona(persona: string): Promise<AuthToken> {
    const res = await fetch(`${API_BASE}/auth/demo-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona }),
    });
    return handleResponse<AuthToken>(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader(),
    });
    return handleResponse<User>(res);
  },

  // Patients
  async getMyPatientProfile(): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/me`, {
      headers: getAuthHeader(),
    });
    return handleResponse<Patient>(res);
  },

  async getPatient(patientId: string): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<Patient>(res);
  },

  async getDashboardSummary(patientId: string): Promise<PatientDashboardSummary> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/summary`, {
      headers: getAuthHeader(),
    });
    return handleResponse<PatientDashboardSummary>(res);
  },

  async updateConsent(patientId: string, consent: Partial<PatientConsent>): Promise<PatientConsent> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/consent`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(consent),
    });
    return handleResponse<PatientConsent>(res);
  },

  // Measurements
  async getMeasurements(patientId: string, metric?: string, limit = 200): Promise<Measurement[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/measurements`);
    url.searchParams.set('patient_id', patientId);
    if (metric) url.searchParams.set('metric', metric);
    url.searchParams.set('limit', limit.toString());

    const res = await fetch(url.toString(), {
      headers: getAuthHeader(),
    });
    return handleResponse<Measurement[]>(res);
  },

  async getDailyAggregates(patientId: string, metric: string, days = 14): Promise<DailyAggregate[]> {
    const res = await fetch(
      `${API_BASE}/measurements/daily-aggregates?patient_id=${patientId}&metric=${metric}&days=${days}`,
      { headers: getAuthHeader() }
    );
    return handleResponse<DailyAggregate[]>(res);
  },

  async createMeasurement(patientId: string, data: Partial<Measurement>): Promise<Measurement> {
    const res = await fetch(`${API_BASE}/measurements?patient_id=${patientId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Measurement>(res);
  },

  async importCsv(patientId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/measurements/import-csv?patient_id=${patientId}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    return handleResponse(res);
  },

  // Baselines
  async getBaselines(patientId: string): Promise<PersonalBaseline[]> {
    const res = await fetch(`${API_BASE}/baselines/${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<PersonalBaseline[]>(res);
  },

  async getBaselineComparison(patientId: string): Promise<BaselineComparisonResponse> {
    const res = await fetch(`${API_BASE}/baselines/${patientId}/comparison`, {
      headers: getAuthHeader(),
    });
    return handleResponse<BaselineComparisonResponse>(res);
  },

  async recalculateBaselines(patientId: string, windowDays = 14): Promise<PersonalBaseline[]> {
    const res = await fetch(`${API_BASE}/baselines/${patientId}/recalculate?window_days=${windowDays}`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<PersonalBaseline[]>(res);
  },

  async getExperimentalAnomalyScore(patientId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/baselines/${patientId}/experimental-anomaly-score`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Alerts
  async getAlerts(patientId: string, status?: string): Promise<Alert[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/alerts`);
    url.searchParams.set('patient_id', patientId);
    if (status) url.searchParams.set('status', status);

    const res = await fetch(url.toString(), {
      headers: getAuthHeader(),
    });
    return handleResponse<Alert[]>(res);
  },

  async evaluateAlerts(patientId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/alerts/evaluate?patient_id=${patientId}`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<Alert> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    });
    return handleResponse<Alert>(res);
  },

  // Symptoms
  async getSymptoms(patientId: string): Promise<Symptom[]> {
    const res = await fetch(`${API_BASE}/symptoms?patient_id=${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<Symptom[]>(res);
  },

  async logSymptom(patientId: string, symptom: Partial<Symptom>): Promise<Symptom> {
    const res = await fetch(`${API_BASE}/symptoms?patient_id=${patientId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(symptom),
    });
    return handleResponse<Symptom>(res);
  },

  // Emergency simulation
  async getActiveEmergency(patientId: string): Promise<EmergencyEvent | null> {
    const res = await fetch(`${API_BASE}/emergency/active?patient_id=${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<EmergencyEvent | null>(res);
  },

  async getEmergencyEvents(patientId: string): Promise<EmergencyEvent[]> {
    const res = await fetch(`${API_BASE}/emergency/events?patient_id=${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<EmergencyEvent[]>(res);
  },

  async triggerEmergency(patientId: string, eventType = 'simulated_fall_faint', timeoutSec = 25): Promise<EmergencyEvent> {
    const res = await fetch(`${API_BASE}/emergency/trigger?patient_id=${patientId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ event_type: eventType, simulated_timeout_seconds: timeoutSec }),
    });
    return handleResponse<EmergencyEvent>(res);
  },

  async submitWearerResponse(eventId: string, response: 'ok' | 'help'): Promise<EmergencyEvent> {
    const res = await fetch(`${API_BASE}/emergency/events/${eventId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ response }),
    });
    return handleResponse<EmergencyEvent>(res);
  },

  async timeoutEmergency(eventId: string): Promise<EmergencyEvent> {
    const res = await fetch(`${API_BASE}/emergency/events/${eventId}/timeout`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<EmergencyEvent>(res);
  },

  async acknowledgeEmergency(eventId: string, acknowledgedBy: string): Promise<EmergencyEvent> {
    const res = await fetch(`${API_BASE}/emergency/events/${eventId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    });
    return handleResponse<EmergencyEvent>(res);
  },

  async getEmergencyContacts(patientId: string): Promise<EmergencyContact[]> {
    const res = await fetch(`${API_BASE}/emergency/contacts?patient_id=${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<EmergencyContact[]>(res);
  },

  async getNotificationLogs(patientId: string): Promise<NotificationAttempt[]> {
    const res = await fetch(`${API_BASE}/emergency/notifications?patient_id=${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<NotificationAttempt[]>(res);
  },

  // Hospital Portal
  async getHospitalPatients(): Promise<HospitalPatientListItem[]> {
    const res = await fetch(`${API_BASE}/hospital/patients`, {
      headers: getAuthHeader(),
    });
    return handleResponse<HospitalPatientListItem[]>(res);
  },

  async getHospitalRecord(patientId: string): Promise<HospitalRecord> {
    const res = await fetch(`${API_BASE}/hospital/patients/${patientId}/record`, {
      headers: getAuthHeader(),
    });
    return handleResponse<HospitalRecord>(res);
  },

  async submitClinicianReview(patientId: string, reviewNotes: string, recommendedAction: string, alertId?: string): Promise<ClinicianReview> {
    const res = await fetch(`${API_BASE}/hospital/patients/${patientId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ review_notes: reviewNotes, recommended_action: recommendedAction, alert_id: alertId }),
    });
    return handleResponse<ClinicianReview>(res);
  },

  async getClinicianReviews(patientId: string): Promise<ClinicianReview[]> {
    const res = await fetch(`${API_BASE}/hospital/patients/${patientId}/reviews`, {
      headers: getAuthHeader(),
    });
    return handleResponse<ClinicianReview[]>(res);
  },

  async generateClinicalReport(patientId: string): Promise<ClinicalReport> {
    const res = await fetch(`${API_BASE}/hospital/patients/${patientId}/report`, {
      headers: getAuthHeader(),
    });
    return handleResponse<ClinicalReport>(res);
  },

  async getFhirBundle(patientId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/hospital/patients/${patientId}/fhir`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  // Gemma 4 Copilot
  async queryCopilot(patientId: string, queryType: string, customQuestion?: string, alertId?: string): Promise<CopilotQueryResponse> {
    const res = await fetch(`${API_BASE}/copilot/query?patient_id=${patientId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ query_type: queryType, custom_question: customQuestion, alert_id: alertId }),
    });
    return handleResponse<CopilotQueryResponse>(res);
  },

  // Demo management
  async resetDemoData(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/reset`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },

  async getAuditLogs(limit = 50): Promise<AuditLogItem[]> {
    const res = await fetch(`${API_BASE}/demo/audit-logs?limit=${limit}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<AuditLogItem[]>(res);
  },

  async getDemoStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/status`);
    return handleResponse(res);
  },

  async exportPatientData(patientId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/export/${patientId}`, {
      headers: getAuthHeader(),
    });
    return handleResponse(res);
  },
};
