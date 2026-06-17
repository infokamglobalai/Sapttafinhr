/**
 * Resolve cross-app URLs for native Vite dev vs Docker/nginx (:8080).
 *
 * Env vars always win. When unset, we infer from `window.location` so local
 * dev works without copying port numbers into every .env file.
 */

const DOCKER_PLATFORM = 'http://localhost:8080';
const NATIVE_WEB_PORTS = new Set(['5173', '5175']);
const NATIVE_FINANCE_PORT = '5174';
const NATIVE_HR_PORT = '8001';
const NATIVE_API_PORT = '8000';

function currentLocation(): URL | null {
  if (typeof window === 'undefined') return null;
  return new URL(window.location.href);
}

function isNativeWebDev(loc: URL): boolean {
  const host = loc.hostname;
  return (host === 'localhost' || host === '127.0.0.1') && NATIVE_WEB_PORTS.has(loc.port);
}

/** Marketing site origin (login, switcher, logout, launch). */
export function platformSiteUrl(): string {
  const fromEnv =
    import.meta.env.VITE_PLATFORM_SITE_URL || import.meta.env.VITE_PLATFORM_BASE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/+$/, '');

  const loc = currentLocation();
  if (loc && isNativeWebDev(loc)) return loc.origin;
  if (loc?.port === '8080') return `${loc.protocol}//${loc.hostname}:8080`;
  if (loc) return loc.origin;
  return DOCKER_PLATFORM;
}

/** HR Django app origin. */
export function resolveHrBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_HR_BASE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/+$/, '');

  const loc = currentLocation();
  if (loc && isNativeWebDev(loc)) {
    return `${loc.protocol}//${loc.hostname}:${NATIVE_HR_PORT}`;
  }
  if (loc?.port === '8080') {
    return `${loc?.protocol ?? 'http:'}//hr.localhost:8080`;
  }
  if (loc?.hostname.endsWith('.localhost') && loc.port === '8080') {
    return `${loc.protocol}//hr.localhost:8080`;
  }
  return `http://localhost:${NATIVE_HR_PORT}`;
}

/** Finance SPA template — `{workspace}` is replaced per tenant. */
export function resolveFinanceAppBaseTemplate(): string {
  const fromEnv = import.meta.env.VITE_FINANCE_APP_BASE_URL;
  if (fromEnv) return String(fromEnv);

  const loc = currentLocation();
  if (loc && isNativeWebDev(loc)) {
    return `http://{workspace}.localhost:${NATIVE_FINANCE_PORT}`;
  }
  return 'http://{workspace}.localhost:8080';
}

/** FIN platform API base (public schema). */
export function resolvePlatformApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_PLATFORM_API_BASE_URL;
  if (fromEnv) return String(fromEnv);

  const loc = currentLocation();
  if (loc && isNativeWebDev(loc)) {
    return `http://${loc.hostname}:${NATIVE_API_PORT}/api/v1`;
  }
  return `${DOCKER_PLATFORM}/api/v1`;
}

/** FIN tenant API base template. */
export function resolveTenantApiBaseTemplate(): string {
  const fromEnv = import.meta.env.VITE_TENANT_API_BASE_URL;
  if (fromEnv) return String(fromEnv);

  const loc = currentLocation();
  if (loc && isNativeWebDev(loc)) {
    return `http://{workspace}.localhost:${NATIVE_API_PORT}/api/v1`;
  }
  return `http://{workspace}.localhost:8080/api/v1`;
}
