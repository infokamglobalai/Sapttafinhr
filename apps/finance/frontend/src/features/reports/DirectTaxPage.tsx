import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useDirectTax } from './api';
import { formatMoney } from '@/lib/money';

function yearDefaults() {
  const t = new Date();
  const jan1 = new Date(t.getFullYear(), 0, 1);
  return { start: jan1.toISOString().slice(0, 10), end: t.toISOString().slice(0, 10) };
}

export default function DirectTaxPage() {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const ccy = company?.base_currency || 'AED';
  const def = useMemo(yearDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const { data, isLoading } = useDirectTax(companyId, start, end);
  const m = (v?: string) => formatMoney(v ?? '0', ccy);
  const totalTax = data ? data.taxes.reduce((s, t) => s + Number(t.amount), 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Direct Tax"
        subtitle="Corporate tax / Zakat estimate from book net profit for the period."
      />

      <div className="flex gap-4">
        <div><label className="label">From</label>
          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label>
          <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>

      {isLoading && <div className="card text-slate-500">Loading…</div>}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Kpi label="Net profit (period)" value={m(data.net_profit)} />
            <Kpi label="Total direct tax" value={m(String(totalTax))} accent />
          </div>

          {data.taxes.length === 0 ? (
            <div className="card text-sm text-slate-500">
              No direct tax configured for this jurisdiction ({data.country}).
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Tax</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Threshold</th>
                    <th className="px-4 py-2 text-right">Taxable</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.taxes.map((t) => (
                    <tr key={t.name}>
                      <td className="px-4 py-2">{t.name}</td>
                      <td className="px-4 py-2 text-right">{t.rate}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{m(t.threshold)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{m(t.taxable)}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{m(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Indicative only — based on book net profit, not the statutory taxable-income
            computation. Verify with a tax advisor before filing.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card ${accent ? 'border-brand-200 bg-brand-50/40' : ''}`}>
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? 'text-brand-700' : 'text-ink-900'}`}>{value}</div>
    </div>
  );
}
