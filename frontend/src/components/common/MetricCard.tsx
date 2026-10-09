import React from 'react';
import { Activity, Heart, Moon, Footprints, ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { MetricLatest } from '../../types';

interface MetricCardProps {
  data: MetricLatest;
  onClick?: () => void;
  selected?: boolean;
}

const METRIC_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  heart_rate: {
    label: 'Resting Heart Rate',
    icon: Heart,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  hrv_rmssd: {
    label: 'Heart Rate Variability (HRV)',
    icon: Activity,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  systolic_bp: {
    label: 'Systolic Blood Pressure',
    icon: Activity,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  diastolic_bp: {
    label: 'Diastolic Blood Pressure',
    icon: Activity,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  sleep_duration_hours: {
    label: 'Sleep Duration',
    icon: Moon,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  sleep_score: {
    label: 'Sleep Quality Score',
    icon: Moon,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  daily_steps: {
    label: 'Daily Movement / Steps',
    icon: Footprints,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({ data, onClick, selected = false }) => {
  const config = METRIC_CONFIG[data.metric] || {
    label: data.metric.replace(/_/g, ' '),
    icon: Activity,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  };
  const IconComponent = config.icon;

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const getQualityBadge = (qual: string) => {
    if (qual === 'high') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          High Quality
        </span>
      );
    }
    if (qual === 'degraded_motion') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          Motion Artifact
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
        {qual}
      </span>
    );
  };

  const renderDelta = () => {
    if (data.change_vs_baseline_percent === null || data.change_vs_baseline_percent === undefined) {
      return (
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Minus className="w-3 h-3" /> Baseline calibrating
        </span>
      );
    }

    const pct = data.change_vs_baseline_percent;
    const isUp = pct > 0;
    const isNeutral = Math.abs(pct) < 1.0;

    let badgeClass = 'text-slate-600 bg-slate-50 border-slate-200';
    if (data.status === 'elevated' || data.status === 'caution') {
      badgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (data.status === 'suppressed') {
      badgeClass = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (isNeutral) {
      badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }

    return (
      <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${badgeClass} font-medium`}>
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isUp ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        <span>{pct > 0 ? `+${pct}%` : `${pct}%`} vs baseline</span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 transition-all cursor-pointer hover:shadow-md ${
        selected ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-sm' : 'border-slate-200/80 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-lg ${config.bg} ${config.color}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{config.label}</h3>
            <p className="text-[11px] text-slate-400 capitalize">{data.source.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {getQualityBadge(data.quality)}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold tracking-tight text-slate-900">
          {typeof data.numeric_value === 'number' && data.numeric_value % 1 !== 0
            ? data.numeric_value.toFixed(1)
            : data.numeric_value}
        </span>
        <span className="text-sm font-medium text-slate-500">{data.unit}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        {renderDelta()}
        <span className="text-slate-400 text-[11px]">Synced {formatTimestamp(data.measured_at)}</span>
      </div>
    </div>
  );
};
