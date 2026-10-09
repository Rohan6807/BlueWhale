import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  Clock,
  Heart,
  Activity,
  Send,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { EmergencyEvent, Patient, MetricLatest } from '../types';
import { PrototypeDisclaimer } from '../components/common/PrototypeDisclaimer';

export const CaregiverPortalPage: React.FC = () => {
  const { activePatientId, user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeEvent, setActiveEvent] = useState<EmergencyEvent | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<MetricLatest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [acking, setAcking] = useState<boolean>(false);

  const loadCaregiverData = async () => {
    if (!activePatientId) return;
    try {
      setLoading(true);
      const [pat, ev, summary] = await Promise.all([
        api.getPatient(activePatientId),
        api.getActiveEmergency(activePatientId),
        api.getDashboardSummary(activePatientId),
      ]);
      setPatient(pat);
      setActiveEvent(ev);
      setRecentMetrics(summary.latest_metrics || []);
    } catch (err) {
      console.error('Failed to load caregiver portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaregiverData();
    const interval = setInterval(loadCaregiverData, 5000);
    return () => clearInterval(interval);
  }, [activePatientId]);

  const handleAcknowledge = async () => {
    if (!activeEvent) return;
    try {
      setAcking(true);
      const updated = await api.acknowledgeEmergency(
        activeEvent.id,
        user?.full_name || 'David Vance (Primary Caregiver)'
      );
      setActiveEvent(updated);
      await loadCaregiverData();
    } catch (err) {
      console.error('Ack error:', err);
    } finally {
      setAcking(false);
    }
  };

  const hasCaregiverConsent = patient?.consent?.allow_caregiver_sharing !== false;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Caregiver Emergency Portal</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Authorized Responder Mode
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring designated wearer: <strong>{patient?.display_name || 'Demo Patient'}</strong>
          </p>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Patient Consent: <strong>{hasCaregiverConsent ? 'Granted' : 'Revoked'}</strong></span>
        </div>
      </div>

      {!hasCaregiverConsent ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <Lock className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Caregiver Data Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The patient has disabled caregiver telemetry sharing in their Privacy Settings.
            Only unconfirmed emergency alerts will be routed.
          </p>
        </div>
      ) : (
        <>
          {/* Active Emergency Card */}
          {activeEvent && activeEvent.status !== 'resolved' && (
            <div
              className={`rounded-2xl border p-6 space-y-4 shadow-sm transition-all ${
                activeEvent.status === 'prompted' || activeEvent.status === 'timed_out' || activeEvent.status === 'escalated'
                  ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-600 text-white animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base capitalize">
                      {activeEvent.event_type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Triggered at: {new Date(activeEvent.triggered_at).toLocaleTimeString()} UTC
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-white border border-rose-200 text-rose-800">
                    Status: {activeEvent.status}
                  </span>
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-rose-200/60 space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Wearer Response</span>
                  <div className="font-bold text-slate-800 text-sm">
                    {activeEvent.wearer_response ? (
                      <span className="capitalize">{activeEvent.wearer_response}</span>
                    ) : (
                      <span className="text-rose-600 font-semibold">No Response (Timer Ticking)</span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-rose-200/60 space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Simulated Dispatches</span>
                  <div className="font-bold text-slate-800 text-sm">
                    {activeEvent.notifications.length} Multi-Channel Attempts
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-rose-200/60 space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Acknowledgement Status</span>
                  <div className="font-bold text-slate-800 text-sm">
                    {activeEvent.status === 'acknowledged' ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                      </span>
                    ) : (
                      <span className="text-amber-700">Pending Review</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Acknowledgement Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  Confirm that you have reached out to <strong>{patient?.display_name}</strong> to resolve this simulated prompt.
                </p>
                {activeEvent.status !== 'acknowledged' ? (
                  <button
                    disabled={acking}
                    onClick={handleAcknowledge}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                  >
                    {acking ? 'Acknowledging...' : 'Acknowledge Alert & Confirm Contact'}
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Response Logged
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Consented Vitals Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Consented Wearer Telemetry Snapshot</h3>
                <p className="text-xs text-slate-500">
                  Shared pursuant to patient&apos;s active consent directives.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Live Data Stream
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentMetrics.slice(0, 4).map((m) => (
                <div key={m.metric} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                    {m.metric.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-baseline gap-1 text-slate-900 font-bold text-lg">
                    <span>{m.numeric_value}</span>
                    <span className="text-xs text-slate-500 font-normal">{m.unit}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Quality: <strong>{m.quality}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Safe Escalation Guidance Card */}
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-3">
            <PhoneCall className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900 text-sm">Emergency Escalation Guidelines</h4>
              <p className="leading-relaxed">
                If the wearer requested help or does not answer direct phone calls, proceed to check on them in person.
                If you suspect an acute medical event, severe injury, or sudden loss of responsiveness,
                <strong> dial 911 immediately</strong>. Do not rely exclusively on wearable applications for medical triage.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
