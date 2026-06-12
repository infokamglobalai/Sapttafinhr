/**
 * HR backend handoff.
 *
 * Saptta HR is a separate Django app (server-rendered, session auth). It is
 * reached at VITE_HR_BASE_URL — via the unified front door this is the HR host
 * (e.g. http://hr.localhost:8080). The SPA opens HR's existing pages rather
 * than re-implementing them.
 *
 * SSO: HR uses Django sessions, not the FIN JWT. We bridge them — FIN mints a
 * short-lived handoff token (POST /auth/hr-sso-token/) that HR exchanges for a
 * session at /auth/sso/. `hrSsoEntryUrl()` builds that one-time entry URL so the
 * embedded HR app opens already signed in. If SSO isn't configured (or token
 * minting fails) we fall back to HR's own login page — no hard failure.
 */
import { request, getWorkspace, ApiError } from './api';

export const HR_BASE_URL: string =
  import.meta.env.VITE_HR_BASE_URL || 'http://hr.localhost:8080';

/** Build an absolute URL into the HR app for a given path (default: home). */
export function hrUrl(path = '/'): string {
  const base = HR_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Build a one-time SSO entry URL for HR that lands on `nextPath` already
 * authenticated. Falls back to the plain HR URL if SSO is unavailable so the
 * embed still works (HR shows its own login then).
 */
export async function hrSsoEntryUrl(nextPath = '/'): Promise<string> {
  try {
    const { token } = await request<{ token: string }>('/auth/hr-sso-token/', {
      surface: 'platform',
      method: 'POST',
      body: { workspace: getWorkspace() ?? '' },
    });
    const next = encodeURIComponent(nextPath);
    return `${hrUrl('/auth/sso/')}?token=${encodeURIComponent(token)}&next=${next}`;
  } catch (err) {
    // 503 = SSO not configured; anything else = transient. Either way, fall back.
    if (!(err instanceof ApiError)) throw err;
    return hrUrl(nextPath);
  }
}

/** HR sections we surface as deep links from the unified shell. */
export const HR_SECTIONS = {
  dashboard: '/',
  employees: '/employees/',
  attendance: '/attendance/',
  leave: '/leaves/',
  payroll: '/payroll/',
  hr_ops: '/hr/',
  performance: '/performance/',
  login: '/auth/login/',
} as const;

export type HrSection = keyof typeof HR_SECTIONS;
