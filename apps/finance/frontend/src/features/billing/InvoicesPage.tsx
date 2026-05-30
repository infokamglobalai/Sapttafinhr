import { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import EmptyState from '@/components/EmptyState';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useInvoices } from './api';
import { formatINR } from '@/lib/money';
import InvoiceCreateModal from './InvoiceCreateModal';
import InvoiceDetailModal from './InvoiceDetailModal';

export default function InvoicesPage() {
  const { companyId } = useActiveCompany();
  const { data: invoices, isLoading } = useInvoices(companyId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
              {invoices?.map((inv) => {
                const totalGst = Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst);
                return (
                  <tr key={inv.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedId(inv.id)}>
                    <td className="px-4 py-2 font-medium text-brand-600">{inv.invoice_no}</td>
                    <td className="px-4 py-2 text-slate-500">{inv.date}</td>
                    <td className="px-4 py-2">{inv.customer_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(inv.taxable_amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{formatINR(totalGst)}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(inv.grand_total)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${Number(inv.balance_due) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatINR(inv.balance_due)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <span className={`rounded px-2 py-0.5 ${inv.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {inv.status}
                      </span>
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
    </div>
  );
}
