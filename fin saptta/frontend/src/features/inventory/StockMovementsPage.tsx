import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import StockMovementCreateModal from './StockMovementCreateModal';

interface MV {
  id: number; date: string; item_sku: string; item_name: string;
  warehouse_code: string; kind: string; quantity: string; unit_cost: string;
  reference: string; notes: string; journal_entry: number | null;
}

export default function StockMovementsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useQuery({
    queryKey: ['movements', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/inventory/movements/', { params: { company: companyId, page_size: 200 } })).data.results as MV[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<MV | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movements" subtitle="Append-only ledger of all stock in/out."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> Record movement</button>}
      />
      <SimpleTable<MV>
        rows={data} loading={isLoading} onRowClick={setViewing}
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'kind', label: 'Kind' },
          { key: 'item_sku', label: 'SKU', render: (r) => <span className="font-mono text-xs">{r.item_sku}</span> },
          { key: 'item_name', label: 'Item' },
          { key: 'warehouse_code', label: 'WH' },
          { key: 'quantity', label: 'Qty', align: 'right', render: (r) => <span className={Number(r.quantity) < 0 ? 'text-red-600' : 'text-emerald-700'}>{r.quantity}</span> },
          { key: 'unit_cost', label: 'Cost', align: 'right', render: (r) => formatINR(r.unit_cost) },
          { key: 'reference', label: 'Ref' },
        ]}
      />
      <StockMovementCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Movement #${viewing.id}` : ''}
        subtitle={viewing ? `${viewing.kind} · ${viewing.item_sku}` : ''}
        sections={viewing ? [{
          title: 'Stock Movement',
          fields: [
            f('ID', viewing.id),
            f('Date', viewing.date),
            f('Kind', viewing.kind),
            f('Item', `${viewing.item_sku} — ${viewing.item_name}`),
            f('Warehouse', viewing.warehouse_code),
            f('Quantity', viewing.quantity),
            f('Unit Cost', formatINR(viewing.unit_cost)),
            f('Reference', viewing.reference),
            f('Journal Entry', viewing.journal_entry ? `#${viewing.journal_entry}` : null),
            f('Notes', viewing.notes, { fullWidth: true }),
          ],
        }] : []}
      />
    </div>
  );
}
