import React from 'react';
import { Heart, Activity, Sparkles, User, AlertOctagon, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenCopilot: () => void;
  onOpenEmergencyModal?: () => void;
  emergencyActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCopilot, onOpenEmergencyModal, emergencyActive = false }) => {
  const { user, currentPersona, switchPersona, isLoading } = useAuth();

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchPersona(e.target.value);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
          <Heart className="w-5 h-5 fill-white/20 stroke-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
              CardioLens <span className="text-teal-600 font-black">AI</span>
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              Prototype v1.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block">Wearable Telemetry & Trend Awareness</p>
        </div>
      </div>

      {/* Controls & Quick Persona Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Active Emergency Pulse Banner */}
        {emergencyActive && onOpenEmergencyModal && (
          <button
            onClick={onOpenEmergencyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold animate-pulse shadow-xs transition-colors"
          >
            <AlertOctagon className="w-4 h-4" />
            <span className="hidden sm:inline">Active Faint Prompt</span>
            <span className="sm:hidden">SOS</span>
          </button>
        )}

        {/* Demo Persona Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium hidden md:inline">Persona:</span>
          <select
            value={currentPersona}
            onChange={handlePersonaChange}
            disabled={isLoading}
            className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
          >
            <option value="patient">Eleanor Vance (Patient - Baseline)</option>
            <option value="marcus">Marcus Chen (Patient - Elevated HR)</option>
            <option value="sofia">Sofia Patel (Patient - Presyncope)</option>
            <option value="arthur">Arthur Pendelton (Patient - Stale BP)</option>
            <option value="caregiver">David Vance (Caregiver Portal)</option>
            <option value="clinician">Dr. Rachel Adams (Hospital Portal)</option>
          </select>
          {isLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
        </div>

        {/* Copilot Open Button */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200/80 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          title="Open Gemma 4 Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span className="hidden sm:inline">Gemma Copilot</span>
        </button>
      </div>
    </header>
  );
};
