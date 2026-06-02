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

/**
 * SSO handoff from the marketing site: it opens this app with
 *   ?handoff=<accessToken>~<refreshToken>
 * We consume those into the auth store once, then strip them from the URL so
 * tokens don't linger in history. Runs before first render of the gate below.
 */
function consumeHandoff(): boolean {
  try {
    const url = new URL(window.location.href);
    const h = url.searchParams.get('handoff');
    if (!h || !h.includes('~')) return false;
    const [access, refresh] = h.split('~');
    if (access && refresh) {
      useAuthStore.getState().setTokens(access, refresh);
    }
    url.searchParams.delete('handoff');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    return !!(access && refresh);
  } catch {
    return false;
  }
}

const HANDOFF_DONE = consumeHandoff();

export default function App() {
  const { accessToken, user, setUser, logout } = useAuthStore();
  const [bootstrapped, setBootstrapped] = useState(!accessToken && !HANDOFF_DONE);

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
