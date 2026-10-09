import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { TrendsMonitoringPage } from './pages/TrendsMonitoringPage';
import { SymptomJournalPage } from './pages/SymptomJournalPage';
import { EmergencySimulatorPage } from './pages/EmergencySimulatorPage';
import { CaregiverPortalPage } from './pages/CaregiverPortalPage';
import { HospitalPortalPage } from './pages/HospitalPortalPage';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="/trends" element={<TrendsMonitoringPage />} />
            <Route path="/symptoms" element={<SymptomJournalPage />} />
            <Route path="/emergency-simulator" element={<EmergencySimulatorPage />} />
            <Route path="/caregiver" element={<CaregiverPortalPage />} />
            <Route path="/hospital" element={<HospitalPortalPage />} />
            <Route path="/settings" element={<SettingsPrivacyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
