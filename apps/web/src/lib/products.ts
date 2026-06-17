/**
 * Hand off from the marketing shell into the REAL standalone products.
 *
 * The two products are separate apps (see apps/finance/frontend, apps/hr):
 *   - Finance: served at the workspace host root ({workspace}.localhost:8080).
 *     It shares the FIN JWT, so we pass the tokens via a one-time ?handoff=
 *     param that the Finance app consumes on boot (App.tsx consumeHandoff()).
 *   - HR: its own Django app on hr.localhost:8080, signed in via the existing
 *     SSO token endpoint (see lib/hr.ts).
 *
 * This is why a trial opens the actual products with the user's real (empty)
 * workspace — not the mock dashboards that used to live in apps/web.
 */
import { getAccessToken, getRefreshToken, getWorkspace } from './api';
import { hrSsoEntryUrl, hrUrl } from './hr';
import { resolveFinanceAppBaseTemplate, platformSiteUrl } from './platform';

const FINANCE_TEMPLATE: string = resolveFinanceAppBaseTemplate();

/** Absolute URL of the real Finance app for a workspace. */
export function financeAppUrl(workspace?: string): string {
  const ws = (workspace || getWorkspace() || 'acme').trim();
  return FINANCE_TEMPLATE.includes('{workspace}')
    ? FINANCE_TEMPLATE.replace('{workspace}', ws)
    : FINANCE_TEMPLATE;
}

/** Open the real Finance product, handing off the current JWT so it's signed in. */
export function openFinanceApp(workspace?: string, newTab = false): void {
  const base = financeAppUrl(workspace);
  const access = getAccessToken();
  const refresh = getRefreshToken();
  const platform = encodeURIComponent(platformSiteUrl());
  const url = access && refresh
    ? `${base}/?handoff=${encodeURIComponent(access)}~${encodeURIComponent(refresh)}&platform=${platform}`
    : base;
  if (newTab) window.open(url, '_blank');
  else window.location.assign(url);
}

/** Open Finance in a new tab with ?install=1 so it shows the PWA install prompt. */
export function installFinanceApp(workspace?: string): void {
  const base = financeAppUrl(workspace);
  const access = getAccessToken();
  const refresh = getRefreshToken();
  const platform = encodeURIComponent(platformSiteUrl());
  const handoff = access && refresh
    ? `handoff=${encodeURIComponent(access)}~${encodeURIComponent(refresh)}&platform=${platform}&`
    : '';
  window.open(`${base}/?${handoff}install=1`, '_blank');
}

/** Open HR in a new tab with ?install=1 so it shows the PWA install prompt. */
export function installHrApp(): void {
  window.open(`${hrUrl('/')}?install=1`, '_blank');
}

/**
 * Open the real HR product, signed in via the SSO handoff (FIN JWT → HR Django
 * session). Falls back to HR's own login if SSO is unavailable.
 */
export async function openHrApp(newTab = false): Promise<void> {
  // For a new tab we must grab the window synchronously inside the click gesture
  // (before awaiting the SSO token) or the browser blocks the popup.
  const pending = newTab ? window.open('', '_blank') : null;
  let url: string;
  try {
    url = await hrSsoEntryUrl('/');
  } catch {
    url = hrUrl('/');
  }
  if (newTab) {
    if (pending) pending.location.href = url;
    else window.open(url, '_blank');
  } else {
    window.location.assign(url);
  }
}
