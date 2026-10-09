export type UserRole = 'patient' | 'caregiver' | 'clinician' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  patient_id?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  role: UserRole;
  patient_id?: string;
  full_name: string;
}

export interface PatientConsent {
  id: string;
  patient_id: string;
  allow_caregiver_sharing: boolean;
  allow_hospital_sharing: boolean;
  allow_ai_summarization: boolean;
  consent_updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  display_name: string;
  date_of_birth?: string;
  biological_sex?: string;
  baseline_status: string;
  emergency_mode: boolean;
  created_at: string;
  consent?: PatientConsent;
}

export interface MetricLatest {
  metric: string;
  numeric_value: number;
  unit: string;
  measured_at: string;
  source: string;
  quality: string;
  change_vs_baseline_percent?: number;
  baseline_median?: number;
  status: 'normal' | 'elevated' | 'suppressed' | 'caution';
}

export interface PatientDashboardSummary {
  patient_id: string;
  display_name: string;
  baseline_status: string;
  emergency_mode: boolean;
  latest_metrics: MetricLatest[];
  sensor_quality_score: number;
  data_completeness_score: number;
  active_alerts_count: number;
  last_synced_at?: string;
  disclaimer: string;
}

export interface Measurement {
  id: string;
  patient_id: string;
  metric: string;
  numeric_value: number;
  unit: string;
  measured_at: string;
  source: string;
  quality: string;
  created_at: string;
}

export interface DailyAggregate {
  date: string;
  metric: string;
  mean: number;
  min: number;
  max: number;
  count: number;
}

export interface PersonalBaseline {
  id: string;
  patient_id: string;
  metric: string;
  median_value: number;
  mad_value: number;
  p10_value: number;
  p90_value: number;
  window_days: number;
  sample_count: number;
  computed_at: string;
}

export interface BaselineComparisonItem {
  metric: string;
  unit: string;
  current_value: number;
  baseline_median: number;
  baseline_mad: number;
  deviation_score: number;
  status: 'within_normal_baseline' | 'mild_deviation' | 'significant_deviation' | 'insufficient_baseline';
  interpretation: string;
}

export interface BaselineComparisonResponse {
  patient_id: string;
  comparisons: BaselineComparisonItem[];
  computed_at: string;
  disclaimer: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  category: string;
  severity: string;
  status: 'new' | 'acknowledged' | 'resolved';
  rule_id: string;
  explanation: string;
  evidence_json: Record<string, any>;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface Symptom {
  id: string;
  patient_id: string;
  symptom_type: string;
  severity: 'mild' | 'moderate' | 'severe';
  onset_at: string;
  duration_minutes?: number;
  notes?: string;
  urgent_guidance_displayed: boolean;
  urgent_guidance_message?: string;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  relationship_type: string;
  phone_number: string;
  email: string;
  priority_order: number;
  is_active: boolean;
}

export interface NotificationAttempt {
  id: string;
  emergency_event_id: string;
  contact_id?: string;
  contact_name?: string;
  contact_phone?: string;
  channel: 'sms' | 'automated_voice' | 'email' | 'push';
  status: 'queued' | 'delivered' | 'failed';
  message_content: string;
  delivery_timestamp: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  idempotent_key: string;
  created_at: string;
}

export interface EmergencyEvent {
  id: string;
  patient_id: string;
  event_type: string;
  status: 'prompted' | 'wearer_ok' | 'escalated' | 'timed_out' | 'acknowledged' | 'resolved';
  triggered_at: string;
  responded_at?: string;
  wearer_response?: string;
  simulated_timeout_seconds: number;
  cancellation_reason?: string;
  created_at: string;
  notifications: NotificationAttempt[];
}

export interface HospitalPatientListItem {
  patient_id: string;
  display_name: string;
  mrn: string;
  date_of_birth?: string;
  condition_summary: string;
  primary_physician: string;
  baseline_status: string;
  active_alerts_count: number;
  unreviewed_symptoms_count: number;
  latest_hr?: number;
  latest_hrv?: number;
  last_reading_time?: string;
}

export interface HospitalRecord {
  id: string;
  patient_id: string;
  mrn: string;
  primary_physician: string;
  hospital_unit: string;
  condition_summary: string;
  clinical_history_json: {
    diagnoses?: string[];
    medications?: string[];
    allergies?: string[];
  };
  prior_visits_json: Array<{
    date: string;
    provider: string;
    reason: string;
    findings: string;
  }>;
  lab_summaries_json: Array<{
    test_name: string;
    value: string;
    unit: string;
    status: string;
  }>;
  updated_at: string;
}

export interface ClinicianReview {
  id: string;
  patient_id: string;
  clinician_id?: string;
  clinician_name?: string;
  alert_id?: string;
  review_notes: string;
  recommended_action: string;
  reviewed_at: string;
}

export interface ClinicalReport {
  report_id: string;
  patient_id: string;
  display_name: string;
  mrn: string;
  generated_at: string;
  clinician_author: string;
  baseline_summary: Record<string, any>;
  trend_analysis: Record<string, any>;
  symptom_log_summary: any[];
  alert_history_summary: any[];
  data_quality_assessment: Record<string, any>;
  safety_disclaimer: string;
}

export interface CopilotQueryResponse {
  query_type: string;
  response_markdown: string;
  evidence_package: Record<string, any>;
  is_ai_generated: boolean;
  model_identifier: string;
  generated_at: string;
  safety_disclaimer: string;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  target_patient_id?: string;
  details_json?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}
