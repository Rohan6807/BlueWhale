import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  LineChart,
  ArrowRight,
  Watch,
  FileText,
  Lock,
  ChevronRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PrototypeDisclaimer } from '../components/common/PrototypeDisclaimer';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, switchPersona } = useAuth();

  const handleLaunchPersona = async (persona: string, route: string) => {
    await switchPersona(persona);
    navigate(route);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-4">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-teal-500/10 via-slate-50 to-white rounded-3xl p-8 sm:p-12 border border-teal-200/50 shadow-sm text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Hackathon Research Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
          Intelligent Wearable Telemetry & <span className="text-teal-600">Personal Health Trend</span> Awareness
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          CardioLens AI calibrates personalized baselines from continuous consumer wearable signals,
          highlights meaningful multi-day trend shifts, and coordinates a simulated emergency fall/fainting response workflow.
        </p>

        {/* Prototype Alert */}
        <div className="max-w-xl mx-auto">
          <PrototypeDisclaimer />
        </div>

        {/* Core Auth & Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {user ? (
            <Link
              to={user.role === 'clinician' ? '/hospital' : user.role === 'caregiver' ? '/caregiver' : '/patient'}
              className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Go to My Dashboard ({user.full_name})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </Link>
              <Link
                to="/signup"
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4 text-teal-400" />
                <span>Sign Up (Create Account)</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 3 Core Portals Grid */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Three Interconnected Portals</h2>
          <p className="text-sm text-slate-500">Built for individuals, loved ones, and clinical oversight.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Patient Portal Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-teal-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">1. Patient Portal</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time biometric summaries, 14-day median absolute deviation baselines, interactive trend charts,
              symptom journaling with instant urgent care advice, and Gemma 4 AI explanations.
            </p>
            <button
              onClick={() => handleLaunchPersona('patient', '/patient')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              Launch Eleanor's Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Caregiver Portal Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-rose-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">2. Caregiver Portal</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Emergency escalation hub displaying prompt vibration delivery statuses, multi-channel simulated
              dispatch (SMS & Voice), one-click event acknowledgement, and consented telemetry sharing.
            </p>
            <button
              onClick={() => handleLaunchPersona('caregiver', '/caregiver')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1"
            >
              Open Caregiver Dispatch <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clinician Portal Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-indigo-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">3. Hospital Portal</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Role-protected clinical roster with fictional electronic health records, prior visit notes,
              lab summaries, printable report generation, audit histories, and HL7 FHIR R4 export adapters.
            </p>
            <button
              onClick={() => handleLaunchPersona('clinician', '/hospital')}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
            >
              View Physician Clinical Suite <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* How It Operates / Architecture */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs space-y-6">
        <h2 className="text-xl font-bold text-slate-900">How CardioLens AI Operates</h2>
        <div className="grid md:grid-cols-4 gap-6 text-xs">
          <div className="space-y-2 border-l-2 border-teal-500 pl-4">
            <span className="font-bold text-teal-700 uppercase tracking-wider text-[11px]">Step 1: Telemetry</span>
            <h4 className="font-semibold text-slate-900 text-sm">Ingestion & Validation</h4>
            <p className="text-slate-600 leading-relaxed">
              Validates units, timestamps, motion artifacts, and completeness scores across HR, HRV, BP, sleep, and movement.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-teal-500 pl-4">
            <span className="font-bold text-teal-700 uppercase tracking-wider text-[11px]">Step 2: Statistics</span>
            <h4 className="font-semibold text-slate-900 text-sm">Robust Baselines</h4>
            <p className="text-slate-600 leading-relaxed">
              Computes 14-day rolling medians and Median Absolute Deviation (MAD), preventing distorted averages from acute noise.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-teal-500 pl-4">
            <span className="font-bold text-teal-700 uppercase tracking-wider text-[11px]">Step 3: Intelligence</span>
            <h4 className="font-semibold text-slate-900 text-sm">Evidence Rule Engine</h4>
            <p className="text-slate-600 leading-relaxed">
              Evaluates multi-day sustained shifts (e.g. +8 bpm resting HR or depressed HRV) and generates explainable evidence JSON.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-teal-500 pl-4">
            <span className="font-bold text-teal-700 uppercase tracking-wider text-[11px]">Step 4: Response</span>
            <h4 className="font-semibold text-slate-900 text-sm">Simulated Escalation</h4>
            <p className="text-slate-600 leading-relaxed">
              Simulates smartwatch prompt countdown, wearer confirmation, and tiered caregiver SMS/voice notification routing.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Patient Scenarios Selector */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Select a Fictional Patient Scenario</h2>
          <p className="text-xs text-slate-400">
            Four pre-configured deterministic personas demonstrating varied physiological and adherence patterns.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => handleLaunchPersona('patient', '/patient')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:border-teal-500"
          >
            <span className="text-[10px] font-bold uppercase text-teal-400">Control Subject</span>
            <h4 className="font-bold text-sm text-white mt-1">Eleanor Vance</h4>
            <p className="text-xs text-slate-400 mt-1">42F · Healthy baseline calibration, 98% telemetry completeness.</p>
          </div>

          <div
            onClick={() => handleLaunchPersona('marcus', '/patient')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:border-amber-500"
          >
            <span className="text-[10px] font-bold uppercase text-amber-400">Trend Shift</span>
            <h4 className="font-bold text-sm text-white mt-1">Marcus Chen</h4>
            <p className="text-xs text-slate-400 mt-1">58M · Post-viral fatigue: sustained +14 bpm HR shift & low HRV.</p>
          </div>

          <div
            onClick={() => handleLaunchPersona('sofia', '/emergency-simulator')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:border-rose-500"
          >
            <span className="text-[10px] font-bold uppercase text-rose-400">Emergency Demo</span>
            <h4 className="font-bold text-sm text-white mt-1">Sofia Patel</h4>
            <p className="text-xs text-slate-400 mt-1">29F · Episodic presyncope with active simulated fall/faint prompt.</p>
          </div>

          <div
            onClick={() => handleLaunchPersona('arthur', '/patient')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:border-indigo-400"
          >
            <span className="text-[10px] font-bold uppercase text-indigo-400">Adherence Gaps</span>
            <h4 className="font-bold text-sm text-white mt-1">Arthur Pendelton</h4>
            <p className="text-xs text-slate-400 mt-1">68M · Essential hypertension with &gt;20h sensor telemetry gap.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
