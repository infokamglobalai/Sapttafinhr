/**
 * Resolve active product entitlements for the signed-in workspace.
 * Prefer tenant-scoped my-subscription (authoritative) over the platform list.
 */
import {
  fetchMySubscription,
  fetchProducts,
  type MySubscription,
  type ProductSlug,
} from './api';

const ACTIVE_STATUSES = new Set(['ACTIVE', 'TRIAL']);
const PRODUCT_SLUG: Record<string, ProductSlug> = { FIN: 'finance', HR: 'hrms' };

export function slugsFromSubscription(sub: MySubscription | null | undefined): ProductSlug[] {
  if (!sub) return [];
  if (!ACTIVE_STATUSES.has(sub.status) && !sub.is_active) return [];

  const slugs = new Set<ProductSlug>();
  for (const code of sub.products ?? []) {
    const slug = PRODUCT_SLUG[code];
    if (slug) slugs.add(slug);
  }
  for (const ent of sub.entitlements ?? []) {
    if (ACTIVE_STATUSES.has(ent.status as 'ACTIVE' | 'TRIAL')) {
      const slug = PRODUCT_SLUG[ent.product];
      if (slug) slugs.add(slug);
    }
  }
  return [...slugs];
}

/** One-shot: best available product list for the current workspace. */
export async function resolveActiveProducts(): Promise<ProductSlug[]> {
  try {
    const sub = await fetchMySubscription();
    return slugsFromSubscription(sub);
  } catch {
    return [];
  }
}

/**
 * Poll until products are active (post-checkout / dev activate).
 * Prevents /app ↔ /app/billing redirect flicker.
 */
export async function waitForActiveProducts(opts?: {
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<ProductSlug[]> {
  const timeoutMs = opts?.timeoutMs ?? 20_000;
  const intervalMs = opts?.intervalMs ?? 750;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const slugs = await resolveActiveProducts();
    if (slugs.length > 0) return slugs;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return [];
}

/** Mark that checkout just completed — ProductSwitcher polls longer before sending back to billing. */
export function markPostCheckout(): void {
  try {
    sessionStorage.setItem('saptta_post_checkout', String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isRecentPostCheckout(maxAgeMs = 30_000): boolean {
  try {
    const raw = sessionStorage.getItem('saptta_post_checkout');
    if (!raw) return false;
    return Date.now() - Number(raw) < maxAgeMs;
  } catch {
    return false;
  }
}
