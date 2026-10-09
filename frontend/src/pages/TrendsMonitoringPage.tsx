import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
  TrendingUp,
  BrainCircuit,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { DailyAggregate, BaselineComparisonResponse, PersonalBaseline } from '../types';
import { PrototypeDisclaimer } from '../components/common/PrototypeDisclaimer';

export const TrendsMonitoringPage: React.FC = () => {
  const { activePatientId } = useAuth();
  const [metric, setMetric] = useState<string>('heart_rate');
  const [windowDays, setWindowDays] = useState<number>(14);
  const [aggregates, setAggregates] = useState<DailyAggregate[]>([]);
  const [baselines, setBaselines] = useState<PersonalBaseline[]>([]);
  const [comparisons, setComparisons] = useState<BaselineComparisonResponse | null>(null);
  const [anomalyScoreData, setAnomalyScoreData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadTrends = async () => {
    if (!activePatientId) return;
    try {
      setLoading(true);
      const [agg, base, comp, anom] = await Promise.all([
        api.getDailyAggregates(activePatientId, metric, windowDays),
        api.getBaselines(activePatientId),
        api.getBaselineComparison(activePatientId),
        api.getExperimentalAnomalyScore(activePatientId),
      ]);
      setAggregates(agg);
      setBaselines(base);
      setComparisons(comp);
      setAnomalyScoreData(anom);
    } catch (err) {
      console.error('Error loading trends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [activePatientId, metric, windowDays]);

  const currentBaseline = baselines.find((b) => b.metric === metric);
  const currentComparison = comparisons?.comparisons.find((c) => c.metric === metric);

  const upperBand = currentBaseline ? currentBaseline.median_value + (2 * currentBaseline.mad_value) : null;
  const lowerBand = currentBaseline ? Math.max(0, currentBaseline.median_value - (2 * currentBaseline.mad_value)) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trends & Baseline Trajectories</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking longitudinal variance against calibrated Median Absolute Deviation (MAD) corridors.
          </p>
        </div>

        {/* Metric and Window Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 shadow-xs focus:outline-hidden"
          >
            <option value="heart_rate">Resting Heart Rate (bpm)</option>
            <option value="hrv_rmssd">Heart Rate Variability (ms)</option>
            <option value="systolic_bp">Systolic BP (mmHg)</option>
            <option value="daily_steps">Daily Steps</option>
          </select>

          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 shadow-xs focus:outline-hidden"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>

          <button
            onClick={loadTrends}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
            title="Refresh trends"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Trajectory Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 capitalize">
              {metric.replace(/_/g, ' ')} Trajectory vs. Personal Baseline Corridor
            </h2>
            <p className="text-xs text-slate-500">
              The teal corridor indicates the personal range (Median ± 2 MAD). Readings outside this corridor denote statistical shift.
            </p>
          </div>

          {currentBaseline && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                Median: <strong>{currentBaseline.median_value}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-200" />
                Normal Corridor (±2 MAD)
              </span>
            </div>
          )}
        </div>

        {/* Recharts Trajectory View */}
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aggregates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickLine={false}
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => val.slice(5)}
              />
              <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px',
                }}
              />

              {/* Baseline reference lines & shaded normal corridor */}
              {currentBaseline && upperBand && lowerBand && (
                <>
                  <ReferenceArea
                    y1={lowerBand}
                    y2={upperBand}
                    fill="#14b8a6"
                    fillOpacity={0.08}
                  />
                  <ReferenceLine
                    y={currentBaseline.median_value}
                    stroke="#0d9488"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                </>
              )}

              {/* Daily Min/Max envelope */}
              <Line
                type="monotone"
                dataKey="max"
                stroke="#cbd5e1"
                strokeDasharray="2 2"
                dot={false}
                name="Daily Max"
              />
              <Line
                type="monotone"
                dataKey="mean"
                stroke="#0d9488"
                strokeWidth={3}
                dot={{ r: 3, fill: '#0d9488' }}
                activeDot={{ r: 6 }}
                name="Daily Mean"
              />
              <Line
                type="monotone"
                dataKey="min"
                stroke="#cbd5e1"
                strokeDasharray="2 2"
                dot={false}
                name="Daily Min"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Comparison & Interpretation Card */}
        {currentComparison && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">Personal Baseline Robust Assessment:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                currentComparison.status === 'within_normal_baseline'
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentComparison.status === 'mild_deviation'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {currentComparison.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">{currentComparison.interpretation}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 font-mono text-[11px]">
              <div>Current: <strong>{currentComparison.current_value} {currentComparison.unit}</strong></div>
              <div>Baseline Median: <strong>{currentComparison.baseline_median}</strong></div>
              <div>Robust MAD: <strong>±{currentComparison.baseline_mad}</strong></div>
              <div>Robust Z-Score: <strong>{currentComparison.deviation_score}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Experimental Isolation Forest & Non-Diagnostic Boundary Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Experimental Multivariate Anomaly Detector */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Experimental Multivariate Isolation Forest
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Unsupervised machine learning model identifying simultaneous multi-sensor divergence (HR, HRV, and movement).
          </p>

          {anomalyScoreData && (
            <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-950">Normalized Statistical Divergence:</span>
                <span className="text-lg font-bold text-purple-900 font-mono">
                  {anomalyScoreData.latest_anomaly_score !== undefined
                    ? `${(anomalyScoreData.latest_anomaly_score * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>

              <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (anomalyScoreData.latest_anomaly_score || 0) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-purple-900/80 leading-normal">
                {anomalyScoreData.disclaimer || 'Research anomaly score only.'}
              </p>
            </div>
          )}
        </div>

        {/* Clear Separation Notice */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Personal Trend vs. Clinical Diagnosis
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            CardioLens AI strictly isolates personal baseline variation from clinical disease diagnoses:
          </p>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              <strong>Personal Baseline Finding:</strong> A mathematical shift from your individual past values (e.g. resting HR +10 bpm above your 14-day median).
            </li>
            <li>
              <strong>Clinical Diagnosis:</strong> A formal medical determination conducted by an authorized physician using validated diagnostic tools (e.g. 12-lead ECG, blood assays, echocardiogram).
            </li>
            <li>
              <strong>No Fabricated Risks:</strong> We intentionally do not produce fabricated disease probabilities (such as &quot;84% chance of arrhythmia&quot;).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
