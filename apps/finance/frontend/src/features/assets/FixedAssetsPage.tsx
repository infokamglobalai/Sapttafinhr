import { useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import FixedAssetCreateModal from './FixedAssetCreateModal';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

interface FA {
  id: number; code: string; name: string; category: string;
  purchase_date: string; purchase_cost: string; salvage_value: string;
  current_book_value: string; accumulated_depreciation: string;
  method: string; useful_life_years: string; wdv_rate: string;
  last_depreciated: string | null; is_disposed: boolean;
  asset_account_code?: string;
}

export default function FixedAssetsPage() {
  const { companyId, fyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['fixed-assets', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/assets/fixed-assets/', { params: { company: companyId } })).data.results as FA[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<FA | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: async () => {
      const period_end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
      const r = await api.post('/assets/run-depreciation/', {
        company: companyId, fiscal_year: fyId, period_end,
      });
      return r.data;
    },
    onSuccess: (r: any) => {
      setMsg(`Depreciated ${r.depreciated_assets} asset(s) — JEs posted.`);
      qc.invalidateQueries({ queryKey: ['fixed-assets'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['pnl'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Fixed Assets" subtitle="Asset register — run monthly depreciation."
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={run.isPending || !fyId || (data?.length ?? 0) === 0}
              onClick={() => { setMsg(null); run.mutate(); }}>
              <Zap size={16} className="mr-1" /> {run.isPending ? 'Running…' : 'Run depreciation (month-end)'}
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={16} className="mr-1" /> New asset
            </button>
          </div>
        }
      />
      {msg && <div className="rounded bg-emerald-50 p-2 text-xs text-emerald-700">{msg}</div>}
      <SimpleTable<FA>
        rows={data} loading={isLoading} onRowClick={setViewing}
        columns={[
          { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: 'name', label: 'Name' },
          { key: 'purchase_date', label: 'Purchased' },
          { key: 'purchase_cost', label: 'Cost', align: 'right', render: (r) => formatINR(r.purchase_cost) },
          { key: 'accumulated_depreciation', label: 'Accum Depr', align: 'right', render: (r) => formatINR(r.accumulated_depreciation) },
          { key: 'current_book_value', label: 'Book Value', align: 'right', render: (r) => <span className="font-medium">{formatINR(r.current_book_value)}</span> },
          { key: 'method', label: 'Method' },
          { key: 'is_disposed', label: 'Disposed', render: (r) => r.is_disposed ? '✓' : '—' },
        ]}
      />
      <FixedAssetCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''} subtitle={viewing ? `${viewing.code} · ${viewing.category}` : ''}
        sections={viewing ? [
          {
            title: 'Asset',
            fields: [
              f('Code', viewing.code, { mono: true }),
              f('Name', viewing.name),
              f('Category', viewing.category),
              f('Purchase Date', viewing.purchase_date),
              f('Purchase Cost', formatINR(viewing.purchase_cost)),
              f('Salvage Value', formatINR(viewing.salvage_value)),
              f('Disposed', viewing.is_disposed ? 'Yes' : 'No'),
            ],
          },
          {
            title: 'Depreciation',
            fields: [
              f('Method', viewing.method),
              f('Useful Life', `${viewing.useful_life_years} years`),
              f('WDV Rate', `${viewing.wdv_rate}%`),
              f('Accumulated Depr', formatINR(viewing.accumulated_depreciation)),
              f('Current Book Value', formatINR(viewing.current_book_value)),
              f('Last Depreciated', viewing.last_depreciated),
            ],
          },
        ] : []}
      />
    </div>
  );
}
