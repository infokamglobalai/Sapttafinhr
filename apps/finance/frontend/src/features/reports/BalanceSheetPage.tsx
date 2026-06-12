import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useBalanceSheet, type AccountRow } from './api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

export default function BalanceSheetPage() {
  const { companyId } = useActiveCompany();
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useBalanceSheet(companyId, asOf);

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data) return null;
    const mkRows = (section: string, rows: AccountRow[]) =>
      rows.map((r) => ({ section, code: r.code, name: r.name, amount: formatINR(r.amount) }));
    return {
      title: `Balance Sheet (as of ${asOf})`,
      columns: [
        { header: 'Section', key: 'section' },
        { header: 'Code', key: 'code' },
        { header: 'Account', key: 'name' },
        { header: 'Amount', key: 'amount', align: 'right' },
      ],
      rows: [
        ...mkRows('Assets', data.assets),
        ...mkRows('Liabilities', data.liabilities),
        ...mkRows('Equity', [
          ...data.equity,
          { account_id: -1, code: '—', name: 'Current Period P&L', amount: data.current_period_pl },
        ]),
      ],
      totals: { section: data.is_balanced ? 'Balanced' : 'NOT Balanced', code: '', name: 'Total Assets', amount: formatINR(data.total_assets) },
    };
  }, [data, asOf]);

  return (
    <div className="space-y-6">
      <PageHeader title="Balance Sheet" subtitle="Assets vs Liabilities + Equity (must balance)." action={<DownloadMenu opts={dlOpts} />} />

      <div>
        <label className="label">As of</label>
        <input className="input w-fit" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>

      {isLoading && <div className="card text-center text-slate-500">Loading…</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Assets" rows={data.assets} total={data.total_assets} />
            <div className="space-y-6">
              <Section title="Liabilities" rows={data.liabilities} total={data.total_liabilities} />
              <Section title="Equity" rows={[
                ...data.equity,
                { account_id: -1, code: '—', name: 'Current Period P&L (retained)', amount: data.current_period_pl },
              ]} total={data.total_equity} />
            </div>
          </div>
          <div className={`card text-center font-semibold ${data.is_balanced ? 'text-emerald-700' : 'text-red-600'}`}>
            {data.is_balanced ? '✓ Balanced' : '✗ Not balanced'} — Assets {formatINR(data.total_assets)} vs Liab+Equity {formatINR(Number(data.total_liabilities) + Number(data.total_equity))}
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, rows, total }: { title: string; rows: AccountRow[]; total: string }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase text-slate-500">{title}</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-200">
          {rows.length === 0 && <tr><td className="px-4 py-4 text-center text-slate-500">No entries.</td></tr>}
          {rows.map((r) => (
            <tr key={r.account_id}>
              <td className="px-4 py-2 font-mono text-xs text-slate-500">{r.code}</td>
              <td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatINR(r.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold">
          <tr><td colSpan={2} className="px-4 py-2">Total {title}</td><td className="px-4 py-2 text-right tabular-nums">{formatINR(total)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
