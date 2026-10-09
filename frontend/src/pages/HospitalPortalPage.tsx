import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ClipboardList,
  FileCheck,
  Send,
  Database,
  ExternalLink,
  Printer,
  X,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  HospitalPatientListItem,
  HospitalRecord,
  ClinicianReview,
  ClinicalReport,
  Alert,
  Symptom,
} from '../types';
import { PrototypeDisclaimer } from '../components/common/PrototypeDisclaimer';

export const HospitalPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<HospitalPatientListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-001');
  const [hospitalRecord, setHospitalRecord] = useState<HospitalRecord | null>(null);
  const [reviews, setReviews] = useState<ClinicianReview[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [fhirBundle, setFhirBundle] = useState<any>(null);
  const [reportModal, setReportModal] = useState<ClinicalReport | null>(null);
  const [activeTab, setActiveTab] = useState<'ehr' | 'telemetry' | 'symptoms' | 'review' | 'fhir'>('ehr');

  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [recommendedAction, setRecommendedAction] = useState<string>('routine_followup');
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const pts = await api.getHospitalPatients();
      setPatients(pts);

      if (selectedPatientId) {
        await loadPatientDetails(selectedPatientId);
      }
    } catch (err) {
      console.error('Failed to load hospital portal:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (pId: string) => {
    try {
      const [rec, rev, alr, sym, fhir] = await Promise.all([
        api.getHospitalRecord(pId),
        api.getClinicianReviews(pId),
        api.getAlerts(pId),
        api.getSymptoms(pId),
        api.getFhirBundle(pId),
      ]);
      setHospitalRecord(rec);
      setReviews(rev);
      setAlerts(alr);
      setSymptoms(sym);
      setFhirBundle(fhir);
    } catch (err) {
      console.error('Failed to load patient record:', err);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const handleSelectPatient = (pId: string) => {
    setSelectedPatientId(pId);
    loadPatientDetails(pId);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNotes.trim() || !selectedPatientId) return;
    try {
      setSubmittingReview(true);
      const newReview = await api.submitClinicianReview(selectedPatientId, reviewNotes, recommendedAction);
      setReviews((prev) => [newReview, ...prev]);
      setReviewNotes('');
    } catch (err) {
      console.error('Failed to submit clinician review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedPatientId) return;
    try {
      const rpt = await api.generateClinicalReport(selectedPatientId);
      setReportModal(rpt);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const selectedPatient = patients.find((p) => p.patient_id === selectedPatientId);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinician Outpatient Suite</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Role: Cardiologist (Physician View)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Signed in as: <strong>{user?.full_name || 'Dr. Rachel Adams, MD'}</strong> · Fictional Clinical Database
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Printer className="w-4 h-4 text-teal-400" />
          <span>Generate Clinical Consultation Report</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Patient Roster */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-2 pt-1">
            <h2 className="font-bold text-slate-900 text-sm">Ambulatory Roster ({patients.length})</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRN Encrypted</span>
          </div>

          <div className="space-y-2">
            {patients.map((p) => {
              const isSelected = p.patient_id === selectedPatientId;
              return (
                <div
                  key={p.patient_id}
                  onClick={() => handleSelectPatient(p.patient_id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-500 ring-1 ring-teal-500/20 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{p.display_name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">{p.mrn}</p>
                    </div>
                    {p.active_alerts_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {p.active_alerts_count} Alert
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1 mt-1">{p.condition_summary}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Selected Patient Record & Multi-Tab View */}
        <div className="lg:col-span-8 space-y-4">
          {/* Patient Overview EHR Banner */}
          {selectedPatient && hospitalRecord && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedPatient.display_name}</h2>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      MRN: {hospitalRecord.mrn}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unit: {hospitalRecord.hospital_unit} · Physician: {hospitalRecord.primary_physician}
                  </p>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Indication</span>
                  <span className="font-semibold text-slate-800">{hospitalRecord.condition_summary}</span>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2 text-xs">
                {[
                  { key: 'ehr', label: 'Clinical History & Labs' },
                  { key: 'telemetry', label: `Wearable Alerts (${alerts.length})` },
                  { key: 'symptoms', label: `Symptoms (${symptoms.length})` },
                  { key: 'review', label: `Clinician Reviews (${reviews.length})` },
                  { key: 'fhir', label: 'HL7 FHIR R4 Export' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      activeTab === t.key
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Clinical History & Labs */}
              {activeTab === 'ehr' && (
                <div className="space-y-4 text-xs">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase text-[10px]">Active Diagnoses</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        {hospitalRecord.clinical_history_json?.diagnoses?.map((d, i) => (
                          <li key={i}>{d}</li>
                        )) || <li>None recorded</li>}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase text-[10px]">Active Medications</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        {hospitalRecord.clinical_history_json?.medications?.map((m, i) => (
                          <li key={i}>{m}</li>
                        )) || <li>None recorded</li>}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase text-[10px]">Allergies</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        {hospitalRecord.clinical_history_json?.allergies?.map((a, i) => (
                          <li key={i}>{a}</li>
                        )) || <li>None recorded</li>}
                      </ul>
                    </div>
                  </div>

                  {/* Prior Outpatient Clinic Visits */}
                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-slate-800 text-xs block">Documented Outpatient Encounters</span>
                    {hospitalRecord.prior_visits_json?.map((v, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{v.reason}</span>
                          <span className="font-mono text-slate-500">{v.date}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{v.findings}</p>
                      </div>
                    ))}
                  </div>

                  {/* Hospital Lab Assays */}
                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-slate-800 text-xs block">Recent Diagnostic Lab Panels</span>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {hospitalRecord.lab_summaries_json?.map((l, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">{l.test_name}</span>
                          <div className="font-bold text-slate-900 text-sm">
                            {l.value} <span className="text-xs font-normal text-slate-500">{l.unit}</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold">{l.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Wearable Alerts & Evidence */}
              {activeTab === 'telemetry' && (
                <div className="space-y-3 text-xs">
                  {alerts.length === 0 ? (
                    <p className="text-center py-8 text-slate-400">No active alerts generated.</p>
                  ) : (
                    alerts.map((a) => (
                      <div key={a.id} className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm uppercase">
                            {a.category.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-sm border border-slate-200">
                            {a.rule_id}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{a.explanation}</p>
                        <div className="p-2.5 bg-slate-900 rounded-lg text-teal-300 font-mono text-[10px] overflow-x-auto">
                          {JSON.stringify(a.evidence_json, null, 2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Symptoms Timeline */}
              {activeTab === 'symptoms' && (
                <div className="space-y-2 text-xs">
                  {symptoms.length === 0 ? (
                    <p className="text-center py-8 text-slate-400">No self-reported symptoms on file.</p>
                  ) : (
                    symptoms.map((s) => (
                      <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 capitalize">
                              {s.symptom_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-slate-200 text-slate-700 uppercase">
                              {s.severity}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1">{s.notes || 'No extra notes'}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {new Date(s.onset_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Clinician Review & Orders */}
              {activeTab === 'review' && (
                <div className="space-y-4 text-xs">
                  <form onSubmit={handleSubmitReview} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs">Record Formal Outpatient Review Note</h4>
                    <textarea
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Clinical impressions based on review of wearable trends, baseline shifts, and reported symptoms..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden text-xs resize-none"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label className="font-semibold text-slate-700">Recommended Next Step:</label>
                        <select
                          value={recommendedAction}
                          onChange={(e) => setRecommendedAction(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs"
                        >
                          <option value="routine_followup">Routine Follow-up in 3 Months</option>
                          <option value="schedule_telehealth">Schedule Telehealth Check-In</option>
                          <option value="order_holter_monitor">Order 24h/48h Holter Patch Monitor</option>
                          <option value="in_person_eval">Immediate In-Person Clinic Evaluation</option>
                          <option value="no_action_needed">Continue Baseline Monitoring (No Action)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingReview || !reviewNotes.trim()}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors"
                      >
                        {submittingReview ? 'Signing...' : 'Sign & Record Clinical Review'}
                      </button>
                    </div>
                  </form>

                  {/* Past Review Log */}
                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-slate-800 text-xs block">Historical Clinical Reviews</span>
                    {reviews.map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{r.clinician_name || 'Dr. Staff Physician'}</span>
                          <span className="font-mono text-slate-400">{new Date(r.reviewed_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700">{r.review_notes}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          Action: {r.recommended_action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: HL7 FHIR R4 Export */}
              {activeTab === 'fhir' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Prospective HL7 FHIR R4 Bundle</h4>
                      <p className="text-[11px] text-slate-500">
                        Standards-compliant structure mapped to LOINC codes for interoperability with Epic/Cerner EHRs.
                      </p>
                    </div>
                  </div>
                  <pre className="p-4 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-96">
                    {JSON.stringify(fhirBundle, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Printable Clinical Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
                  Clinical Consultation Summary
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  CardioLens Ambulatory Telemetry Report
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Report ID: {reportModal.report_id} · Generated: {new Date(reportModal.generated_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setReportModal(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Patient Name</span>
                  <span className="text-slate-900 font-bold text-sm">{reportModal.display_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Medical Record No.</span>
                  <span className="text-slate-900 font-mono font-bold text-sm">{reportModal.mrn}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Baseline Trajectories &amp; Observed Shifts</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  {Object.entries(reportModal.trend_analysis || {}).map(([metric, data]: any) => (
                    <div key={metric} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="font-bold text-slate-900 block capitalize">{metric.replace(/_/g, ' ')}</span>
                      <span>Reading: {data.latest_value} {data.unit}</span>
                      <span className="block text-slate-500">Delta: {data.diff_from_baseline > 0 ? `+${data.diff_from_baseline}` : data.diff_from_baseline}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Active Wearer Alerts</h4>
                {reportModal.alert_history_summary?.length === 0 ? (
                  <p className="text-slate-500">No active alerts recorded.</p>
                ) : (
                  reportModal.alert_history_summary.map((a, i) => (
                    <div key={i} className="p-2 rounded-lg bg-amber-50 border border-amber-200 mb-1">
                      <strong>{a.category.replace(/_/g, ' ')}:</strong> {a.explanation}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                <strong>Safety Disclaimer:</strong> {reportModal.safety_disclaimer}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setReportModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
