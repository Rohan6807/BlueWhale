import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  PlusCircle,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Symptom } from '../types';
import { PrototypeDisclaimer } from '../components/common/PrototypeDisclaimer';

const symptomSchema = z.object({
  symptom_type: z.string().min(1, 'Please select a symptom type'),
  severity: z.enum(['mild', 'moderate', 'severe']),
  onset_at: z.string().min(1, 'Please specify onset timestamp'),
  duration_minutes: z.coerce.number().min(1).max(10000).optional(),
  notes: z.string().max(1000).optional(),
});

type SymptomFormValues = z.infer<typeof symptomSchema>;

export const SymptomJournalPage: React.FC = () => {
  const { activePatientId } = useAuth();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedAlert, setSubmittedAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomSchema),
    defaultValues: {
      symptom_type: 'palpitations',
      severity: 'moderate',
      onset_at: new Date().toISOString().slice(0, 16),
      duration_minutes: 15,
      notes: '',
    },
  });

  const selectedType = watch('symptom_type');
  const selectedSeverity = watch('severity');

  const loadSymptoms = async () => {
    if (!activePatientId) return;
    try {
      setLoading(true);
      const data = await api.getSymptoms(activePatientId);
      setSymptoms(data);
    } catch (err) {
      console.error('Failed to load symptoms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSymptoms();
  }, [activePatientId]);

  const onSubmit = async (values: SymptomFormValues) => {
    if (!activePatientId) return;
    try {
      setSubmitting(true);
      const res = await api.logSymptom(activePatientId, {
        symptom_type: values.symptom_type,
        severity: values.severity,
        onset_at: new Date(values.onset_at).toISOString(),
        duration_minutes: values.duration_minutes,
        notes: values.notes,
      });
      setSymptoms((prev) => [res, ...prev]);
      if (res.urgent_guidance_displayed && res.urgent_guidance_message) {
        setSubmittedAlert(res.urgent_guidance_message);
      } else {
        setSubmittedAlert(null);
      }
      reset();
    } catch (err) {
      console.error('Failed to log symptom:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Immediate Pre-Submission Safety Check:
  // Immediately warns user if they select high-risk symptoms without waiting for form submission
  const isHighRiskSelected =
    selectedType === 'chest_discomfort' ||
    selectedType === 'fainting_near_fainting' ||
    (selectedType === 'breathlessness' && selectedSeverity === 'severe');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Symptom Journal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Capture self-reported sensations to correlate with wearable sensor time series.
          </p>
        </div>
      </div>

      {/* Immediate Real-Time Safety Warning Banner (Shown as soon as user selects high-risk symptom) */}
      {isHighRiskSelected && (
        <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-2xl flex items-start gap-3 shadow-md animate-in fade-in duration-200">
          <div className="p-2 bg-rose-600 rounded-xl text-white shrink-0 mt-0.5">
            <PhoneCall className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1 text-xs text-rose-950">
            <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              Immediate Urgent Clinical Guidance
              <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                Critical
              </span>
            </h4>
            <p className="leading-relaxed">
              You selected <strong>{selectedType.replace(/_/g, ' ').toUpperCase()}</strong>.
              If you or someone nearby is experiencing acute chest tightness, difficulty breathing, or sudden loss of consciousness,
              <strong> DO NOT wait to finish this entry. Call 911 (or local emergency services) immediately.</strong>
            </p>
          </div>
        </div>
      )}

      {/* Submission Success Alert */}
      {submittedAlert && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
          <strong className="block font-semibold">Post-Entry Clinical Recommendation:</strong>
          <p>{submittedAlert}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PlusCircle className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-slate-900 text-sm">Record New Symptom</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            {/* Symptom Type */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Symptom Type</label>
              <select
                {...register('symptom_type')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="palpitations">Palpitations (Racing/Skipped Beats)</option>
                <option value="dizziness">Dizziness / Lightheadedness</option>
                <option value="fainting_near_fainting">Fainting or Near-Fainting (Syncope)</option>
                <option value="chest_discomfort">Chest Discomfort / Tightness</option>
                <option value="breathlessness">Shortness of Breath</option>
                <option value="unusual_fatigue">Unusual Fatigue / Weakness</option>
                <option value="swelling">Swelling (Edema) in Legs/Feet</option>
                <option value="other">Other Sensation</option>
              </select>
              {errors.symptom_type && <p className="text-rose-600">{errors.symptom_type.message}</p>}
            </div>

            {/* Severity */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Perceived Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {(['mild', 'moderate', 'severe'] as const).map((sev) => (
                  <label
                    key={sev}
                    className={`py-2 px-3 border rounded-xl text-center cursor-pointer font-semibold capitalize transition-all ${
                      selectedSeverity === sev
                        ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input type="radio" value={sev} {...register('severity')} className="hidden" />
                    <span>{sev}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Onset Timestamp */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Onset Time</label>
              <input
                type="datetime-local"
                {...register('onset_at')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-hidden"
              />
              {errors.onset_at && <p className="text-rose-600">{errors.onset_at.message}</p>}
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Duration (Minutes)</label>
              <input
                type="number"
                placeholder="e.g. 15"
                {...register('duration_minutes')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-hidden"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Context / Activities</label>
              <textarea
                rows={3}
                placeholder="What were you doing when it occurred? (e.g. standing up quickly, climbing stairs)"
                {...register('notes')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-hidden resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Symptom Entry'}
            </button>
          </form>
        </div>

        {/* Historical Symptoms Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-sm">Symptom Log History ({symptoms.length})</h2>
            <span className="text-xs text-slate-400">Self-reported patient journal</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Symptom</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Onset</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Notes &amp; Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {symptoms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No symptoms logged yet. Use the form to record observations.
                    </td>
                  </tr>
                ) : (
                  symptoms.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 capitalize">
                        {s.symptom_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.severity === 'severe'
                              ? 'bg-rose-100 text-rose-800'
                              : s.severity === 'moderate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {s.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(s.onset_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {s.duration_minutes ? `${s.duration_minutes} min` : 'Unspecified'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs">
                        <p className="line-clamp-2">{s.notes || '—'}</p>
                        {s.urgent_guidance_displayed && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold mt-1 bg-rose-50 px-1.5 py-0.5 rounded-sm">
                            <AlertTriangle className="w-3 h-3" /> Urgent Guidance Displayed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
