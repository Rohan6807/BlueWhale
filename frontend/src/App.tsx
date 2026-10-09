import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { TrendsMonitoringPage } from './pages/TrendsMonitoringPage';
import { SymptomJournalPage } from './pages/SymptomJournalPage';
import { EmergencySimulatorPage } from './pages/EmergencySimulatorPage';
import { CaregiverPortalPage } from './pages/CaregiverPortalPage';
import { HospitalPortalPage } from './pages/HospitalPortalPage';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected dashboards */}
            <Route
              path="/patient"
              element={
                <ProtectedRoute>
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trends"
              element={
                <ProtectedRoute>
                  <TrendsMonitoringPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/symptoms"
              element={
                <ProtectedRoute>
                  <SymptomJournalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emergency-simulator"
              element={
                <ProtectedRoute>
                  <EmergencySimulatorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/caregiver"
              element={
                <ProtectedRoute allowedRoles={['caregiver', 'clinician', 'admin']}>
                  <CaregiverPortalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospital"
              element={
                <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                  <HospitalPortalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPrivacyPage />
                </ProtectedRoute>
              }
            />

            {/* Wildcard redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
