import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Checking authentication...</p>
      </div>
    );
  }

  // Not logged in -> redirect to login with intended location saved
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check if specific roles are required
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Restricted Portal Access</h2>
        <p className="text-sm text-slate-600">
          This section is restricted to <strong>{allowedRoles.join(' or ')}</strong> personnel.
          Your current session is signed in as <strong>{user.full_name}</strong> with role{' '}
          <span className="font-semibold uppercase text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {user.role}
          </span>.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="/patient"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go to Patient Dashboard
          </a>
          <button
            onClick={() => logout()}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
};
