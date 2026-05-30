import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import LoginPage from '@/features/auth/LoginPage';
import AppShell from '@/app/AppShell';
import { api } from '@/lib/api';
import { ConfirmHost } from '@/components/ConfirmDialog';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

export default function App() {
  const { accessToken, user, setUser, logout } = useAuthStore();
  const [bootstrapped, setBootstrapped] = useState(!accessToken);

  useEffect(() => {
    if (accessToken && !user) {
      api.get('/auth/me/')
        .then((r) => setUser(r.data))
        .catch(() => logout())
        .finally(() => setBootstrapped(true));
    } else {
      setBootstrapped(true);
    }
  }, [accessToken, user, setUser, logout]);

  if (!bootstrapped) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {accessToken && user
        ? <AppShell />
        : <LoginPage onSuccess={() => setBootstrapped(true)} />}
      <ConfirmHost />
    </QueryClientProvider>
  );
}
