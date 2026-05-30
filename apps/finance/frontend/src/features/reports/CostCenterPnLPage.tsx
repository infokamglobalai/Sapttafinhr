import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

interface Row { cost_center: string; income: string; expense: string; net: string; }

function fyDefaults() {
  const today = new Date();
  const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
  return { start: fyStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

export default function CostCenterPnLPage() {
  const { companyId } = useActiveCompany();
  const def = useMemo(fyDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const { data, isLoading } = useQuery({
    queryKey: ['cc-pnl', companyId, start, end], enabled: companyId != null,
    queryFn: async () => (await api.get('/reports/cost-center-pnl/', { params: { company: companyId, start, end } })).data,
  });

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data?.rows?.length) return null;
    return {
      title: `P&L by Cost Center (${start} to ${end})`,
      columns: [
        { header: 'Cost Center', key: 'cost_center' },
        { header: 'Income', key: 'income', align: 'right' },
        { header: 'Expense', key: 'expense', align: 'right' },
        { header: 'Net', key: 'net', align: 'right' },
      ],
      rows: data.rows.map((r: Row) => ({
        cost_center: r.cost_center,
        income: formatINR(r.income),
        expense: formatINR(r.expense),
        net: formatINR(r.net),
      })),
    };
  }, [data, start, end]);

  return (
    <div className="space-y-6">
      <PageHeader title="P&L by Cost Center" subtitle="Income and expense split by cost-center dimension." action={<DownloadMenu opts={dlOpts} />} />
      <div className="flex gap-4">
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      <SimpleTable<Row>
        rows={data?.rows} loading={isLoading} keyField={'cost_center' as keyof Row}
        emptyTitle="No cost-centered entries in this period"
        emptyDescription="Tag JE lines with a cost center to see them here."
        columns={[
          { key: 'cost_center', label: 'Cost Center' },
          { key: 'income', label: 'Income', align: 'right', render: (r) => formatINR(r.income) },
          { key: 'expense', label: 'Expense', align: 'right', render: (r) => formatINR(r.expense) },
          { key: 'net', label: 'Net', align: 'right', render: (r) =>
              <span className={Number(r.net) < 0 ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium'}>{formatINR(r.net)}</span> },
        ]}
      />
    </div>
  );
}
