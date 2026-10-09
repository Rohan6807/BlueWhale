import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  RotateCcw,
  User,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { PatientConsent, AuditLogItem, Patient } from '../types';
import { PrototypeDisclaimer } from '../components/common/PrototypeDisclaimer';

export const SettingsPrivacyPage: React.FC = () => {
  const { activePatientId, currentPersona, switchPersona } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consent, setConsent] = useState<PatientConsent | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [resetting, setResetting] = useState<boolean>(false);
  const [updatingConsent, setUpdatingConsent] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadSettingsData = async () => {
    if (!activePatientId) return;
    try {
      const [pat, logs] = await Promise.all([
        api.getPatient(activePatientId),
        api.getAuditLogs(30),
      ]);
      setPatient(pat);
      setConsent(pat.consent || null);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, [activePatientId]);

  const handleToggleConsent = async (field: keyof PatientConsent, value: boolean) => {
    if (!activePatientId || !consent) return;
    try {
      setUpdatingConsent(true);
      const updated = await api.updateConsent(activePatientId, {
        [field]: value,
      });
      setConsent(updated);
      const logs = await api.getAuditLogs(30);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to update consent:', err);
    } finally {
      setUpdatingConsent(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset database to factory synthetic seed state? All active changes will be reset to defaults.')) {
      return;
    }
    try {
      setResetting(true);
      const res = await api.resetDemoData();
      setResetSuccess(res.message);
      await loadSettingsData();
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleExportData = async () => {
    if (!activePatientId) return;
    try {
      const data = await api.exportPatientData(activePatientId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cardiolens_${activePatientId}_telemetry_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Privacy, Consent &amp; System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Patient governance, granular sharing permissions, audit logs, and demo dataset lifecycle.
        </p>
      </div>

      {resetSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resetSuccess}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Patient Consent & Sharing Governance */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Patient Consent Directives</h3>
              <p className="text-[11px] text-slate-400">Governs role-based authorization in backend</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Caregiver Sharing Toggle */}
            <div className="flex items-start justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800">Caregiver Portal Access</span>
                <p className="text-slate-500 leading-normal">
                  Allows designated family members and emergency contacts to view live biometric summaries.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consent?.allow_caregiver_sharing ?? true}
                onChange={(e) => handleToggleConsent('allow_caregiver_sharing', e.target.checked)}
                disabled={updatingConsent}
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Hospital Sharing Toggle */}
            <div className="flex items-start justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800">Hospital &amp; EHR Integration</span>
                <p className="text-slate-500 leading-normal">
                  Permits attending cardiologists to correlate wearable trends with clinical medical history.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consent?.allow_hospital_sharing ?? true}
                onChange={(e) => handleToggleConsent('allow_hospital_sharing', e.target.checked)}
                disabled={updatingConsent}
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer mt-1"
              />
            </div>

            {/* AI Summarization Toggle */}
            <div className="flex items-start justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800">Gemma 4 Copilot Summarization</span>
                <p className="text-slate-500 leading-normal">
                  Enables bounded server-side AI explanations of wearable trajectories and alert evidence.
                </p>
              </div>
              <input
                type="checkbox"
                checked={consent?.allow_ai_summarization ?? true}
                onChange={(e) => handleToggleConsent('allow_ai_summarization', e.target.checked)}
                disabled={updatingConsent}
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>

        {/* Demo Data Management & Export */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Database className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Demo Data &amp; Lifecycle Controls</h3>
              <p className="text-[11px] text-slate-400">Research export and sandbox reset</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800">Export Complete Synthetic Dataset</span>
              <p className="text-slate-500 leading-normal">
                Download verified 14-day telemetry time series, computed baselines, alerts, and symptoms as standard JSON.
              </p>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Patient Telemetry (JSON)</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
              <span className="font-bold text-rose-950">Reset Demo Database</span>
              <p className="text-rose-800 leading-normal">
                Restores the 4 fictional patients (Eleanor, Marcus, Sofia, Arthur), resets baseline calibrations, and purges previous runs.
              </p>
              <button
                onClick={handleResetDemoData}
                disabled={resetting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Resetting...' : 'Factory Reset Demo Database'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Security &amp; Privacy Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400">Immutable compliance logging</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">User Email</th>
                <th className="py-2.5 px-3">Target Patient</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{log.user_email || 'System Session'}</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.target_patient_id || '—'}</td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                    {log.details_json ? JSON.stringify(log.details_json) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
