import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';

interface Row { item_id: number; sku: string; name: string; warehouse: string; on_hand: string; avg_cost: string; value: string; reorder_level: string; below_reorder: boolean; }

export default function StockSummaryPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useQuery({
    queryKey: ['stock-summary', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/inventory/stock-summary/', { params: { company: companyId } })).data as Row[],
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Summary" subtitle="On-hand qty and inventory value per item × warehouse." />
      <SimpleTable<Row>
        rows={data} loading={isLoading} keyField="item_id"
        columns={[
          { key: 'sku', label: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
          { key: 'name', label: 'Item' },
          { key: 'warehouse', label: 'WH' },
          { key: 'on_hand', label: 'On Hand', align: 'right' },
          { key: 'avg_cost', label: 'Avg Cost', align: 'right', render: (r) => formatINR(r.avg_cost) },
          { key: 'value', label: 'Value', align: 'right', render: (r) => formatINR(r.value) },
          { key: 'reorder_level', label: 'Reorder', align: 'right' },
          { key: 'below_reorder', label: 'Alert', render: (r) => r.below_reorder ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">LOW</span> : '—' },
        ]}
      />
    </div>
  );
}
