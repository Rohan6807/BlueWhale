import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Sparkles, User, AlertOctagon, RefreshCw, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenCopilot: () => void;
  onOpenEmergencyModal?: () => void;
  emergencyActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCopilot, onOpenEmergencyModal, emergencyActive = false }) => {
  const navigate = useNavigate();
  const { user, currentPersona, switchPersona, logout, isLoading } = useAuth();

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchPersona(e.target.value);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
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
      </Link>

      {/* Controls & Authentication States */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Emergency Pulse Banner */}
        {user && emergencyActive && onOpenEmergencyModal && (
          <button
            onClick={onOpenEmergencyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold animate-pulse shadow-xs transition-colors"
          >
            <AlertOctagon className="w-4 h-4" />
            <span className="hidden sm:inline">Active Faint Prompt</span>
            <span className="sm:hidden">SOS</span>
          </button>
        )}

        {/* Authenticated Controls */}
        {user ? (
          <>
            {/* Quick Persona Switcher for Evaluation */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium hidden md:inline">Demo Persona:</span>
              <select
                value={currentPersona}
                onChange={handlePersonaChange}
                disabled={isLoading}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="patient">Eleanor Vance (Patient)</option>
                <option value="marcus">Marcus Chen (Elevated HR)</option>
                <option value="sofia">Sofia Patel (Presyncope)</option>
                <option value="arthur">Arthur Pendelton (Stale BP)</option>
                <option value="caregiver">David Vance (Caregiver)</option>
                <option value="clinician">Dr. Rachel Adams (Clinician)</option>
              </select>
              {isLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
            </div>

            {/* Gemma Copilot Button */}
            <button
              onClick={onOpenCopilot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200/80 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Open Gemma 4 Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Gemma Copilot</span>
            </button>

            {/* User Profile Pill & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold text-slate-800 leading-tight">{user.full_name}</div>
                <div className="text-[10px] text-teal-600 font-semibold uppercase">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </>
        ) : (
          /* Unauthenticated Visitor Controls */
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign In</span>
            </Link>
            <Link
              to="/signup"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

