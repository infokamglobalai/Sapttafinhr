import { api } from './api';

const PLATFORM = (import.meta.env.VITE_PLATFORM_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const HR_BASE = (import.meta.env.VITE_HR_BASE_URL || 'http://hr.localhost:8080').replace(/\/+$/, '');

/** Open Saptta HR via FIN-minted SSO (works without a platform SPA session). */
export async function switchToHrApp(): Promise<void> {
  try {
    const { data } = await api.post<{ token: string }>('/auth/hr-sso-token/', {});
    const platform = encodeURIComponent(PLATFORM);
    const next = encodeURIComponent('/');
    window.location.assign(
      `${HR_BASE}/auth/sso/?token=${encodeURIComponent(data.token)}&next=${next}&platform=${platform}`,
    );
  } catch {
    window.location.assign(`${PLATFORM}/launch?to=hr`);
  }
}

/** Active product codes for this workspace (FIN, HR). */
export async function fetchOwnedProducts(): Promise<string[]> {
  try {
    const { data } = await api.get<{ products: string[] }>('/saas/my-subscription/');
    return data.products ?? [];
  } catch {
    return ['FIN'];
  }
}

export function platformBillingUrl(): string {
  return `${PLATFORM}/app/billing`;
}
