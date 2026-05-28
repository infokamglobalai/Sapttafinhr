import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; firstName: string; lastName: string; planId: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'saptta_auth';

function loadPersistedAuth(): { user: User | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { user: parsed.user ?? null, token: parsed.token ?? null };
    }
  } catch { /* ignore */ }
  return { user: null, token: null };
}

function persistAuth(user: User | null, token: string | null) {
  if (user && token) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersistedAuth();
  const [user, setUser] = useState<User | null>(persisted.user);
  const [token, setToken] = useState<string | null>(persisted.token);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    persistAuth(user, token);
  }, [user, token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulated login — replace with real API call
      // POST /auth/login/ { email, password } → { access, refresh, user }
      await new Promise(r => setTimeout(r, 800));

      const mockUser: User = {
        id: 'usr_' + Date.now(),
        email,
        firstName: email.split('@')[0],
        lastName: '',
        role: 'owner',
        tenantId: 'tnt_' + Date.now(),
        products: ['hrms', 'finance'],
        setupComplete: true,
      };
      const mockToken = 'jwt_mock_' + Date.now();

      setUser(mockUser);
      setToken(mockToken);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { email: string; password: string; firstName: string; lastName: string; planId: string }) => {
    setIsLoading(true);
    try {
      // Simulated signup + tenant provisioning — replace with real API
      // POST /auth/register/ { ...data } → { access, refresh, user, tenant }
      await new Promise(r => setTimeout(r, 1200));

      const products: ('hrms' | 'finance')[] = [];
      if (data.planId.includes('hrms') || data.planId.includes('complete')) products.push('hrms');
      if (data.planId.includes('finance') || data.planId.includes('complete')) products.push('finance');

      const mockUser: User = {
        id: 'usr_' + Date.now(),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'owner',
        tenantId: 'tnt_' + Date.now(),
        products,
        setupComplete: false,
      };
      const mockToken = 'jwt_mock_' + Date.now();

      setUser(mockUser);
      setToken(mockToken);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      signup,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
