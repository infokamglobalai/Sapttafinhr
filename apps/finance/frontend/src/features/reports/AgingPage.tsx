import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useARAging } from './api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

export default function AgingPage() {
  const { companyId } = useActiveCompany();
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useARAging(companyId, asOf);

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data || data.rows.length === 0) return null;
    return {
      title: `AR Aging (as of ${asOf})`,
      columns: [
        { header: 'Customer', key: 'customer_name' },
        { header: '0–30 days', key: 'b0_30', align: 'right' },
        { header: '31–60 days', key: 'b31_60', align: 'right' },
        { header: '61–90 days', key: 'b61_90', align: 'right' },
        { header: '90+ days', key: 'b90', align: 'right' },
        { header: 'Total', key: 'total', align: 'right' },
      ],
      rows: data.rows.map((r) => ({
        customer_name: r.customer_name,
        b0_30: formatINR(r['0-30']),
        b31_60: formatINR(r['31-60']),
        b61_90: formatINR(r['61-90']),
        b90: formatINR(r['90+']),
        total: formatINR(r.total),
      })),
      totals: { customer_name: 'Grand Total', b0_30: '', b31_60: '', b61_90: '', b90: '', total: formatINR(data.grand_total) },
    };
  }, [data, asOf]);

  return (
    <div className="space-y-6">
      <PageHeader title="AR Aging" subtitle="Outstanding customer balances bucketed by age." action={<DownloadMenu opts={dlOpts} />} />

      <div>
        <label className="label">As of</label>
        <input className="input w-fit" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">0–30</th>
              <th className="px-4 py-3 text-right">31–60</th>
              <th className="px-4 py-3 text-right">61–90</th>
              <th className="px-4 py-3 text-right">90+</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {data?.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No outstanding balances.</td></tr>}
            {data?.rows.map((r) => (
              <tr key={r.customer_id}>
                <td className="px-4 py-2 font-medium">{r.customer_name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(r['0-30']) ? formatINR(r['0-30']) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(r['31-60']) ? formatINR(r['31-60']) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(r['61-90']) ? formatINR(r['61-90']) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums text-red-600">{Number(r['90+']) ? formatINR(r['90+']) : '—'}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(r.total)}</td>
              </tr>
            ))}
          </tbody>
          {data && data.rows.length > 0 && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr><td colSpan={5} className="px-4 py-2 text-right">Total Receivable</td><td className="px-4 py-2 text-right tabular-nums">{formatINR(data.grand_total)}</td></tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
