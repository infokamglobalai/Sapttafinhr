import { useMemo, useState } from 'react';
import { useCompanies } from '@/features/masters/api';
import { useTrialBalance } from './api';
import { formatINR } from '@/lib/money';

export default function TrialBalancePage() {
  const { data: companies } = useCompanies();
  const [companyId, setCompanyId] = useState<number | undefined>();
  const [asOf, setAsOf] = useState<string>('');

  useMemo(() => {
    if (companyId == null && companies?.length) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  const { data, isLoading } = useTrialBalance(companyId, asOf || undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Trial Balance</h1>
        <p className="text-sm text-slate-500">Derived from posted journal entries.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="label">Company</label>
          <select
            className="input min-w-[200px]"
            value={companyId ?? ''}
            onChange={(e) => setCompanyId(Number(e.target.value))}
          >
            {companies?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">As of</label>
          <input
            type="date"
            className="input"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            )}
            {data?.rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No posted entries yet. Post a manual JE first.
              </td></tr>
            )}
            {data?.rows.map((r) => (
              <tr key={r.account_id}>
                <td className="px-4 py-2 font-mono text-slate-600">{r.code}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{r.type}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(r.debit) ? formatINR(r.debit) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(r.credit) ? formatINR(r.credit) : '—'}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          {data && data.rows.length > 0 && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">Totals</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatINR(data.totals.debit)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatINR(data.totals.credit)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
