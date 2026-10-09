import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Heart,
  Moon,
  Footprints,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Upload,
  AlertOctagon,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  Phone,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  PatientDashboardSummary,
  DailyAggregate,
  Alert,
  BaselineComparisonResponse,
  EmergencyContact,
} from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { PrototypeDisclaimer } from '../components/common/PrototypeDisclaimer';

export const PatientDashboard: React.FC = () => {
  const { activePatientId, user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<PatientDashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [baselineComparison, setBaselineComparison] = useState<BaselineComparisonResponse | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('heart_rate');
  const [dailyData, setDailyData] = useState<DailyAggregate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [importingCsv, setImportingCsv] = useState<boolean>(false);

  const loadDashboardData = async () => {
    if (!activePatientId) return;
    try {
      setLoading(true);
      const [sumData, alertData, baseData, contactData] = await Promise.all([
        api.getDashboardSummary(activePatientId),
        api.getAlerts(activePatientId),
        api.getBaselineComparison(activePatientId),
        api.getEmergencyContacts(activePatientId),
      ]);
      setSummary(sumData);
      setAlerts(alertData);
      setBaselineComparison(baseData);
      setContacts(contactData);

      // Load chart for selected metric
      const chartData = await api.getDailyAggregates(activePatientId, selectedMetric, 14);
      setDailyData(chartData);
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activePatientId]);

  useEffect(() => {
    if (!activePatientId) return;
    api.getDailyAggregates(activePatientId, selectedMetric, 14).then(setDailyData).catch(console.error);
  }, [selectedMetric, activePatientId]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const updated = await api.acknowledgeAlert(alertId, user?.full_name || 'Patient');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleRecalculateBaselines = async () => {
    if (!activePatientId) return;
    try {
      setRecalculating(true);
      await api.recalculateBaselines(activePatientId, 14);
      await api.evaluateAlerts(activePatientId);
      await loadDashboardData();
    } catch (err) {
      console.error('Error recalculating baselines:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePatientId) return;
    try {
      setImportingCsv(true);
      await api.importCsv(activePatientId, file);
      await loadDashboardData();
    } catch (err) {
      console.error('CSV import error:', err);
    } finally {
      setImportingCsv(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-sm font-semibold">Loading Patient Telemetry & Baselines...</p>
      </div>
    );
  }

  const selectedBaseItem = baselineComparison?.comparisons.find((c) => c.metric === selectedMetric);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Patient Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary?.display_name || 'Patient Dashboard'}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 uppercase">
              {summary?.baseline_status || 'Calibrated'}
            </span>
            {summary?.emergency_mode && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                Active Prompt
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>ID: <code className="text-slate-700 font-mono">{activePatientId}</code></span>
            <span>·</span>
            <span>Continuous telemetry active</span>
            <span>·</span>
            <span>Last Synced: {summary?.last_synced_at ? new Date(summary.last_synced_at).toLocaleTimeString() : 'Recent'}</span>
          </p>
        </div>

        {/* Data Integrity / Completeness Metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 text-center">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Signal Quality</span>
            <span className="text-base font-bold text-teal-700">{summary?.sensor_quality_score || 96}%</span>
          </div>

          <div className="bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 text-center">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Completeness</span>
            <span className="text-base font-bold text-slate-800">{summary?.data_completeness_score || 98}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecalculateBaselines}
              disabled={recalculating}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-xs"
              title="Recalculate 14-day median & MAD"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Recalibrate</span>
            </button>

            <label className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer transition-colors text-xs shadow-xs">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{importingCsv ? 'Importing...' : 'Import CSV'}</span>
              <input type="file" accept=".csv" onChange={handleCsvUpload} disabled={importingCsv} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary?.latest_metrics.slice(0, 4).map((m) => (
          <MetricCard
            key={m.metric}
            data={m}
            selected={selectedMetric === m.metric}
            onClick={() => setSelectedMetric(m.metric)}
          />
        ))}
      </div>

      {/* Main Trends & Baseline Chart Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 capitalize">
                {selectedMetric.replace(/_/g, ' ')} Trajectory vs Calibrated Baseline
              </h2>
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                14-Day View
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily aggregates compared against personal historical median reference.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
            {['heart_rate', 'hrv_rmssd', 'systolic_bp', 'daily_steps'].map((key) => (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all capitalize ${
                  selectedMetric === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {key.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => val.slice(5)}
              />
              <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value}`, 'Mean Value']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              {selectedBaseItem && selectedBaseItem.baseline_median > 0 && (
                <ReferenceLine
                  y={selectedBaseItem.baseline_median}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{
                    value: `Baseline Median: ${selectedBaseItem.baseline_median}`,
                    fill: '#f43f5e',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="mean"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#metricGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Selected Baseline Explanation Callout */}
        {selectedBaseItem && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start gap-3">
            <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-800">
                Personal Baseline: Median {selectedBaseItem.baseline_median} {selectedBaseItem.unit} (MAD: ±{selectedBaseItem.baseline_mad})
              </span>
              <p className="text-slate-600 leading-normal">{selectedBaseItem.interpretation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Active Trend Alerts & Symptom Log Quick Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Active Advisory Alerts</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {alerts.filter((a) => a.status === 'new').length} New
            </span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No active trend alerts. Telemetry is within normal baseline limits.
              </div>
            ) : (
              alerts.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border transition-all ${
                    a.status === 'new'
                      ? 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                      {a.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-white border border-slate-200 text-slate-600">
                      {a.rule_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.explanation}</p>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                    {a.status === 'new' ? (
                      <button
                        onClick={() => handleAcknowledgeAlert(a.id)}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-lg text-xs shadow-xs transition-colors"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions & Caregiver Contacts Preview */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Care Actions & Contacts</h3>
            <span className="text-xs text-teal-600 font-semibold cursor-pointer" onClick={() => navigate('/settings')}>
              Manage
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/symptoms')}
              className="p-3.5 bg-teal-50/70 hover:bg-teal-50 border border-teal-200/80 rounded-xl text-left transition-colors space-y-1"
            >
              <div className="font-bold text-xs text-teal-900 flex items-center justify-between">
                <span>Record Symptoms</span>
                <ChevronRight className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-[11px] text-teal-700/80">Log palpitations, dizziness, or fatigue</p>
            </button>

            <button
              onClick={() => navigate('/emergency-simulator')}
              className="p-3.5 bg-rose-50/70 hover:bg-rose-50 border border-rose-200/80 rounded-xl text-left transition-colors space-y-1"
            >
              <div className="font-bold text-xs text-rose-900 flex items-center justify-between">
                <span>Fall/Faint Test</span>
                <ChevronRight className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <p className="text-[11px] text-rose-700/80">Test simulated vibration countdown</p>
            </button>
          </div>

          {/* Emergency Contacts Preview */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Configured Escalation Contacts
            </span>
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">{c.name}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5 font-medium">({c.relationship_type})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700">
                    Priority {c.priority_order}
                  </span>
                  <span className="text-slate-600">{c.phone_number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
