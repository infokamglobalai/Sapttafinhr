import { useState } from 'react';
import { Plus, ReceiptText } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import EmptyState from '@/components/EmptyState';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useVendorBills, type VendorBill } from './api';
import { formatINR } from '@/lib/money';
import VendorBillCreateModal from './VendorBillCreateModal';

export default function VendorBillsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useVendorBills(companyId);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<VendorBill | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Vendor Bills" subtitle="Bills you've received. Posting deducts TDS and claims GST input."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New Vendor Bill</button>}
      />
      <PageHint storageKey="vendor-bills">
        Each line picks its own expense account and TDS rate. We post: Dr expense + Dr GST input, Cr TDS payable, Cr Accounts Payable.
      </PageHint>
      <div className="card overflow-hidden p-0">
        {!isLoading && data?.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No vendor bills yet"
            description="When a vendor sends you a bill, record it here. We'll handle GST input, TDS deduction, and the journal entry automatically."
            actionLabel="Record your first bill"
            onAction={() => setOpen(true)}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Bill #</th><th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
              {data?.map((b) => {
                const gst = Number(b.cgst) + Number(b.sgst) + Number(b.igst);
                return (
                  <tr key={b.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(b)}>
                    <td className="px-4 py-2 font-medium text-brand-600">{b.bill_no}</td>
                    <td className="px-4 py-2 text-slate-500">{b.date}</td>
                    <td className="px-4 py-2">{b.vendor_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(b.taxable_amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{formatINR(gst)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{Number(b.tds_amount) ? formatINR(b.tds_amount) : '—'}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(b.grand_total)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-amber-700">{Number(b.balance_due) > 0 ? formatINR(b.balance_due) : '—'}</td>
                    <td className="px-4 py-2 text-xs"><span className={`rounded px-2 py-0.5 ${b.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{b.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <VendorBillCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Vendor Bill ${viewing.bill_no}` : ''}
        subtitle={viewing ? `${viewing.vendor_name} · ${viewing.status}` : ''}
        size="xl"
        sections={viewing ? [
          { title: 'Header',
            fields: [
              f('Bill #', viewing.bill_no, { mono: true }),
              f('Date', viewing.date),
              f('Vendor', viewing.vendor_name),
              f('Status', viewing.status),
              f('Journal Entry', viewing.journal_entry ? `#${viewing.journal_entry}` : null, { mono: true }),
            ],
          },
          { title: 'Amounts',
            fields: [
              f('Taxable', formatINR(viewing.taxable_amount)),
              f('CGST', Number(viewing.cgst) ? formatINR(viewing.cgst) : null),
              f('SGST', Number(viewing.sgst) ? formatINR(viewing.sgst) : null),
              f('IGST', Number(viewing.igst) ? formatINR(viewing.igst) : null),
              f('TDS Deducted', Number(viewing.tds_amount) ? formatINR(viewing.tds_amount) : null),
              f('Grand Total', formatINR(viewing.grand_total)),
              f('Amount Paid', formatINR(viewing.amount_paid)),
              f('Balance Due', formatINR(viewing.balance_due)),
            ],
          },
        ] : []}
        nestedTables={viewing ? [{
          title: 'Line items',
          rows: viewing.lines,
          columns: [
            { key: 'description', label: 'Description' },
            { key: 'expense_account_code', label: 'Expense A/C', mono: true },
            { key: 'hsn_code', label: 'HSN', mono: true },
            { key: 'quantity', label: 'Qty', align: 'right' },
            { key: 'unit_price', label: 'Rate', align: 'right', render: (r: any) => formatINR(r.unit_price) },
            { key: 'tax_rate', label: 'GST%', align: 'right' },
            { key: 'tds_rate', label: 'TDS%', align: 'right' },
            { key: 'taxable_amount', label: 'Taxable', align: 'right', render: (r: any) => formatINR(r.taxable_amount) },
            { key: 'line_total', label: 'Total', align: 'right', render: (r: any) => formatINR(r.line_total) },
          ],
        }] : []}
      />
    </div>
  );
}
