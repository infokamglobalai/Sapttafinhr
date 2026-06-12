import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  // Tell the centralized backend which tenant schema to use. Without this, the
  // unified domain (no subdomain) resolves to the PUBLIC schema and every tenant
  // resource (masters, ledger, reports…) 404s — so the dashboard renders empty.
  // The workspace is shared from the platform login via same-origin localStorage
  // and persisted from the SSO handoff (see App.tsx consumeHandoff).
  const ws = typeof window !== 'undefined' ? localStorage.getItem('saptta_workspace') : null;
  if (ws) {
    config.headers.set('X-Workspace', ws);
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) return null;
  try {
    const r = await axios.post(`${baseURL}/auth/refresh/`, { refresh });
    const newAccess = r.data.access as string;
    useAuthStore.getState().setTokens(newAccess, r.data.refresh ?? refresh);
    return newAccess;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing ??= refreshToken().finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);
