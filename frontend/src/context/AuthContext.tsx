import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthToken } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: AuthToken | null;
  activePatientId: string;
  currentPersona: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthToken>;
  signup: (fullName: string, email: string, password: string) => Promise<User>;
  switchPersona: (persona: string) => Promise<void>;
  setActivePatientId: (id: string) => void;
  logout: () => Promise<void>;
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
      const savedToken = localStorage.getItem('cardiolens_token');
      const savedPersona = localStorage.getItem('cardiolens_persona') || 'patient';
      const savedPatient = localStorage.getItem('cardiolens_patient_id') || 'pat-001';

      if (savedToken) {
        try {
          const me = await api.getMe();
          setUser(me);
          setCurrentPersona(savedPersona);
          if (me.patient_id) {
            setActivePatientId(me.patient_id);
          } else {
            setActivePatientId(savedPatient);
          }
          return;
        } catch {
          // Token expired or invalid, clear stored session
          localStorage.removeItem('cardiolens_token');
          localStorage.removeItem('cardiolens_persona');
          localStorage.removeItem('cardiolens_patient_id');
        }
      }

      // First-time or unauthenticated visitors start without a logged-in session
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('Failed to initialize auth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<AuthToken> => {
    setIsLoading(true);
    try {
      const authData = await api.login(email, password);
      localStorage.setItem('cardiolens_token', authData.access_token);
      setToken(authData);

      const me = await api.getMe();
      setUser(me);

      const targetPatientId = authData.patient_id || me.patient_id || 'pat-001';
      setActivePatientId(targetPatientId);
      localStorage.setItem('cardiolens_patient_id', targetPatientId);

      if (authData.email.includes('marcus')) setCurrentPersona('marcus');
      else if (authData.email.includes('sofia')) setCurrentPersona('sofia');
      else if (authData.email.includes('arthur')) setCurrentPersona('arthur');
      else if (authData.role === 'caregiver') setCurrentPersona('caregiver');
      else if (authData.role === 'clinician') setCurrentPersona('clinician');
      else setCurrentPersona('patient');

      return authData;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (fullName: string, email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const createdUser = await api.signup(fullName, email, password);
      return createdUser;
    } finally {
      setIsLoading(false);
    }
  };

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

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('cardiolens_token');
      localStorage.removeItem('cardiolens_persona');
      localStorage.removeItem('cardiolens_patient_id');
      setUser(null);
      setToken(null);
      setActivePatientId('pat-001');
      setCurrentPersona('patient');
    }
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
        login,
        signup,
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
