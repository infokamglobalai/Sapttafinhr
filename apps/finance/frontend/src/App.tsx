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
    // Persist the workspace so the API client can send X-Workspace (the
    // centralized backend resolves the tenant schema from it). Same-origin dev
    // already shares this via localStorage; the param makes it work cross-origin.
    const ws = url.searchParams.get('ws');
    if (ws) localStorage.setItem('saptta_workspace', ws);
    url.searchParams.delete('ws');
    if (!h || !h.includes('~')) {
      if (ws) window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      return false;
    }
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
 * Saptta has ONE login — the platform sign-in. The Finance app never shows its
 * own login form; when it has no token (opened directly / signed out) we bounce
 * to the platform login, which signs the user in once and hands back via the
 * product launcher. This is what removes the "second login" for Finance.
 */
function PlatformLoginRedirect() {
  useEffect(() => {
    const platform = (import.meta.env.VITE_PLATFORM_BASE_URL || '').replace(/\/+$/, '');
    window.location.replace(`${platform}/login`);
  }, []);
  return <div className="flex min-h-screen items-center justify-center text-slate-400">Redirecting to sign in…</div>;
}

export default function App() {
  const { accessToken, user, setUser, logout } = useAuthStore();
  const [bootstrapped, setBootstrapped] = useState(!accessToken && !HANDOFF_DONE);

  useEffect(() => {
    if (accessToken && !user) {
      api.get('/auth/me/')
        .then((r) => {
          // Learn (and persist) our tenant so the API client can send
          // X-Workspace on every call — the centralized backend resolves the
          // tenant schema from it. Without this, tenant data 404s and the
          // dashboard renders empty.
          if (r.data?.workspace) {
            localStorage.setItem('saptta_workspace', r.data.workspace);
          }
          setUser(r.data);
        })
        .catch(() => logout())
        .finally(() => setBootstrapped(true));
    } else {
      setBootstrapped(true);
    }
  }, [accessToken, user, setUser, logout]);

  if (!bootstrapped) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const wantsInstall = new URLSearchParams(window.location.search).get('install') === '1';

  return (
    <QueryClientProvider client={queryClient}>
      {wantsInstall && <InstallPrompt appName="fin-saptta" color="#10B981" />}
      {accessToken && user
        ? <SetupGate><AppShell /></SetupGate>
        : <PlatformLoginRedirect />}
      {accessToken && user && <AIChatWidget />}
      <ConfirmHost />
    </QueryClientProvider>
  );
}
