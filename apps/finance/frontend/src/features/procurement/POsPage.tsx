import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePOs, type PO } from './api';
import { formatINR } from '@/lib/money';
import POCreateModal from './POCreateModal';

export default function POsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = usePOs(companyId);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<PO | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" subtitle="Commitments to vendors. No ledger entry yet."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New Purchase Order</button>}
      />
      <PageHint storageKey="pos">
        POs are commitments — they don't hit the ledger. When the goods arrive, record a GRN; when the bill arrives, post a Vendor Bill linking back to this PO for 3-way match.
      </PageHint>
      <SimpleTable<PO>
        rows={data} loading={isLoading} onRowClick={setViewing}
        emptyIcon={ShoppingCart}
        emptyTitle="No purchase orders yet"
        emptyDescription="Send a PO to a vendor when you commit to buy. Useful for budget tracking and 3-way match against the bill."
        emptyActionLabel="Create a purchase order"
        onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'po_no', label: 'PO #', render: (r) => <span className="font-medium text-brand-600">{r.po_no}</span> },
          { key: 'date', label: 'Date' },
          { key: 'vendor_name', label: 'Vendor' },
          { key: 'grand_total', label: 'Total', align: 'right', render: (r) => formatINR(r.grand_total) },
          { key: 'status', label: 'Status', render: (r) => <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span> },
        ]}
      />
      <POCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `PO ${viewing.po_no}` : ''}
        subtitle={viewing ? `${viewing.vendor_name} · ${viewing.status}` : ''}
        size="xl"
        sections={viewing ? [{
          title: 'Header',
          fields: [
            f('PO #', viewing.po_no, { mono: true }),
            f('Date', viewing.date),
            f('Vendor', viewing.vendor_name),
            f('Status', viewing.status),
            f('Grand Total', formatINR(viewing.grand_total)),
          ],
        }] : []}
        nestedTables={viewing ? [{
          title: 'Line items',
          rows: viewing.lines,
          columns: [
            { key: 'description', label: 'Description' },
            { key: 'hsn_code', label: 'HSN', mono: true },
            { key: 'quantity', label: 'Qty', align: 'right' },
            { key: 'unit_price', label: 'Rate', align: 'right', render: (r: any) => formatINR(r.unit_price) },
            { key: 'tax_rate', label: 'GST%', align: 'right' },
            { key: 'taxable_amount', label: 'Taxable', align: 'right', render: (r: any) => formatINR(r.taxable_amount) },
            { key: 'line_total', label: 'Total', align: 'right', render: (r: any) => formatINR(r.line_total) },
            { key: 'received_qty', label: 'Received', align: 'right' },
          ],
        }] : []}
      />
    </div>
  );
}
