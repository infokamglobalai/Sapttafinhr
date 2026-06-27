import { useState } from 'react';
import { Plus, PackageCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useGRNs, type GRN } from './api';
import GRNCreateModal from './GRNCreateModal';

export default function GRNsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useGRNs(companyId);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<GRN | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Record goods received against purchase orders."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1" /> Record GRN
          </button>
        }
      />
      <PageHint storageKey="grns">
        A GRN updates received quantities on the PO. Post the vendor bill when the invoice arrives for 3-way match.
      </PageHint>
      <SimpleTable<GRN>
        rows={data}
        loading={isLoading}
        onRowClick={setViewing}
        emptyIcon={PackageCheck}
        emptyTitle="No GRNs yet"
        emptyDescription="Record a GRN when goods arrive against a purchase order."
        emptyActionLabel="Record GRN"
        onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'grn_no', label: 'GRN #', render: (r) => <span className="font-medium text-brand-600">{r.grn_no}</span> },
          { key: 'date', label: 'Date' },
          { key: 'po_no', label: 'PO #' },
          { key: 'vendor_name', label: 'Vendor' },
          { key: 'status', label: 'Status', render: (r) => <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span> },
        ]}
      />
      <GRNCreateModal open={open} onClose={() => setOpen(false)} />
      <RecordDetailModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `GRN ${viewing.grn_no}` : ''}
        subtitle={viewing ? `${viewing.vendor_name} · PO ${viewing.po_no}` : ''}
        sections={viewing ? [{
          title: 'Header',
          fields: [
            f('GRN #', viewing.grn_no, { mono: true }),
            f('Date', viewing.date),
            f('PO', viewing.po_no),
            f('Vendor', viewing.vendor_name),
            f('Status', viewing.status),
          ],
        }] : []}
        nestedTables={viewing ? [{
          title: 'Received lines',
          rows: viewing.lines,
          columns: [
            { key: 'po_line_description', label: 'Description' },
            { key: 'received_qty', label: 'Qty received', align: 'right' },
          ],
        }] : []}
      />
    </div>
  );
}
