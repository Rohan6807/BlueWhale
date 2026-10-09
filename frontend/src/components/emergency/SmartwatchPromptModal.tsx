import React, { useState, useEffect, useRef } from 'react';
import { AlertOctagon, CheckCircle2, PhoneCall, Volume2, VolumeX, Watch } from 'lucide-react';
import { EmergencyEvent } from '../../types';
import { api } from '../../api/client';

interface Props {
  event: EmergencyEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: (updated: EmergencyEvent) => void;
}

export const SmartwatchPromptModal: React.FC<Props> = ({ event, isOpen, onClose, onEventUpdated }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play synthetic audio chime
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  useEffect(() => {
    if (!isOpen || !event || event.status !== 'prompted') return;

    // Calculate remaining seconds based on triggered_at and timeout
    const triggered = new Date(event.triggered_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - triggered) / 1000);
    const initialSec = Math.max(0, (event.simulated_timeout_seconds || 25) - elapsed);
    setSecondsRemaining(initialSec);

    playChime();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        if (prev % 3 === 0) {
          playChime();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, event?.id, event?.status]);

  const handleTimeout = async () => {
    if (!event || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const updated = await api.timeoutEmergency(event.id);
      onEventUpdated(updated);
    } catch (err) {
      console.error('Error timing out event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResponse = async (response: 'ok' | 'help') => {
    if (!event || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const updated = await api.submitWearerResponse(event.id, response);
      onEventUpdated(updated);
      if (response === 'ok') {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      console.error('Failed to submit wearer response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !event) return null;

  const isPromptActive = event.status === 'prompted' && secondsRemaining > 0;
  const isOk = event.status === 'wearer_ok';
  const isEscalated = event.status === 'escalated' || event.status === 'timed_out';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Simulation Banner */}
        <div className="bg-rose-600 px-4 py-2.5 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Simulated Emergency Response Event</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-white/80 hover:text-white p-1 rounded"
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        <div className="p-6">
          {/* Smartwatch Simulator Visual Frame */}
          <div className="flex justify-center mb-6">
            <div
              className={`relative w-64 h-64 rounded-full bg-slate-900 border-8 border-slate-700 shadow-2xl p-4 flex flex-col items-center justify-center text-white ${
                isPromptActive ? 'animate-vibrate ring-4 ring-rose-500/50' : ''
              }`}
            >
              {/* Watch Glass Highlights */}
              <div className="absolute inset-2 rounded-full border border-slate-600/30 pointer-events-none" />

              {isPromptActive && (
                <>
                  <div className="p-2.5 rounded-full bg-rose-500/20 text-rose-400 mb-2 animate-bounce">
                    <AlertOctagon className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold tracking-wide uppercase text-rose-300">Hard Fall / Faint?</h4>
                  <p className="text-[11px] text-slate-300 text-center px-4 mt-1">Smartwatch vibration prompt active</p>

                  {/* Countdown Progress Circle */}
                  <div className="mt-3 flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                    <span className="text-xs text-slate-400">Escalating in:</span>
                    <span className="text-base font-bold text-rose-400 tabular-nums">{secondsRemaining}s</span>
                  </div>
                </>
              )}

              {isOk && (
                <>
                  <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-sm font-bold tracking-wide text-emerald-300">Wearer Confirmed Safe</h4>
                  <p className="text-[11px] text-slate-300 text-center px-2 mt-1">Escalation cancelled.</p>
                </>
              )}

              {isEscalated && (
                <>
                  <div className="p-3 rounded-full bg-amber-500/20 text-amber-400 mb-2 animate-pulse">
                    <PhoneCall className="w-10 h-10" />
                  </div>
                  <h4 className="text-sm font-bold tracking-wide text-amber-300">Caregiver Escalation</h4>
                  <p className="text-[11px] text-slate-300 text-center px-2 mt-1">
                    {event.status === 'timed_out' ? 'No response timeout' : 'Help requested by wearer'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Action Prompt */}
          {isPromptActive && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleResponse('ok')}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  I'm Okay
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleResponse('help')}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  Need Help
                </button>
              </div>
              <p className="text-[11px] text-center text-slate-500 leading-relaxed">
                Visual & acoustic simulation only. Real-time fall detection requires dedicated hardware sensors.
                No actual 911 calls or SMS messages are dispatched.
              </p>
            </div>
          )}

          {/* Post-Response Info */}
          {!isPromptActive && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>State Machine Status:</span>
                  <strong className="text-slate-900 font-mono uppercase">{event.status}</strong>
                </div>
                {event.wearer_response && (
                  <div className="flex justify-between text-slate-600">
                    <span>Wearer Response:</span>
                    <strong className="text-slate-900">{event.wearer_response}</strong>
                  </div>
                )}
                {event.notifications.length > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Simulated Notifications:</span>
                    <span className="text-emerald-700 font-semibold">{event.notifications.length} queued/delivered</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close Simulator
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
