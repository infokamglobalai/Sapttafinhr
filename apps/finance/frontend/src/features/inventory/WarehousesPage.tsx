import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import WarehouseCreateModal from './WarehouseCreateModal';

interface WH { id: number; code: string; name: string; address: string; is_default: boolean; is_active: boolean; }

export default function WarehousesPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/inventory/warehouses/', { params: { company: companyId } })).data.results as WH[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<WH | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" subtitle="Stock locations."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New warehouse</button>}
      />
      <SimpleTable<WH>
        rows={data} loading={isLoading} onRowClick={setViewing}
        columns={[
          { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: 'name', label: 'Name' },
          { key: 'address', label: 'Address' },
          { key: 'is_default', label: 'Default', render: (r) => r.is_default ? '✓' : '—' },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? '✓' : '—' },
        ]}
      />
      <WarehouseCreateModal open={open} onClose={() => setOpen(false)} />
      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''} subtitle={viewing?.code}
        sections={viewing ? [{
          title: 'Warehouse',
          fields: [
            f('Code', viewing.code, { mono: true }),
            f('Name', viewing.name),
            f('Default', viewing.is_default ? 'Yes' : 'No'),
            f('Active', viewing.is_active ? 'Yes' : 'No'),
            f('Address', viewing.address, { fullWidth: true }),
          ],
        }] : []}
      />
    </div>
  );
}
