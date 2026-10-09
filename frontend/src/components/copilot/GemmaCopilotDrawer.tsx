import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, Send, AlertTriangle, ShieldCheck, Database, Loader2, Bot } from 'lucide-react';
import { api } from '../../api/client';
import { CopilotQueryResponse } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

const PRESET_QUERIES = [
  { label: 'Weekly Trends Analysis', type: 'trends_summary', prompt: 'What changed in my health trends this week?' },
  { label: 'Alert Evidence Breakdown', type: 'alert_explanation', prompt: 'Why was this alert generated?' },
  { label: 'Recent Measurements Summary', type: 'measurements_summary', prompt: 'Summarize my recent measurements.' },
  { label: 'Doctor Appointment Prep', type: 'doctor_prep', prompt: 'Prepare a report for my next doctor appointment.' },
  { label: 'Clinical History Summary', type: 'history_summary', prompt: 'Summarize the relevant demo patient history.' },
];

export const GemmaCopilotDrawer: React.FC<Props> = ({ isOpen, onClose, patientId, patientName }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<CopilotQueryResponse | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [showEvidence, setShowEvidence] = useState<boolean>(false);
  const [activeQueryType, setActiveQueryType] = useState<string>('trends_summary');

  if (!isOpen) return null;

  const handleQuery = async (queryType: string, customText?: string) => {
    try {
      setLoading(true);
      setActiveQueryType(queryType);
      const res = await api.queryCopilot(patientId, queryType, customText);
      setResponse(res);
    } catch (err: any) {
      console.error('Copilot query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || loading) return;
    handleQuery('custom', customQuestion);
    setCustomQuestion('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">Gemma 4 Health Copilot</h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Research AI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ground-truth trend explanations for <strong>{patientName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Query Selector Pills */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Structured Evidence Inquiries
            </h4>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.map((q) => (
                <button
                  key={q.type}
                  disabled={loading}
                  onClick={() => handleQuery(q.type)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
                    activeQueryType === q.type && response
                      ? 'border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{q.label}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Model Status Pill */}
          {response && (
            <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-teal-600" />
                <span>Engine: <strong>{response.model_identifier}</strong></span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                response.is_ai_generated ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {response.is_ai_generated ? 'Gemma 4 Live' : 'Deterministic Rule Engine'}
              </span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
              <p className="text-xs font-medium">Extracting verified evidence & computing trend deltas...</p>
            </div>
          )}

          {/* Response Container */}
          {!loading && response && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {response.response_markdown}
              </div>

              {/* Evidence Inspector Accordion */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="w-full px-4 py-2.5 bg-slate-100/70 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    Structured Evidence Package Inspector (Bounded Input)
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{showEvidence ? 'Hide' : 'Inspect JSON'}</span>
                </button>
                {showEvidence && (
                  <pre className="p-4 bg-slate-900 text-teal-300 text-[11px] font-mono overflow-x-auto max-h-72">
                    {JSON.stringify(response.evidence_package, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {!loading && !response && (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Gemma 4 Ready for Analysis</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select one of the structured questions above to analyze trends, explain alert triggers, or prepare discussion points for your doctor.
              </p>
            </div>
          )}
        </div>

        {/* Custom Input Form & Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ask a specific question about your recorded vitals..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={loading || !customQuestion.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>

          <p className="text-[10px] text-slate-400 text-center leading-normal">
            Gemma 4 Copilot only reviews authorized numerical data points. It does not prescribe medication,
            diagnose cardiac disease, or replace professional medical consultations.
          </p>
        </div>
      </div>
    </div>
  );
};
