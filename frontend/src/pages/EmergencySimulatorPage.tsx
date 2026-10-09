import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  PhoneCall,
  CheckCircle2,
  Clock,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldAlert,
  Send,
  UserCheck,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { EmergencyEvent, NotificationAttempt } from '../types';
import { SmartwatchPromptModal } from '../components/emergency/SmartwatchPromptModal';

export const EmergencySimulatorPage: React.FC = () => {
  const { activePatientId, user } = useAuth();
  const [activeEvent, setActiveEvent] = useState<EmergencyEvent | null>(null);
  const [history, setHistory] = useState<EmergencyEvent[]>([]);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(25);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const loadEventData = async () => {
    if (!activePatientId) return;
    try {
      const [act, hist] = await Promise.all([
        api.getActiveEmergency(activePatientId),
        api.getEmergencyEvents(activePatientId),
      ]);
      setActiveEvent(act);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to load emergency data:', err);
    }
  };

  useEffect(() => {
    loadEventData();
    const interval = setInterval(loadEventData, 4000);
    return () => clearInterval(interval);
  }, [activePatientId]);

  const handleTrigger = async () => {
    if (!activePatientId) return;
    try {
      setLoading(true);
      const ev = await api.triggerEmergency(activePatientId, 'simulated_fall_faint', timeoutSeconds);
      setActiveEvent(ev);
      setModalOpen(true);
      await loadEventData();
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWearerRespond = async (response: 'ok' | 'help') => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const updated = await api.submitWearerResponse(activeEvent.id, response);
      setActiveEvent(updated);
      await loadEventData();
    } catch (err) {
      console.error('Respond error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForceTimeout = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const updated = await api.timeoutEmergency(activeEvent.id);
      setActiveEvent(updated);
      await loadEventData();
    } catch (err) {
      console.error('Timeout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const updated = await api.acknowledgeEmergency(activeEvent.id, user?.full_name || 'Caregiver');
      setActiveEvent(updated);
      await loadEventData();
    } catch (err) {
      console.error('Ack error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Simulation Notice Top Banner */}
      <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-950 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-600 rounded-xl text-white font-black animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-rose-900">
              SIMULATED EMERGENCY DISPATCH SANDBOX
            </h4>
            <p className="text-rose-800">
              Demonstrates state machine transitions and multi-contact escalation. No live SMS, cellular calls, or 911 dispatches are made.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block font-mono bg-white px-3 py-1 rounded-lg border border-rose-200 text-rose-800 font-bold uppercase text-[10px]">
          Demo Protocol Active
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Simulator Canvas & State Machine */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Scenario Event Generator</h2>
                <p className="text-xs text-slate-500">
                  Trigger an acute fall/presyncope event to evaluate prompt responsiveness.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Timeout:</label>
                <select
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
                >
                  <option value={15}>15 Seconds (Rapid Demo)</option>
                  <option value={25}>25 Seconds (Standard Demo)</option>
                  <option value={45}>45 Seconds (Extended)</option>
                </select>

                <button
                  disabled={loading}
                  onClick={handleTrigger}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Trigger Fall Prompt</span>
                </button>
              </div>
            </div>

            {/* Quick State Overrides for Demo */}
            {activeEvent && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium mr-1">Direct State Actions:</span>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-semibold hover:bg-teal-100"
                >
                  Open Smartwatch Watchface
                </button>
                <button
                  onClick={() => handleWearerRespond('ok')}
                  className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold hover:bg-emerald-100"
                >
                  Simulate &quot;I&apos;m OK&quot;
                </button>
                <button
                  onClick={() => handleWearerRespond('help')}
                  className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-semibold hover:bg-rose-100"
                >
                  Simulate &quot;Need Help&quot;
                </button>
                <button
                  onClick={handleForceTimeout}
                  className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100"
                >
                  Simulate Timeout Expiry
                </button>
                <button
                  onClick={handleAcknowledge}
                  className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-semibold hover:bg-slate-200"
                >
                  Caregiver Acknowledge
                </button>
              </div>
            )}
          </div>

          {/* State Machine Transition Diagram */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Server State Machine Flow</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border transition-all ${
                  activeEvent?.status === 'prompted'
                    ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-rose-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase">State 1</span>
                  {activeEvent?.status === 'prompted' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                </div>
                <div className="font-semibold">Prompted</div>
                <p className="text-[10px] text-slate-500 mt-1">Smartwatch vibration countdown active</p>
              </div>

              <div
                className={`p-3 rounded-xl border transition-all ${
                  activeEvent?.status === 'wearer_ok'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase">State 2A</span>
                  {activeEvent?.status === 'wearer_ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="font-semibold">Wearer OK</div>
                <p className="text-[10px] text-slate-500 mt-1">Prompt dismissed, escalation cancelled</p>
              </div>

              <div
                className={`p-3 rounded-xl border transition-all ${
                  activeEvent?.status === 'escalated' || activeEvent?.status === 'timed_out'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase">State 2B</span>
                  {(activeEvent?.status === 'escalated' || activeEvent?.status === 'timed_out') && (
                    <PhoneCall className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  )}
                </div>
                <div className="font-semibold">Escalated / Timeout</div>
                <p className="text-[10px] text-slate-500 mt-1">Caregiver SMS/Voice dispatches created</p>
              </div>

              <div
                className={`p-3 rounded-xl border transition-all ${
                  activeEvent?.status === 'acknowledged' || activeEvent?.status === 'resolved'
                    ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase">State 3</span>
                  {(activeEvent?.status === 'acknowledged' || activeEvent?.status === 'resolved') && (
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  )}
                </div>
                <div className="font-semibold">Acknowledged</div>
                <p className="text-[10px] text-slate-500 mt-1">Caregiver confirmed receipt &amp; contact</p>
              </div>
            </div>
          </div>

          {/* Active Notifications Log */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Idempotent Notification Dispatch Log ({activeEvent?.notifications.length || 0})
              </h3>
              <span className="text-xs text-slate-400">Deterministic Simulated Delivery</span>
            </div>

            {(!activeEvent || activeEvent.notifications.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No notifications dispatched for current session. Trigger an event and allow timeout or select &quot;Need Help&quot;.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeEvent.notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-sm bg-slate-200 text-slate-800">
                          {n.channel}
                        </span>
                        <span className="font-semibold text-slate-800">
                          To: {n.contact_name || 'Caregiver'} ({n.contact_phone || 'Priority Contact'})
                        </span>
                        <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Delivered
                        </span>
                      </div>
                      <p className="text-slate-600 font-mono text-[11px] leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                        {n.message_content}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Key: {n.idempotent_key}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(n.delivery_timestamp).toLocaleTimeString()}
                      </span>
                      {n.acknowledged_at && (
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Acked by {n.acknowledged_by || 'Caregiver'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Past Events History */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Simulation Event Log</h3>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No historical runs recorded.</p>
              ) : (
                history.slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase text-[11px]">{ev.event_type}</span>
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-white border border-slate-200 uppercase">
                        {ev.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Wearer: {ev.wearer_response || 'None'}</span>
                      <span className="font-mono">{new Date(ev.triggered_at).toLocaleTimeString()}</span>
                    </div>
                    {ev.notifications.length > 0 && (
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        {ev.notifications.length} simulated alerts logged
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Smartwatch Watchface Modal */}
      <SmartwatchPromptModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={activeEvent}
        onEventUpdated={(updated) => {
          setActiveEvent(updated);
          loadEventData();
        }}
      />
    </div>
  );
};
