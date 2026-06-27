import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface G2BRow {
  id: number;
  return_period: string;
  supplier_gstin: string;
  supplier_name: string;
  invoice_no: string;
  invoice_date: string;
  taxable: string;
  match_status: string;
  matched_bill_no: string;
}

export default function GSTR2BPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gstr2b', companyId],
    enabled: companyId != null,
    queryFn: async () => {
      const res = await api.get('/taxation/gstr2b/lines/', { params: { company: companyId } });
      return res.data as { summary: Record<string, number>; results: G2BRow[] };
    },
  });

  const reconcile = useMutation({
    mutationFn: async () => (await api.post('/taxation/gstr2b/reconcile/', { company: companyId })).data,
    onSuccess: (r) => {
      toast(`Reconciled: ${r.matched ?? 0} matched`);
      qc.invalidateQueries({ queryKey: ['gstr2b'] });
    },
  });

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GSTR-2B ITC Reconcile"
        subtitle="Match portal purchase data against vendor bills."
        action={
          <button
            className="btn-primary"
            disabled={!companyId || reconcile.isPending}
            onClick={() => reconcile.mutate()}
          >
            <RefreshCw size={16} className="mr-1" /> Auto-reconcile
          </button>
        }
      />
      <PageHint storageKey="gstr2b">
        Import GSTR-2B rows via Django admin (or API), then run auto-reconcile to match vendor bills on GSTIN + invoice no + amount.
      </PageHint>
      {summary && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="rounded bg-slate-100 px-3 py-1">Total: {summary.total}</span>
          <span className="rounded bg-emerald-100 px-3 py-1 text-emerald-800">Matched: {summary.matched}</span>
          <span className="rounded bg-amber-100 px-3 py-1 text-amber-800">Unmatched: {summary.unmatched}</span>
          <span className="rounded bg-red-100 px-3 py-1 text-red-800">Disputed: {summary.disputed}</span>
        </div>
      )}
      <SimpleTable<G2BRow>
        rows={data?.results}
        loading={isLoading}
        columns={[
          { key: 'return_period', label: 'Period' },
          { key: 'supplier_gstin', label: 'GSTIN', render: (r) => <span className="font-mono text-xs">{r.supplier_gstin}</span> },
          { key: 'supplier_name', label: 'Vendor' },
          { key: 'invoice_no', label: 'Invoice #' },
          { key: 'invoice_date', label: 'Date' },
          { key: 'taxable', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable) },
          {
            key: 'match_status', label: 'Status',
            render: (r) => (
              <span className={`rounded px-2 py-0.5 text-xs ${
                r.match_status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700'
                  : r.match_status === 'DISPUTED' ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>{r.match_status}</span>
            ),
          },
          { key: 'matched_bill_no', label: 'Local bill' },
        ]}
      />
      <button className="btn-ghost text-sm" onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
