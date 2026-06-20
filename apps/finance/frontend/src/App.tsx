import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import AppShell from '@/app/AppShell';
import SetupGate from '@/features/setup/SetupGate';
import { api } from '@/lib/api';
import { ConfirmHost } from '@/components/ConfirmDialog';
import InstallPrompt from '@/components/InstallPrompt';
import AIChatWidget from '@/components/AIChatWidget';

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

/**
 * Single sign-on: this product has no login of its own. When we land here
 * without a session, bounce to the Saptta platform login. It authenticates the
 * user once and hands the JWT straight back via ?handoff= (see consumeHandoff).
 * `redirect=finance` + the workspace subdomain tell the platform which app and
 * tenant to return to after sign-in.
 */
function redirectToPlatformLogin(): void {
  const platform = import.meta.env.VITE_PLATFORM_BASE_URL || 'http://localhost:8080';
  const sub = window.location.hostname.split('.')[0];
  const workspace = sub && !['localhost', 'finance', 'finance-web'].includes(sub) ? sub : '';
  const params = new URLSearchParams({ redirect: 'finance' });
  if (workspace) params.set('workspace', workspace);
  window.location.replace(`${platform.replace(/\/+$/, '')}/login?${params.toString()}`);
}

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

  // No session once bootstrapped → hand sign-in back to the platform login.
  const signedIn = !!accessToken && !!user;
  useEffect(() => {
    if (bootstrapped && !signedIn) {
      redirectToPlatformLogin();
    }
  }, [bootstrapped, signedIn]);

  if (!bootstrapped || !signedIn) {
    const msg = signedIn ? 'Loading…' : 'Redirecting to sign in…';
    return <div className="flex min-h-screen items-center justify-center text-slate-400">{msg}</div>;
  }

  const wantsInstall = new URLSearchParams(window.location.search).get('install') === '1';

  return (
    <QueryClientProvider client={queryClient}>
      {wantsInstall && <InstallPrompt appName="fin-saptta" color="#10B981" />}
      <SetupGate><AppShell /></SetupGate>
      <AIChatWidget />
      <ConfirmHost />
    </QueryClientProvider>
  );
}
