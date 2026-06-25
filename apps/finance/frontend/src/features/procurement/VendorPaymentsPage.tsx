import { useState } from 'react';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useVendorPayments, type VendorPayment } from './api';
import { formatMoney } from '@/lib/money';
import VendorPaymentCreateModal from './VendorPaymentCreateModal';

export default function VendorPaymentsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useVendorPayments(companyId);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<VendorPayment | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Vendor Payments" subtitle="Outgoing payments to vendors against bills."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New payment</button>}
      />
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Payment #</th><th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {data?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No vendor payments yet.</td></tr>}
            {data?.map((p) => (
              <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(p)}>
                <td className="px-4 py-2 font-medium text-brand-600">{p.payment_no}</td>
                <td className="px-4 py-2 text-slate-500">{p.date}</td>
                <td className="px-4 py-2">{p.vendor_name}</td>
                <td className="px-4 py-2 text-xs">{p.mode}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.reference || '—'}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{formatMoney(p.amount, p.currency || 'INR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VendorPaymentCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Payment ${viewing.payment_no}` : ''}
        subtitle={viewing?.vendor_name}
        size="lg"
        sections={viewing ? [{
          title: 'Payment',
          fields: [
            f('Payment #', viewing.payment_no, { mono: true }),
            f('Date', viewing.date),
            f('Vendor', viewing.vendor_name),
            f('Mode', viewing.mode),
            f('Reference', viewing.reference, { mono: true }),
            f('Amount', formatMoney(viewing.amount, viewing.currency || 'INR')),
            f('Paid From', viewing.paid_from_code, { mono: true }),
            f('Status', viewing.status),
          ],
        }] : []}
        nestedTables={viewing ? [{
          title: 'Allocations',
          rows: viewing.allocations ?? [],
          emptyText: 'No allocations (unapplied / on-account)',
          columns: [
            { key: 'bill_no', label: 'Bill #', mono: true },
            { key: 'amount', label: 'Amount', align: 'right', render: (r: any) => formatMoney(r.amount, viewing.currency || 'INR') },
          ],
        }] : []}
      />
    </div>
  );
}
