import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthToken } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: AuthToken | null;
  activePatientId: string;
  currentPersona: string;
  isLoading: boolean;
  switchPersona: (persona: string) => Promise<void>;
  setActivePatientId: (id: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<AuthToken | null>(null);
  const [activePatientId, setActivePatientId] = useState<string>('pat-001');
  const [currentPersona, setCurrentPersona] = useState<string>('patient');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      setIsLoading(true);
      // Auto-login with default demo persona on first load
      const savedToken = localStorage.getItem('cardiolens_token');
      const savedPersona = localStorage.getItem('cardiolens_persona') || 'patient';
      const savedPatient = localStorage.getItem('cardiolens_patient_id') || 'pat-001';

      if (savedToken) {
        try {
          const me = await api.getMe();
          setUser(me);
          setCurrentPersona(savedPersona);
          setActivePatientId(savedPatient);
          setIsLoading(false);
          return;
        } catch {
          // Token expired or invalid, switch persona
        }
      }

      // Switch to default persona
      const authData = await api.switchDemoPersona(savedPersona);
      localStorage.setItem('cardiolens_token', authData.access_token);
      localStorage.setItem('cardiolens_persona', savedPersona);
      setToken(authData);
      setCurrentPersona(savedPersona);

      if (authData.patient_id) {
        setActivePatientId(authData.patient_id);
      } else {
        setActivePatientId(savedPatient);
      }

      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      console.error('Failed to initialize demo persona:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const switchPersona = async (persona: string) => {
    try {
      setIsLoading(true);
      const authData = await api.switchDemoPersona(persona);
      localStorage.setItem('cardiolens_token', authData.access_token);
      localStorage.setItem('cardiolens_persona', persona);
      setToken(authData);
      setCurrentPersona(persona);

      const patientMap: Record<string, string> = {
        patient: 'pat-001',
        eleanor: 'pat-001',
        marcus: 'pat-002',
        sofia: 'pat-003',
        arthur: 'pat-004',
      };

      if (patientMap[persona.toLowerCase()]) {
        const pId = patientMap[persona.toLowerCase()];
        setActivePatientId(pId);
        localStorage.setItem('cardiolens_patient_id', pId);
      } else if (authData.patient_id) {
        setActivePatientId(authData.patient_id);
        localStorage.setItem('cardiolens_patient_id', authData.patient_id);
      }

      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      console.error('Failed to switch persona:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActivePatientId = (id: string) => {
    setActivePatientId(id);
    localStorage.setItem('cardiolens_patient_id', id);
  };

  const logout = () => {
    localStorage.removeItem('cardiolens_token');
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activePatientId,
        currentPersona,
        isLoading,
        switchPersona,
        setActivePatientId: handleSetActivePatientId,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
