/**
 * HR backend handoff.
 *
 * Saptta HR is a separate Django app (server-rendered, session auth). It is
 * reached at VITE_HR_BASE_URL — via the unified front door this is the HR host
 * (e.g. http://hr.localhost:8080). The SPA opens HR's existing pages rather
 * than re-implementing them.
 *
 * SSO note: HR uses Django sessions, not the FIN JWT. A real single-sign-on
 * handoff (mint an HR session from the FIN identity) needs a backend endpoint
 * — see "backend gaps" in the README. Until then the user signs in to HR once;
 * its session cookie then keeps them logged in inside the embed.
 */

export const HR_BASE_URL: string =
  import.meta.env.VITE_HR_BASE_URL || 'http://hr.localhost:8080';

/** Build an absolute URL into the HR app for a given path (default: home). */
export function hrUrl(path = '/'): string {
  const base = HR_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
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
