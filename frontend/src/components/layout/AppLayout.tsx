import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PrototypeDisclaimer } from '../common/PrototypeDisclaimer';
import { GemmaCopilotDrawer } from '../copilot/GemmaCopilotDrawer';
import { SmartwatchPromptModal } from '../emergency/SmartwatchPromptModal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { EmergencyEvent } from '../../types';

export const AppLayout: React.FC = () => {
  const { activePatientId, user } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<EmergencyEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  const fetchActiveEmergency = async () => {
    if (!activePatientId) return;
    try {
      const event = await api.getActiveEmergency(activePatientId);
      setActiveEmergency(event);
      if (event && event.status === 'prompted' && location.pathname !== '/emergency-simulator') {
        // Automatically surface modal if a simulated prompt just arrived
        setModalOpen(true);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchActiveEmergency();
    const interval = setInterval(fetchActiveEmergency, 8000);
    return () => clearInterval(interval);
  }, [activePatientId]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PrototypeDisclaimer compact />
      <Header
        onOpenCopilot={() => setCopilotOpen(true)}
        onOpenEmergencyModal={() => setModalOpen(true)}
        emergencyActive={Boolean(activeEmergency && activeEmergency.status === 'prompted')}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar emergencyActive={Boolean(activeEmergency && activeEmergency.status === 'prompted')} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Gemma 4 Copilot Drawer */}
      <GemmaCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        patientId={activePatientId}
        patientName={user?.full_name || 'Demo Patient'}
      />

      {/* Smartwatch Simulator Modal */}
      <SmartwatchPromptModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={activeEmergency}
        onEventUpdated={(updated) => {
          setActiveEmergency(updated);
        }}
      />
    </div>
  );
};
