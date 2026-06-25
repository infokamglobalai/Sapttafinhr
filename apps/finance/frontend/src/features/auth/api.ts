import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export async function login(email: string, password: string) {
  const r = await api.post('/auth/login/', { email, password });
  useAuthStore.getState().setTokens(r.data.access, r.data.refresh);
  const me = await api.get('/auth/me/');
  useAuthStore.getState().setUser(me.data);
  return me.data;
}
