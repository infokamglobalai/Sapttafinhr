import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

interface ByCompany { company_id: number; income: string; expense: string; net: string; }
interface Resp { income: string; expense: string; net: string; by_company: ByCompany[]; }

function fyDefaults() {
  const today = new Date();
  const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
  return { start: fyStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

export default function ConsolidationPage() {
  const { companies } = useActiveCompany();
  const def = useMemo(fyDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const [selected, setSelected] = useState<number[]>([]);

  const all = companies?.map((c) => c.id) ?? [];
  const ids = selected.length > 0 ? selected : all;

  const { data, isLoading } = useQuery({
    queryKey: ['consolidation', ids.join(','), start, end], enabled: ids.length > 0,
    queryFn: async () => (await api.get<Resp>('/reports/consolidation/', { params: { companies: ids.join(','), start, end } })).data,
  });

  const toggle = (id: number) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data?.by_company?.length) return null;
    return {
      title: `Consolidation P&L (${start} to ${end})`,
      columns: [
        { header: 'Company', key: 'company' },
        { header: 'Income', key: 'income', align: 'right' },
        { header: 'Expense', key: 'expense', align: 'right' },
        { header: 'Net', key: 'net', align: 'right' },
      ],
      rows: data.by_company.map((r) => ({
        company: companies?.find((c) => c.id === r.company_id)?.name ?? `#${r.company_id}`,
        income: formatINR(r.income),
        expense: formatINR(r.expense),
        net: formatINR(r.net),
      })),
      totals: { company: 'Total', income: formatINR(data.income), expense: formatINR(data.expense), net: formatINR(data.net) },
    };
  }, [data, companies, start, end]);

  return (
    <div className="space-y-6">
      <PageHeader title="Multi-Company Consolidation" subtitle="P&L summed across selected companies." action={<DownloadMenu opts={dlOpts} />} />
      <div className="flex flex-wrap gap-4">
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>

      <div className="card">
        <div className="text-sm font-semibold">Companies to include</div>
        <p className="mt-1 text-xs text-slate-500">No selection means all.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {companies?.map((c) => (
            <label key={c.id} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${selected.includes(c.id) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>
              <input type="checkbox" className="hidden" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Kpi label="Total Income" value={data.income} positive />
          <Kpi label="Total Expense" value={data.expense} negative />
          <Kpi label="Net Profit" value={data.net} bold tone={Number(data.net) >= 0 ? 'positive' : 'negative'} />
        </div>
      )}

      <SimpleTable<ByCompany>
        rows={data?.by_company} loading={isLoading} keyField={'company_id' as keyof ByCompany}
        emptyTitle="Pick at least one company"
        columns={[
          { key: 'company_id', label: 'Company', render: (r) => companies?.find((c) => c.id === r.company_id)?.name ?? `#${r.company_id}` },
          { key: 'income', label: 'Income', align: 'right', render: (r) => formatINR(r.income) },
          { key: 'expense', label: 'Expense', align: 'right', render: (r) => formatINR(r.expense) },
          { key: 'net', label: 'Net', align: 'right', render: (r) =>
              <span className={Number(r.net) < 0 ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium'}>{formatINR(r.net)}</span> },
        ]}
      />
    </div>
  );
}

function Kpi({ label, value, positive, negative, bold, tone }: { label: string; value: string; positive?: boolean; negative?: boolean; bold?: boolean; tone?: 'positive' | 'negative' }) {
  const color = tone === 'positive' || positive ? 'text-emerald-700' : tone === 'negative' || negative ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="card">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className={`mt-1 ${bold ? 'text-2xl font-bold' : 'text-xl font-semibold'} tabular-nums ${color}`}>{formatINR(value)}</div>
    </div>
  );
}
