import { useState } from 'react';
import { FileText, Mail, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useInvoices } from './api';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import InvoiceCreateModal from './InvoiceCreateModal';
import InvoiceDetailModal from './InvoiceDetailModal';

export default function InvoicesPage() {
  const { companyId } = useActiveCompany();
  const { data: invoices, isLoading } = useInvoices(companyId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reminderId, setReminderId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Invoices"
        subtitle="GST invoices to customers. Posts a balanced journal entry automatically."
        action={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-1" /> New Tax Invoice
          </button>
        }
      />

      <PageHint storageKey="invoices">
        GST splits automatically by place of supply: <strong>same state → CGST + SGST</strong>,
        different state → <strong>IGST</strong>. Click any row to see the breakup and the journal entry.
      </PageHint>

      <div className="card overflow-hidden p-0">
        {!isLoading && invoices?.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first Tax Invoice — we'll post it to the ledger with the correct GST split."
            actionLabel="Create your first invoice"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
              {invoices?.map((inv) => {
                const totalGst = Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst);
                const hasBalance = Number(inv.balance_due) > 0;
                return (
                  <tr key={inv.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedId(inv.id)}>
                    <td className="px-4 py-2 font-medium text-brand-600">{inv.invoice_no}</td>
                    <td className="px-4 py-2 text-slate-500">{inv.date}</td>
                    <td className="px-4 py-2">{inv.customer_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(inv.taxable_amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{formatINR(totalGst)}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(inv.grand_total)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${hasBalance ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatINR(inv.balance_due)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <span className={`rounded px-2 py-0.5 ${inv.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {hasBalance && (
                        <button
                          title="Draft payment reminder email"
                          onClick={(e) => { e.stopPropagation(); setReminderId(inv.id); }}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 border border-violet-200"
                        >
                          <Mail size={12} /> Remind
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <InvoiceCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <InvoiceDetailModal
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onRecordPayment={() => { window.location.hash = '/receipts'; }}
      />
      <PaymentReminderModal invoiceId={reminderId} onClose={() => setReminderId(null)} />
    </div>
  );
}

/* ─── Payment Reminder Modal ─────────────────────────────────────────────── */
interface ReminderResult {
  invoice_no: string;
  customer: string;
  customer_email: string;
  amount_due: string;
  days_overdue: number;
  email_draft: string;
}

function PaymentReminderModal({ invoiceId, onClose }: { invoiceId: number | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['smart-reminder', invoiceId],
    queryFn: async () => (await api.post<ReminderResult>(`/billing/invoices/${invoiceId}/smart-reminder/`, {})).data,
    enabled: invoiceId != null,
    staleTime: Infinity,
  });

  function handleCopy() {
    if (!data?.email_draft) return;
    navigator.clipboard.writeText(data.email_draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal open={invoiceId != null} onClose={onClose} title="✉ Draft Payment Reminder" size="lg">
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <span className="text-sm">Claude is drafting your reminder…</span>
        </div>
      )}
      {isError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to generate reminder. The invoice may already be fully paid, or the AI service is unavailable.
        </div>
      )}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Customer</div>
              <div className="font-medium">{data.customer}</div>
              {data.customer_email && <div className="text-xs text-slate-500 mt-0.5">{data.customer_email}</div>}
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Amount Due</div>
              <div className="font-semibold text-amber-700">₹{Number(data.amount_due).toLocaleString('en-IN')}</div>
              {data.days_overdue > 0 && (
                <div className="text-xs text-red-500 mt-0.5">{data.days_overdue} days overdue</div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email Draft</span>
              <button
                onClick={handleCopy}
                className="text-xs rounded px-2 py-0.5 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 max-h-72 overflow-y-auto font-sans">
              {data.email_draft}
            </pre>
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>Close</button>
            {data.customer_email && (
              <a
                href={`mailto:${data.customer_email}?subject=${encodeURIComponent(`Payment Reminder — Invoice ${data.invoice_no}`)}&body=${encodeURIComponent(data.email_draft)}`}
                className="btn-primary text-sm"
              >
                Open in Mail
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
