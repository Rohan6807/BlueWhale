import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Read location state destination or query param
  const from = (location.state as any)?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both email address and password');
      return;
    }

    setIsLoading(true);
    try {
      const auth = await login(email.trim().toLowerCase(), password);
      // Determine destination
      if (from && from !== '/login' && from !== '/signup') {
        navigate(from, { replace: true });
      } else if (auth.role === 'clinician') {
        navigate('/hospital', { replace: true });
      } else if (auth.role === 'caregiver') {
        navigate('/caregiver', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo1234!');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10 p-6 sm:p-8 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white shadow-xs">
          <Heart className="w-6 h-6 fill-white/20 stroke-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sign in to CardioLens AI</h1>
        <p className="text-xs text-slate-500">
          Access your personal telemetry dashboard, clinical roster, or emergency response alerts.
        </p>
      </div>

      {from && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>You must be logged in to view <strong>{from}</strong>. Please sign in below.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. patient@cardiolens.demo"
            required
            autoComplete="email"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo Credentials Helper */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 mb-2.5">
          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Quick 1-Click Demo Accounts (Password: Demo1234!)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickFill('patient@cardiolens.demo')}
            className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 text-left transition-all"
          >
            <div className="font-bold text-slate-800 text-[11px]">Eleanor Vance</div>
            <div className="text-[10px] text-slate-500">Patient (Control)</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('doctor@cardiolens.demo')}
            className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 text-left transition-all"
          >
            <div className="font-bold text-slate-800 text-[11px]">Dr. Rachel Adams</div>
            <div className="text-[10px] text-slate-500">Hospital Clinician</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('caregiver@cardiolens.demo')}
            className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 text-left transition-all"
          >
            <div className="font-bold text-slate-800 text-[11px]">David Vance</div>
            <div className="text-[10px] text-slate-500">Caregiver Contact</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('marcus@cardiolens.demo')}
            className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 text-left transition-all"
          >
            <div className="font-bold text-slate-800 text-[11px]">Marcus Chen</div>
            <div className="text-[10px] text-slate-500">Patient (Elevated HR)</div>
          </button>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
        Don't have an account?{' '}
        <Link to="/signup" className="font-bold text-teal-600 hover:text-teal-700 underline">
          Create an account
        </Link>
      </div>
    </div>
  );
};
