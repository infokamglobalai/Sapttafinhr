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
  // Clear any impersonation session/backup so logout never leaves stale state.
  localStorage.removeItem('saptta_impersonating');
  localStorage.removeItem('saptta_admin_access');
  localStorage.removeItem('saptta_admin_refresh');
  localStorage.removeItem('saptta_admin_workspace');
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
  const ws = workspace || data.workspace || null;
  if (ws) setWorkspace(ws);
  return data;
}

/** HR staff (employee / team lead) login via unified platform page → HR SSO redirect. */
export async function hrStaffLogin(
  email: string,
  password: string,
  workspace?: string,
  nextPath = '/',
): Promise<{ redirect_url: string; workspace: string; auth_type: string }> {
  const platformUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
  return rawRequest<{ redirect_url: string; workspace: string; auth_type: string }>(
    '/auth/hr-staff-login/',
    {
      surface: 'platform',
      method: 'POST',
      body: {
        email,
        password,
        workspace: workspace || getWorkspace() || undefined,
        platform_url: platformUrl,
        next: nextPath,
      },
      auth: false,
    },
    null,
  );
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
  /** True when the workspace is still being built in the background (HTTP 202).
   *  The caller should poll fetchProvisioningStatus() until ready. */
  provisioning?: boolean;
  status?: 'PENDING' | 'PROVISIONING' | 'READY' | 'FAILED';
}

export interface ProvisioningStatus {
  workspace: string | null;
  status: 'PENDING' | 'PROVISIONING' | 'READY' | 'FAILED';
  ready: boolean;
  failed: boolean;
  products: ProductSlug[];
}

/** Poll whether the signed-in user's workspace has finished provisioning. */
export function fetchProvisioningStatus(): Promise<ProvisioningStatus> {
  return request<ProvisioningStatus>('/saas/provisioning-status/', { surface: 'platform' });
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
  country?: string;
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
export function createBillingOrder(
  planId: string,
  cycle: 'monthly' | 'annual' = 'monthly',
  employees?: number,
): Promise<BillingOrder> {
  return request<BillingOrder>('/saas/billing/order/', {
    surface: 'platform',
    method: 'POST',
    body: { plan_id: planId, cycle, employees },
  });
}

/** Verify Razorpay payment server-side and activate subscription immediately. */
export function confirmBillingPayment(paymentId: string, orderId?: string): Promise<{ status: string; workspace: string }> {
  return request('/saas/billing/confirm/', {
    surface: 'platform',
    method: 'POST',
    body: { payment_id: paymentId, order_id: orderId },
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

// ─── Super-admin platform API (web /superadmin) ───────────────────────────
export interface AdminStats {
  total_companies: number;
  active_subscriptions: number;
  pending_subscriptions: number;
  cancelled_subscriptions: number;
  mrr: string;
  finance_seats: number;
  hr_seats: number;
  open_invoices: number;
  paid_revenue: string;
}

export interface AdminCompanySubscription {
  id: number;
  status: string;
  is_active: boolean;
  plan_code: string;
  plan_name: string;
  monthly_price: string;
  current_period_end: string | null;
  products: ProductSlug[];
}

export interface AdminCompany {
  schema_name: string;
  name: string;
  billing_email: string;
  created_on: string;
  is_active: boolean;
  subscription: AdminCompanySubscription | null;
}

export interface AdminPlan {
  id: number;
  code: string;
  name: string;
  monthly_price: string;
  annual_price: string;
}

export interface AdminInvoice {
  id: number;
  number: string;
  amount: string;
  status: 'OPEN' | 'PAID' | 'VOID';
  due_date: string;
  period_start: string;
  period_end: string;
  subscription: number;
}

/** DRF list endpoints may be paginated ({results}) or a plain array. */
function unwrapList<T>(res: T[] | { results?: T[] }): T[] {
  return Array.isArray(res) ? res : res.results ?? [];
}

export function fetchAdminStats(): Promise<AdminStats> {
  return request<AdminStats>('/saas/admin/stats/', { surface: 'platform' });
}

export async function fetchAdminCompanies(): Promise<AdminCompany[]> {
  return unwrapList(await request<AdminCompany[] | { results?: AdminCompany[] }>('/saas/admin/companies/', { surface: 'platform' }));
}

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
  return unwrapList(await request<AdminPlan[] | { results?: AdminPlan[] }>('/saas/plans/', { surface: 'platform' }));
}

export async function fetchAdminInvoices(): Promise<AdminInvoice[]> {
  return unwrapList(await request<AdminInvoice[] | { results?: AdminInvoice[] }>('/saas/invoices/', { surface: 'platform' }));
}

export function activateSubscription(id: number): Promise<unknown> {
  return request(`/saas/subscriptions/${id}/activate/`, { surface: 'platform', method: 'POST' });
}

export function suspendSubscription(id: number): Promise<unknown> {
  return request(`/saas/subscriptions/${id}/suspend/`, { surface: 'platform', method: 'POST' });
}

export function changeSubscriptionPlan(id: number, planId: number): Promise<unknown> {
  return request(`/saas/subscriptions/${id}/change_plan/`, { surface: 'platform', method: 'POST', body: { plan_id: planId } });
}

// ─── Super-admin: company drill-down, users, lifecycle, billing, plans ────
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_verified: boolean;
  date_joined: string;
  is_owner: boolean;
  reset_link?: string | null;
}

export interface AdminEntitlement {
  id: number;
  product: 'FIN' | 'HR';
  product_slug: ProductSlug;
  status: string;
  is_active: boolean;
}

export interface AdminCompanyDetail {
  schema_name: string;
  name: string;
  billing_email: string;
  created_on: string;
  is_active: boolean;
  domains: string[];
  subscription: null | {
    id: number;
    status: string;
    is_active: boolean;
    plan_id: number;
    plan_code: string;
    plan_name: string;
    monthly_price: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancelled_at: string | null;
    entitlements: AdminEntitlement[];
  };
  users: AdminUser[];
  invoices: AdminInvoice[];
  audit: { actor: string; action: string; detail: Record<string, unknown>; at: string }[];
}

export interface AuditRow {
  id: number;
  actor: string;
  action: string;
  target_schema: string;
  target_label: string;
  detail: Record<string, unknown>;
  at: string;
}

export interface AdminAnalytics {
  signups_by_month: { month: string; signups: number; total: number }[];
  status_mix: Record<string, number>;
  plan_mix: { plan: string; code: string; count: number }[];
  mrr: string;
  total_companies: number;
}

export function fetchAdminCompanyDetail(schema: string): Promise<AdminCompanyDetail> {
  return request<AdminCompanyDetail>(`/saas/admin/companies/${encodeURIComponent(schema)}/`, { surface: 'platform' });
}

export function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  return request<AdminAnalytics>('/saas/admin/analytics/', { surface: 'platform' });
}

export function fetchAdminAudit(schema?: string): Promise<AuditRow[]> {
  const q = schema ? `?schema=${encodeURIComponent(schema)}` : '';
  return request<AuditRow[]>(`/saas/admin/audit/${q}`, { surface: 'platform' });
}

// Users
export function createCompanyUser(
  schema: string,
  payload: { email: string; full_name?: string; password?: string; make_owner?: boolean },
): Promise<AdminUser> {
  return request<AdminUser>(`/saas/admin/companies/${encodeURIComponent(schema)}/users/`, {
    surface: 'platform', method: 'POST', body: payload,
  });
}

export function resetUserPassword(userId: number): Promise<{ detail: string; reset_link: string; emailed: boolean }> {
  return request(`/saas/admin/users/${userId}/reset-password/`, { surface: 'platform', method: 'POST' });
}

export function setUserActive(userId: number, isActive: boolean): Promise<AdminUser> {
  return request<AdminUser>(`/saas/admin/users/${userId}/set-active/`, {
    surface: 'platform', method: 'POST', body: { is_active: isActive },
  });
}

// Lifecycle
export function provisionCompany(payload: {
  company_name: string; email: string; full_name?: string;
  plan_id?: string; products?: ProductSlug[]; country?: string; password?: string;
}): Promise<{ schema_name: string; name: string; billing_email: string; reset_link?: string | null }> {
  return request('/saas/admin/companies/new/', { surface: 'platform', method: 'POST', body: payload });
}

export function setCompanyActive(schema: string, active: boolean): Promise<{ schema_name: string; is_active: boolean }> {
  return request(`/saas/admin/companies/${encodeURIComponent(schema)}/lifecycle/`, {
    surface: 'platform', method: 'POST', body: { active },
  });
}

export function deleteCompany(schema: string): Promise<{ deleted: string; name: string }> {
  return request(`/saas/admin/companies/${encodeURIComponent(schema)}/lifecycle/?confirm=${encodeURIComponent(schema)}`, {
    surface: 'platform', method: 'DELETE',
  });
}

// Billing ops
export function generateCompanyInvoice(schema: string, amount?: number): Promise<AdminInvoice> {
  return request<AdminInvoice>(`/saas/admin/companies/${encodeURIComponent(schema)}/invoices/`, {
    surface: 'platform', method: 'POST', body: amount != null ? { amount } : {},
  });
}

export function invoiceAction(invoiceId: number, action: 'mark-paid' | 'void'): Promise<AdminInvoice> {
  return request<AdminInvoice>(`/saas/admin/invoices/${invoiceId}/${action}/`, { surface: 'platform', method: 'POST' });
}

export function toggleEntitlement(subId: number, product: 'FIN' | 'HR', enable: boolean): Promise<AdminEntitlement> {
  return request<AdminEntitlement>(`/saas/admin/subscriptions/${subId}/entitlement/`, {
    surface: 'platform', method: 'POST', body: { product, enable },
  });
}

// Plans CRUD
export interface AdminPlanFull {
  id: number; code: string; name: string; description: string;
  monthly_price: string; annual_price: string; features: Record<string, unknown>; is_active: boolean;
}

export async function fetchAdminPlansFull(): Promise<AdminPlanFull[]> {
  return unwrapList(await request<AdminPlanFull[] | { results?: AdminPlanFull[] }>('/saas/admin/plans/', { surface: 'platform' }));
}

export function createPlan(payload: Partial<AdminPlanFull>): Promise<AdminPlanFull> {
  return request<AdminPlanFull>('/saas/admin/plans/', { surface: 'platform', method: 'POST', body: payload });
}

export function updatePlan(id: number, payload: Partial<AdminPlanFull>): Promise<AdminPlanFull> {
  return request<AdminPlanFull>(`/saas/admin/plans/${id}/`, { surface: 'platform', method: 'PATCH', body: payload });
}

export function deletePlan(id: number): Promise<unknown> {
  return request(`/saas/admin/plans/${id}/`, { surface: 'platform', method: 'DELETE' });
}

// ─── Super-admin: directory scaling + tenant detail (Phase 7) ─────────────
export interface CompaniesPage { count: number; page: number; page_size: number; results: AdminCompany[]; }
export interface CompanyUsage {
  fin: { invoices: number; parties: number; items: number; journal_entries: number; available: boolean };
  hr: { headcount: number | null };
  onboarding: { has_subscription: boolean; subscription_active: boolean; fin_seeded: boolean; has_first_invoice: boolean; hr_provisioned: boolean };
}
export interface TenantNote { id: number; author: string; body: string; at: string }

export function fetchAdminCompaniesPaged(params: {
  q?: string; status?: string; product?: string; plan?: string; sort?: string; page?: number; page_size?: number;
} = {}): Promise<CompaniesPage> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v)); });
  const qs = sp.toString();
  return request<CompaniesPage>(`/saas/admin/companies/${qs ? '?' + qs : ''}`, { surface: 'platform' });
}

export function fetchCompanyUsage(schema: string): Promise<CompanyUsage> {
  return request<CompanyUsage>(`/saas/admin/companies/${encodeURIComponent(schema)}/usage/`, { surface: 'platform' });
}
export function fetchCompanyNotes(schema: string): Promise<TenantNote[]> {
  return request<TenantNote[]>(`/saas/admin/companies/${encodeURIComponent(schema)}/notes/`, { surface: 'platform' });
}
export function addCompanyNote(schema: string, body: string): Promise<TenantNote> {
  return request<TenantNote>(`/saas/admin/companies/${encodeURIComponent(schema)}/notes/`, { surface: 'platform', method: 'POST', body: { body } });
}

// ─── Super-admin: revenue & dunning (Phase 8) ─────────────────────────────
export interface RevenueReport {
  mrr: string; arr: string; paid_revenue: string; gst_collected: string;
  active_subscriptions: number; cancelled_this_month: number; churn_rate: number;
  revenue_by_month: { month: string; amount: string }[];
}
export interface DunningRow {
  id: number; company: string; schema: string; billing_email: string;
  status: string; plan: string; current_period_end: string; days_overdue: number;
}
export function fetchRevenue(): Promise<RevenueReport> {
  return request<RevenueReport>('/saas/admin/revenue/', { surface: 'platform' });
}
export function fetchDunning(within = 7): Promise<{ count: number; results: DunningRow[] }> {
  return request(`/saas/admin/dunning/?within=${within}`, { surface: 'platform' });
}
export function remindSubscription(id: number): Promise<{ status: string; to: string }> {
  return request(`/saas/admin/subscriptions/${id}/remind/`, { surface: 'platform', method: 'POST' });
}
export function extendSubscription(id: number, days: number): Promise<unknown> {
  return request(`/saas/admin/subscriptions/${id}/extend/`, { surface: 'platform', method: 'POST', body: { days } });
}

/** Download a CSV export (auth-protected) and trigger a browser save. */
export async function downloadAdminCsv(path: string, filename: string): Promise<void> {
  const res = await fetch(`${PLATFORM_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new ApiError(res.status, 'Export failed', null);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

// ─── Super-admin: access & governance (Phase 10) ──────────────────────────
export interface PlatformUser {
  id: number; email: string; full_name: string; is_active: boolean;
  is_staff: boolean; is_verified: boolean; workspace: string;
}
export function searchUsers(q: string): Promise<PlatformUser[]> {
  return request<PlatformUser[]>(`/saas/admin/users/?q=${encodeURIComponent(q)}`, { surface: 'platform' });
}
export function setUserStaff(id: number, isStaff: boolean): Promise<{ id: number; email: string; is_staff: boolean }> {
  return request(`/saas/admin/users/${id}/set-staff/`, { surface: 'platform', method: 'POST', body: { is_staff: isStaff } });
}

// ─── Super-admin: announcements (Phase 11) ────────────────────────────────
export interface Announcement {
  id: number; title: string; body: string; level: 'INFO' | 'WARNING' | 'CRITICAL';
  is_active: boolean; is_live: boolean; starts_at: string | null; ends_at: string | null;
  created_by: string; created_at: string;
}
export function fetchAnnouncements(): Promise<Announcement[]> {
  return request<Announcement[]>('/saas/admin/announcements/', { surface: 'platform' });
}
export function createAnnouncement(payload: { title: string; body?: string; level?: string; starts_at?: string; ends_at?: string }): Promise<Announcement> {
  return request<Announcement>('/saas/admin/announcements/', { surface: 'platform', method: 'POST', body: payload });
}
export function updateAnnouncement(id: number, payload: Partial<Announcement>): Promise<Announcement> {
  return request<Announcement>(`/saas/admin/announcements/${id}/`, { surface: 'platform', method: 'PATCH', body: payload });
}
export function deleteAnnouncement(id: number): Promise<unknown> {
  return request(`/saas/admin/announcements/${id}/`, { surface: 'platform', method: 'DELETE' });
}
export function fetchActiveAnnouncements(): Promise<Announcement[]> {
  return request<Announcement[]>('/saas/announcements/active/', { surface: 'platform' });
}

// ─── Super-admin: observability (Phase 9) ─────────────────────────────────
export interface ActivityRow {
  source: 'console' | 'system';
  actor: string;
  action: string;
  target: string;
  label: string;
  detail: Record<string, unknown>;
  at: string;
}

export interface HealthService { status: 'up' | 'down'; latency_ms: number; detail: string; }
export interface HealthReport {
  overall: 'up' | 'degraded';
  services: Record<string, HealthService>;
  checked_at: string;
  hr_headcount?: { total_employees: number; tenants_counted: number; reachable: boolean };
}

export interface PaymentsLog {
  invoices: {
    id: number; number: string; company: string; schema: string; amount: string;
    status: 'OPEN' | 'PAID' | 'VOID'; period_start: string; period_end: string;
    paid_at: string | null; created_at: string;
  }[];
  webhook_events: { id: number; event_id: string; received_at: string }[];
  summary: { paid: number; open: number; void: number; webhook_events: number };
}

export interface JobsReport {
  jobs: { name: string; task: string; schedule: string }[];
  candidates: { active_lapsed: number; past_due_to_cancel: number };
  recent_auto_actions: { action: string; target: string; created_at: string }[];
}

export function fetchAdminActivity(params?: { actor?: string; action?: string; schema?: string; limit?: number }): Promise<{ count: number; results: ActivityRow[] }> {
  const q = new URLSearchParams();
  if (params?.actor) q.set('actor', params.actor);
  if (params?.action) q.set('action', params.action);
  if (params?.schema) q.set('schema', params.schema);
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return request(`/saas/admin/activity/${qs ? '?' + qs : ''}`, { surface: 'platform' });
}

export function fetchAdminHealth(hrRollup = false): Promise<HealthReport> {
  return request<HealthReport>(`/saas/admin/health/${hrRollup ? '?hr_rollup=1' : ''}`, { surface: 'platform' });
}

export function fetchAdminPayments(): Promise<PaymentsLog> {
  return request<PaymentsLog>('/saas/admin/payments/', { surface: 'platform' });
}

export function fetchAdminJobs(): Promise<JobsReport> {
  return request<JobsReport>('/saas/admin/jobs/', { surface: 'platform' });
}

export function runAdminJob(task: string): Promise<{ task: string; changed: number }> {
  return request('/saas/admin/jobs/', { surface: 'platform', method: 'POST', body: { task } });
}

// ─── Impersonation ("open workspace as admin") ────────────────────────────
const ADMIN_BACKUP_ACCESS = 'saptta_admin_access';
const ADMIN_BACKUP_REFRESH = 'saptta_admin_refresh';
const ADMIN_BACKUP_WS = 'saptta_admin_workspace';
const IMPERSONATING_KEY = 'saptta_impersonating';

export function getImpersonating(): string | null {
  return localStorage.getItem(IMPERSONATING_KEY);
}

/** Begin impersonating a tenant: back up the admin session, swap in the scoped
 *  token, then hard-navigate to the product switcher so the app re-bootstraps. */
export async function startImpersonation(schema: string, userId?: number): Promise<void> {
  const res = await request<{ access: string; refresh: string; workspace: string; company: string }>(
    `/saas/admin/companies/${encodeURIComponent(schema)}/impersonate/`,
    { surface: 'platform', method: 'POST', body: userId ? { user_id: userId } : undefined },
  );
  // Back up the current (admin) session so we can return to it.
  localStorage.setItem(ADMIN_BACKUP_ACCESS, getAccessToken() ?? '');
  localStorage.setItem(ADMIN_BACKUP_REFRESH, getRefreshToken() ?? '');
  localStorage.setItem(ADMIN_BACKUP_WS, getWorkspace() ?? '');
  setTokens(res.access, res.refresh);
  setWorkspace(res.workspace);
  localStorage.setItem(IMPERSONATING_KEY, res.company || schema);
  window.location.assign('/app');
}

/** End impersonation: restore the backed-up admin session and return to console. */
export function exitImpersonation(): void {
  const a = localStorage.getItem(ADMIN_BACKUP_ACCESS);
  const r = localStorage.getItem(ADMIN_BACKUP_REFRESH);
  const ws = localStorage.getItem(ADMIN_BACKUP_WS);
  if (a) setTokens(a, r || null);
  setWorkspace(ws || null);
  localStorage.removeItem(ADMIN_BACKUP_ACCESS);
  localStorage.removeItem(ADMIN_BACKUP_REFRESH);
  localStorage.removeItem(ADMIN_BACKUP_WS);
  localStorage.removeItem(IMPERSONATING_KEY);
  window.location.assign('/superadmin');
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
