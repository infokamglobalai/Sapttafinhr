import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

function fyDefaults() {
  const today = new Date();
  const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
  return { start: fyStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

export default function CashFlowPage() {
  const { companyId } = useActiveCompany();
  const def = useMemo(fyDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const { data, isLoading } = useQuery({
    queryKey: ['cashflow', companyId, start, end], enabled: companyId != null,
    queryFn: async () => (await api.get('/reports/cash-flow/', { params: { company: companyId, start, end } })).data,
  });

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data) return null;
    return {
      title: `Cash Flow (${start} to ${end})`,
      columns: [
        { header: 'Item', key: 'item' },
        { header: 'Amount', key: 'amount', align: 'right' },
      ],
      rows: [
        { item: 'Opening Cash', amount: formatINR(data.opening_cash) },
        { item: 'Closing Cash', amount: formatINR(data.closing_cash) },
      ],
      totals: { item: 'Net Change', amount: formatINR(data.net_change) },
    };
  }, [data, start, end]);

  return (
    <div className="space-y-6">
      <PageHeader title="Cash Flow" subtitle="Net change in cash + bank balances over the period." action={<DownloadMenu opts={dlOpts} />} />
      <div className="flex gap-4">
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      {isLoading && <div className="card text-center text-slate-500">Loading…</div>}
      {data && (
        <div className="card space-y-2 text-sm">
          <div className="flex justify-between"><span>Opening cash</span><span className="tabular-nums">{formatINR(data.opening_cash)}</span></div>
          <div className="flex justify-between"><span>Closing cash</span><span className="tabular-nums">{formatINR(data.closing_cash)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
            <span>Net change</span>
            <span className={`tabular-nums ${Number(data.net_change) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatINR(data.net_change)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
