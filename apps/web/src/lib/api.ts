/**
 * Saptta unified API client.
 *
 * The platform talks to TWO surfaces of the fin-saptta (FIN) Django backend:
 *
 *   1. PLATFORM API (public schema)  — auth + SaaS subscriptions/entitlements.
 *      Lives on the bare host, e.g.  http://localhost:8000/api/v1
 *
 *   2. TENANT API (per-tenant schema) — business resources (masters, ledger,
 *      billing, …). django-tenants resolves the tenant from the SUBDOMAIN, so
 *      this base must point at the workspace host, e.g.
 *      http://acme.localhost:8000/api/v1
 *
 * Configure via env (see .env.example):
 *   VITE_PLATFORM_API_BASE_URL   default: http://localhost:8000/api/v1
 *   VITE_TENANT_API_BASE_URL     default: http://{workspace}.localhost:8000/api/v1
 *   VITE_DEFAULT_WORKSPACE       default: acme   (dev tenant created by bootstrap_dev)
 *
 * HR is a separate backend embedded as its own pages — it is NOT called from
 * here; see the HR embed route in the app shell.
 */

import {
  resolvePlatformApiBaseUrl,
  resolveTenantApiBaseTemplate,
} from './platform';

// ─── Configuration ───────────────────────────────────────────────────────
const PLATFORM_BASE: string = resolvePlatformApiBaseUrl();

const TENANT_BASE_TEMPLATE: string = resolveTenantApiBaseTemplate();

const DEFAULT_WORKSPACE: string =
  import.meta.env.VITE_DEFAULT_WORKSPACE || 'acme';

/** Build the tenant API base for a given workspace (subdomain). */
export function tenantBase(workspace?: string): string {
  const ws = (workspace || getWorkspace())?.trim();
  if (!ws) {
    // Keep fallback in dev so the app boots without login; in prod, fail loudly.
    if (import.meta.env.DEV) {
      const devWs = DEFAULT_WORKSPACE;
      return TENANT_BASE_TEMPLATE.includes('{workspace}')
        ? TENANT_BASE_TEMPLATE.replace('{workspace}', devWs)
        : TENANT_BASE_TEMPLATE;
    }
    throw new Error('No workspace selected. Please log in again.');
  }
  if (TENANT_BASE_TEMPLATE.includes('{workspace}')) {
    return TENANT_BASE_TEMPLATE.replace('{workspace}', ws);
  }
  return TENANT_BASE_TEMPLATE;
}

// ─── Token + workspace storage ───────────────────────────────────────────
const ACCESS_KEY = 'saptta_access';
const REFRESH_KEY = 'saptta_refresh';
const WORKSPACE_KEY = 'saptta_workspace';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function getWorkspace(): string | null {
  return localStorage.getItem(WORKSPACE_KEY);
}

export function setTokens(access: string | null, refresh?: string | null) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  else localStorage.removeItem(ACCESS_KEY);
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  }
}
export function setWorkspace(workspace: string | null) {
  if (workspace) localStorage.setItem(WORKSPACE_KEY, workspace);
  else localStorage.removeItem(WORKSPACE_KEY);
}
export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─── Core request helper (with one-shot token refresh on 401) ────────────
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type Surface = 'platform' | 'tenant';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Which backend surface to hit. Defaults to 'tenant'. */
  surface?: Surface;
  /** JSON body — serialized automatically. */
  body?: unknown;
  /** Send the Authorization header (default true). */
  auth?: boolean;
  /** Override workspace for this call (tenant surface only). */
  workspace?: string;
}

function baseFor(surface: Surface, workspace?: string): string {
  return surface === 'platform' ? PLATFORM_BASE : tenantBase(workspace);
}

async function rawRequest<T>(path: string, opts: RequestOptions, accessToken: string | null): Promise<T> {
  const { surface = 'tenant', body, auth = true, workspace, headers, ...rest } = opts;
  const url = `${baseFor(surface, workspace)}${path}`;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (auth && accessToken) {
    finalHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
        ? body
        : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && (data as any).detail) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, String(msg), data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Authenticated request with automatic one-time refresh on 401. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const access = getAccessToken();
  try {
    return await rawRequest<T>(path, opts, access);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && opts.auth !== false) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return await rawRequest<T>(path, opts, refreshed);
      }
    }
    throw err;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = getRefreshToken();
  if (!refresh) return null;

  refreshInFlight = (async () => {
    try {
      const data = await rawRequest<{ access: string; refresh?: string }>(
        '/auth/refresh/',
        { surface: 'platform', method: 'POST', body: { refresh }, auth: false },
        null,
      );
      setTokens(data.access, data.refresh ?? undefined);
      return data.access;
    } catch {
      clearAuth();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ─── Auth ────────────────────────────────────────────────────────────────
export interface BackendUser {
  id: number | string;
  email: string;
  full_name: string;
  is_staff: boolean;
}

/** Log in against the FIN platform (public schema). Returns the access token. */
export async function login(
  email: string,
  password: string,
  workspace?: string,
): Promise<{ access: string; refresh: string; workspace?: string | null }> {
  const data = await rawRequest<{ access: string; refresh: string; workspace?: string | null }>(
    '/auth/login/',
    { surface: 'platform', method: 'POST', body: { email, password }, auth: false },
    null,
  );
  setTokens(data.access, data.refresh);
  // Prefer an explicitly passed workspace, else the one the backend resolved for
  // this user (their owned tenant). Without this the SPA would fall back to the
  // default workspace and show another tenant's data.
  const ws = workspace || data.workspace || null;
  if (ws) setWorkspace(ws);
  return data;
}

export async function fetchMe(): Promise<BackendUser> {
  return request<BackendUser>('/auth/me/', { surface: 'platform' });
}

// ─── Account safety: password reset + email verification ──────────────────
type Msg = { detail: string };

export function requestPasswordReset(email: string): Promise<Msg> {
  return rawRequest<Msg>('/auth/password/reset/', { surface: 'platform', method: 'POST', body: { email }, auth: false }, null);
}

export function confirmPasswordReset(uid: string, token: string, newPassword: string): Promise<Msg> {
  return rawRequest<Msg>(
    '/auth/password/reset/confirm/',
    { surface: 'platform', method: 'POST', body: { uid, token, new_password: newPassword }, auth: false },
    null,
  );
}

export function requestEmailVerification(email: string): Promise<Msg> {
  return rawRequest<Msg>('/auth/verify-email/request/', { surface: 'platform', method: 'POST', body: { email }, auth: false }, null);
}

export function confirmEmailVerification(token: string): Promise<Msg & { email?: string }> {
  return rawRequest<Msg & { email?: string }>(
    '/auth/verify-email/confirm/',
    { surface: 'platform', method: 'POST', body: { token }, auth: false },
    null,
  );
}

export interface SignupResult {
  access: string;
  refresh: string;
  workspace: string;
  products: ProductSlug[];
  user: BackendUser;
}

/**
 * Self-serve signup → provisions a workspace on the FIN platform and signs the
 * user in. Persists tokens + the new workspace so subsequent tenant API calls
 * target it.
 */
export async function signup(payload: {
  email: string;
  password: string;
  full_name?: string;
  company_name: string;
  plan_id?: string;
  products?: ProductSlug[];
}): Promise<SignupResult> {
  const data = await rawRequest<SignupResult>(
    '/saas/signup/',
    { surface: 'platform', method: 'POST', body: payload, auth: false },
    null,
  );
  setTokens(data.access, data.refresh);
  if (data.workspace) setWorkspace(data.workspace);
  return data;
}

// ─── Billing (subscription checkout) ──────────────────────────────────────
export interface BillingOrder {
  order_id: string;
  amount: number; // paise
  currency: string;
  key_id: string;
  plan: string;
}

/**
 * Create a payment-gateway order for a plan. Throws ApiError(503) when billing
 * isn't configured on the server — callers should surface a friendly message.
 */
export function createBillingOrder(planId: string, cycle: 'monthly' | 'annual' = 'monthly'): Promise<BillingOrder> {
  return request<BillingOrder>('/saas/billing/order/', {
    surface: 'platform',
    method: 'POST',
    body: { plan_id: planId, cycle },
  });
}

// ─── Customer billing portal: my subscription ─────────────────────────────
export interface SaasInvoiceDTO {
  id: number;
  number: string;
  period_start: string;
  period_end: string;
  taxable_amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  tax_rate: string;
  sac_code: string;
  place_of_supply: string;
  customer_gstin: string;
  amount: string;
  due_date: string;
  status: 'OPEN' | 'PAID' | 'VOID';
  paid_at: string | null;
}
export interface MySubscription {
  workspace: string;
  company: string;
  plan: { code: string; name: string; monthly_price: string; annual_price: string };
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  is_active: boolean;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  products: ('FIN' | 'HR')[];
  entitlements: { product: string; status: string; current_period_end: string | null }[];
  invoices: SaasInvoiceDTO[];
}

/** The signed-in workspace's subscription (resolved from the tenant subdomain). */
export function fetchMySubscription(): Promise<MySubscription> {
  return request<MySubscription>('/saas/my-subscription/', { surface: 'tenant' });
}

// ─── HR stats (proxied by FIN from the HR backend) ────────────────────────
export interface HrStats {
  workspace: string;
  total_employees: number;
  present_today: number;
  on_leave_today: number;
  pending_leave_approvals: number;
  pending_regularizations: number;
  new_joiners_this_month: number;
}

/** Live HR KPIs for a workspace (FIN proxies to HR with the shared secret). */
export function fetchHrStats(workspace?: string): Promise<HrStats> {
  const ws = workspace || getWorkspace() || '';
  return request<HrStats>(`/auth/hr-stats/?workspace=${encodeURIComponent(ws)}`, { surface: 'platform' });
}

// ─── Entitlements / products ──────────────────────────────────────────────
export type ProductCode = 'FIN' | 'HR';
export type ProductSlug = 'finance' | 'hrms';

const PRODUCT_SLUG: Record<ProductCode, ProductSlug> = { FIN: 'finance', HR: 'hrms' };

interface EntitlementDTO {
  product: ProductCode;
  status: string;
}
interface SubscriptionDTO {
  status: string;
  entitlements?: EntitlementDTO[];
}

// ACTIVE = paid subscription. TRIAL = legacy rows from before pay-first (keep access).
// PENDING (signed up, unpaid) does NOT grant product access.
const ACTIVE_STATUSES = new Set(['ACTIVE', 'TRIAL']);

/**
 * Best-effort: derive the active product slugs for the current user.
 *
 * NOTE: FIN currently exposes /saas/subscriptions/ (list) but has no
 * "my subscription" endpoint and the JWT carries no tenant claim, so this
 * cannot reliably scope to a single tenant yet. Until a `/saas/me/` style
 * endpoint exists (see backend gaps), we union entitlements from the
 * returned subscriptions. Returns null if the call fails.
 */
export async function fetchProducts(): Promise<ProductSlug[] | null> {
  try {
    const res = await request<{ results?: SubscriptionDTO[] } | SubscriptionDTO[]>(
      '/saas/subscriptions/',
      { surface: 'platform' },
    );
    const subs = Array.isArray(res) ? res : res.results ?? [];
    const slugs = new Set<ProductSlug>();
    for (const sub of subs) {
      if (!ACTIVE_STATUSES.has(sub.status)) continue;
      for (const e of sub.entitlements ?? []) {
        if (ACTIVE_STATUSES.has(e.status) && PRODUCT_SLUG[e.product]) {
          slugs.add(PRODUCT_SLUG[e.product]);
        }
      }
    }
    return [...slugs];
  } catch {
    return null;
  }
}

// ─── Dev-only helpers ─────────────────────────────────────────────────────
/** Instantly activate the current user's subscription (DEBUG=True only). */
export function devActivateSubscription(): Promise<{ status: string; workspace: string }> {
  return request('/saas/dev/activate/', { surface: 'platform', method: 'POST' });
}

// ─── Generic tenant resource helpers (for wiring FIN dashboard pages) ─────
export const api = {
  get: <T>(path: string, opts: RequestOptions = {}) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts: RequestOptions = {}) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts: RequestOptions = {}) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts: RequestOptions = {}) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts: RequestOptions = {}) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
