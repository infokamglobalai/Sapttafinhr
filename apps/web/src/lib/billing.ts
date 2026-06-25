/**
 * Razorpay checkout glue — resolves on success, failure, or modal dismiss.
 */
import { createBillingOrder, confirmBillingPayment, ApiError } from './api';

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

export type CheckoutResult =
  | { status: 'success'; plan?: string }
  | { status: 'activated'; plan?: string; message?: string }
  | { status: 'failed'; message: string }
  | { status: 'cancelled'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

export async function startCheckout(
  planId: string,
  opts: {
    cycle?: 'monthly' | 'annual';
    email?: string;
    name?: string;
    employees?: number;
    couponCode?: string;
  } = {},
): Promise<CheckoutResult> {
  let order;
  try {
    order = await createBillingOrder(
      planId,
      opts.cycle ?? 'monthly',
      opts.employees,
      opts.couponCode,
    );
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 503) {
        return {
          status: 'unavailable',
          message:
            err.message ||
            'Razorpay is not configured. Use a 100% coupon (e.g. DEMO100) or add Razorpay keys to .env.',
        };
      }
      if (err.status === 502 || err.status === 401) {
        return {
          status: 'error',
          message: err.message || 'Payment gateway error. Check Razorpay keys in .env.',
        };
      }
      if (err.status === 400) {
        return { status: 'error', message: err.message || 'Invalid coupon or plan.' };
      }
    }
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not start checkout.' };
  }

  if (order.free_activation) {
    return {
      status: 'activated',
      plan: order.plan || planId,
      message: 'Subscription activated with coupon.',
    };
  }

  if (!order.order_id || !order.key_id) {
    return { status: 'error', message: 'Invalid checkout response from server.' };
  }

  const ok = await loadRazorpay();
  if (!ok) return { status: 'error', message: 'Could not load the payment widget. Check your connection.' };

  const Razorpay = (window as any).Razorpay;

  return new Promise<CheckoutResult>((resolve) => {
    let settled = false;
    const finish = (result: CheckoutResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const rzp = new Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Saptta',
      description: `Subscription — ${order.plan}`,
      prefill: { email: opts.email, name: opts.name },
      theme: { color: '#FF6D00' },
      handler: async (response: { razorpay_payment_id?: string; razorpay_order_id?: string }) => {
        const paymentId = response?.razorpay_payment_id;
        const orderId = response?.razorpay_order_id || order.order_id;
        if (paymentId) {
          try {
            await confirmBillingPayment(paymentId, orderId);
          } catch {
            // Webhook may still activate; success page polls entitlements.
          }
        }
        finish({ status: 'success', plan: order.plan || planId });
      },
      modal: {
        ondismiss: () => {
          finish({
            status: 'cancelled',
            message: 'Payment was cancelled. No amount was charged.',
          });
        },
      },
    });

    rzp.on('payment.failed', (response: { error?: { description?: string; reason?: string } }) => {
      const detail =
        response?.error?.description ||
        response?.error?.reason ||
        'Your payment could not be completed. Please try again.';
      finish({ status: 'failed', message: detail });
    });

    rzp.open();
  });
}
