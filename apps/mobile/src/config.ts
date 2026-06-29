/**
 * API base URL for Saptta backends (via nginx front door).
 *
 * Android emulator:  http://10.0.2.2:8080  (maps to host localhost)
 * Physical device:   http://<your-pc-lan-ip>:8080
 * iOS simulator:     http://localhost:8080
 *
 * Override with EXPO_PUBLIC_API_BASE_URL in .env
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://10.0.2.2:8080';

export const AUTH_LOGIN = `${API_BASE_URL}/api/v1/auth/hr-staff-login/`;
export const AUTH_MFA = `${API_BASE_URL}/api/v1/auth/hr-staff-login/mfa/`;
export const MOBILE_API = `${API_BASE_URL}/api/mobile/v1`;
