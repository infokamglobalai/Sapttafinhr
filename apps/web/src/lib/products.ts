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

const FINANCE_TEMPLATE: string =
  import.meta.env.VITE_FINANCE_APP_BASE_URL || 'http://{workspace}.localhost:8080';

/** Absolute URL of the real Finance app for a workspace. */
export function financeAppUrl(workspace?: string): string {
  const ws = (workspace || getWorkspace() || 'acme').trim();
  return FINANCE_TEMPLATE.includes('{workspace}')
    ? FINANCE_TEMPLATE.replace('{workspace}', ws)
    : FINANCE_TEMPLATE;
}

/** Open the real Finance product, handing off the current JWT so it's signed in. */
export function openFinanceApp(workspace?: string): void {
  const base = financeAppUrl(workspace);
  const access = getAccessToken();
  const refresh = getRefreshToken();
  const url = access && refresh ? `${base}/?handoff=${access}~${refresh}` : base;
  window.location.assign(url);
}
