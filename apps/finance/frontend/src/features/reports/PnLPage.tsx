import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePnL, type AccountRow } from './api';
import { currencySymbol, formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

function fyDefaults() {
  const today = new Date();
  const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
  return { start: fyStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

const COLORS = {
  income: '#059669',
  expense: '#dc2626',
  net: '#0ea5e9',
};

export default function PnLPage() {
  const { companyId } = useActiveCompany();
  const def = useMemo(fyDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);

  const { data, isLoading } = usePnL(companyId, start, end);

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data) return null;
    const rows = [
      ...data.income.map((r) => ({ type: 'Income', code: r.code, name: r.name, amount: formatINR(r.amount) })),
      ...data.expense.map((r) => ({ type: 'Expense', code: r.code, name: r.name, amount: formatINR(r.amount) })),
    ];
    return {
      title: `Profit & Loss (${start} to ${end})`,
      columns: [
        { header: 'Type', key: 'type' },
        { header: 'Code', key: 'code' },
        { header: 'Account', key: 'name' },
        { header: 'Amount', key: 'amount', align: 'right' },
      ],
      rows,
      totals: { type: '', code: '', name: 'Net Profit', amount: formatINR(data.net_profit) },
    };
  }, [data, start, end]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Income', value: Number(data.total_income), kind: 'income' },
      { name: 'Expense', value: Number(data.total_expense), kind: 'expense' },
      { name: 'Net Profit', value: Number(data.net_profit), kind: 'net' },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Profit & Loss" subtitle="Income − Expense for the selected period." action={<DownloadMenu opts={dlOpts} />} />

      <div className="flex gap-4">
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>

      {isLoading && <div className="card text-center text-slate-500">Loading…</div>}

      {data && (
        <div className="card">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Overview</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currencySymbol()}${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={COLORS[d.kind as 'income' | 'expense' | 'net']} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section title="Income" rows={data.income} total={data.total_income} positive />
          <Section title="Expense" rows={data.expense} total={data.total_expense} />
        </div>
      )}

      {data && (
        <div className={`card text-center text-lg font-semibold ${Number(data.net_profit) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          Net Profit: {formatINR(data.net_profit)}
        </div>
      )}
    </div>
  );
}

function Section({ title, rows, total, positive }: { title: string; rows: AccountRow[]; total: string; positive?: boolean }) {
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
        <tfoot className={`${positive ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'} font-semibold`}>
          <tr><td colSpan={2} className="px-4 py-2">Total {title}</td><td className="px-4 py-2 text-right tabular-nums">{formatINR(total)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
