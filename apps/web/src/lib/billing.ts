/**
 * Razorpay checkout glue.
 *
 * Loads the Razorpay checkout script on demand, creates an order on our backend
 * (which returns the order_id + public key_id), and opens the hosted checkout.
 * Payment success is confirmed server-side via the webhook (see
 * apps/saas/billing.py) — the gateway calls us; the browser just initiates.
 *
 * If billing isn't configured on the server, createBillingOrder throws
 * ApiError(503) and the caller shows a "billing unavailable" message.
 */
import { createBillingOrder, ApiError } from './api';

const RZP_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<boolean> | null = null;

function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<boolean>((resolve) => {
    const s = document.createElement('script');
    s.src = RZP_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface CheckoutResult {
  status: 'opened' | 'unavailable' | 'error';
  message?: string;
}

/**
 * Start checkout for a plan. Resolves once the widget is opened (or with a
 * reason it couldn't be). Actual activation is async via the webhook, so the
 * caller should refresh subscription state after the user returns.
 */
export async function startCheckout(
  planId: string,
  opts: { cycle?: 'monthly' | 'annual'; email?: string; name?: string; onPaid?: () => void } = {},
): Promise<CheckoutResult> {
  let order;
  try {
    order = await createBillingOrder(planId, opts.cycle ?? 'monthly');
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      return { status: 'unavailable', message: 'Online payments are not enabled yet. Please contact sales.' };
    }
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not start checkout.' };
  }

  const ok = await loadRazorpay();
  if (!ok) return { status: 'error', message: 'Could not load the payment widget. Check your connection.' };

  const Razorpay = (window as any).Razorpay;
  const rzp = new Razorpay({
    key: order.key_id,
    order_id: order.order_id,
    amount: order.amount,
    currency: order.currency,
    name: 'Saptta',
    description: `Subscription — ${order.plan}`,
    prefill: { email: opts.email, name: opts.name },
    theme: { color: '#FF6D00' },
    handler: () => {
      // Payment authorized in the widget; the webhook activates the
      // subscription server-side. Give the caller a chance to refresh.
      opts.onPaid?.();
    },
  });
  rzp.open();
  return { status: 'opened' };
}
