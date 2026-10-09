import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  ClipboardList,
  AlertOctagon,
  Users,
  Building2,
  ShieldCheck,
  Home,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  emergencyActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ emergencyActive = false }) => {
  const { user } = useAuth();
  const role = user?.role || 'patient';

  const navItems = [
    { to: '/', label: 'Product Overview', icon: Home, exact: true },
    { to: '/patient', label: 'Patient Dashboard', icon: LayoutDashboard },
    { to: '/trends', label: 'Trends & Baselines', icon: LineChart },
    { to: '/symptoms', label: 'Symptom Journal', icon: ClipboardList },
    {
      to: '/emergency-simulator',
      label: 'Fall/Faint Simulator',
      icon: AlertOctagon,
      badge: emergencyActive ? 'Active' : undefined,
    },
    { to: '/caregiver', label: 'Caregiver Portal', icon: Users, roleHint: 'caregiver' },
    { to: '/hospital', label: 'Hospital Portal', icon: Building2, roleHint: 'clinician' },
    { to: '/settings', label: 'Privacy & Settings', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="p-4 space-y-6">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            Navigation Portals
          </span>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 border border-teal-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {item.roleHint && role === item.roleHint && (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 font-bold">
                      Current
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Safety Notice in Sidebar footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-tight">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
          <p>
            Research Prototype. Not a medical diagnostic device.
          </p>
        </div>
      </div>
    </aside>
  );
};
