import { useEffect, useState } from 'react';
import { fetchPortalInvoices, createRazorpayOrder, verifyRazorpaySignature, type PortalInvoicesResponse } from './api';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Read ?token= from either the hash query (#/portal?token=) or the page query. */
function readToken(): string {
  const hash = window.location.hash; // e.g. "#/portal?token=abc"
  const qIndex = hash.indexOf('?');
  if (qIndex >= 0) {
    const p = new URLSearchParams(hash.slice(qIndex + 1));
    if (p.get('token')) return p.get('token') as string;
  }
  return new URLSearchParams(window.location.search).get('token') ?? '';
}

const inr = (v: string) =>
  Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default function CustomerPortalView() {
  const [token] = useState(readToken);
  const [data, setData] = useState<PortalInvoicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { setError('This link is missing its access token.'); setLoading(false); return; }
    fetchPortalInvoices(token)
      .then(setData)
      .catch((e) => setError(e?.response?.status === 403 ? 'This link is invalid or has been revoked.' : 'Could not load your invoices. Please try again later.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async (invoiceId: number) => {
    setPayingInvoiceId(invoiceId);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
      }

      const order = await createRazorpayOrder(token, invoiceId);
      const invoice = data?.invoices.find((i) => i.id === invoiceId);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: data?.party.name || 'fin-saptta',
        description: `Payment for Invoice #${invoice?.invoice_no}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await verifyRazorpaySignature({
              token,
              invoice_id: invoiceId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            alert('Payment successful!');
            fetchPortalInvoices(token).then(setData);
          } catch (err) {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: data?.party.name,
        },
        theme: {
          color: '#10b981', // emerald-500
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to initialize payment.');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const totalDue = data?.invoices.reduce((s, i) => s + Number(i.balance_due), 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">fs</div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Customer Portal</div>
              <div className="text-xs text-slate-500">Your invoices & balances</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading && <div className="py-20 text-center text-slate-400">Loading your invoices…</div>}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <div className="text-base font-semibold text-red-800">Can't open this portal</div>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <p className="mt-3 text-xs text-red-600">If you think this is a mistake, contact the company that sent you this link.</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Account</div>
                <h1 className="text-xl font-bold text-slate-900">{data.party.name}</h1>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right">
                <div className="text-xs text-slate-500">Total outstanding</div>
                <div className={`text-lg font-bold ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>{inr(String(totalDue))}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Due date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Balance due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.invoices.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No invoices yet.</td></tr>
                  )}
                  {data.invoices.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{i.invoice_no}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(i.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-slate-600">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">{inr(i.grand_total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{inr(i.balance_due)}</td>
                      <td className="px-4 py-3 text-center">
                        {i.is_paid
                          ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                          : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Due</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!i.is_paid && (
                          <button
                            onClick={() => handlePay(i.id)}
                            disabled={payingInvoiceId === i.id}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
                          >
                            {payingInvoiceId === i.id ? 'Processing…' : 'Pay Now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-center text-xs text-slate-400">
              This is a private, read-only view. For questions about an invoice, reply to the email it came from.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
