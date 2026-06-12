import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: number;
    email: string;
    full_name: string;
    workspace?: string;
    tenant_name?: string;
    role?: string | null;
    permissions?: string[];
    products?: string[];
  } | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: typeof window !== 'undefined' ? localStorage.getItem('saptta_access') : null,
      refreshToken: typeof window !== 'undefined' ? localStorage.getItem('saptta_refresh') : null,
      user: null,
      setTokens: (access, refresh) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('saptta_access', access);
          localStorage.setItem('saptta_refresh', refresh);
        }
        set({ accessToken: access, refreshToken: refresh });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('saptta_access');
          localStorage.removeItem('saptta_refresh');
          localStorage.removeItem('saptta_workspace');
          window.location.href = '/login';
        }
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    { name: 'finsaptta-auth' },
  ),
);
