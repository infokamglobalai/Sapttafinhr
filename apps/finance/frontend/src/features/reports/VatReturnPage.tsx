import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useVatReturn } from './api';
import { formatMoney } from '@/lib/money';

function monthDefaults() {
  const t = new Date();
  const first = new Date(t.getFullYear(), t.getMonth(), 1);
  return { start: first.toISOString().slice(0, 10), end: t.toISOString().slice(0, 10) };
}

export default function VatReturnPage() {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const ccy = company?.base_currency || 'AED';
  const def = useMemo(monthDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const { data, isLoading } = useVatReturn(companyId, start, end);

  const m = (v?: string) => formatMoney(v ?? '0', ccy);

  return (
    <div className="space-y-6">
      <PageHeader
        title="VAT Return"
        subtitle="Output VAT, recoverable input VAT and net payable for the filing period."
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
          <div className="grid gap-4 md:grid-cols-3">
            <Kpi label="Output VAT" value={m(data.output.output_vat)} />
            <Kpi label="Input VAT (recoverable)" value={m(data.input.input_vat)} />
            <Kpi label="Net VAT payable" value={m(data.net_vat_payable)} accent />
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-2">Box</th><th className="px-4 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <Row label="Standard-rated supplies (taxable)" value={m(data.output.standard_taxable)} />
                <Row label="Zero-rated supplies (taxable)" value={m(data.output.zero_rated_taxable)} />
                <Row label="Exempt supplies (taxable)" value={m(data.output.exempt_taxable)} />
                <Row label="Output VAT on sales" value={m(data.output.output_vat)} />
                <Row label="Reverse-charge VAT (self-assessed)" value={m(data.output.reverse_charge_vat)} />
                <Row label="Input VAT (recoverable)" value={m(data.input.input_vat)} />
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-2">Net VAT payable</td>
                  <td className="px-4 py-2 text-right tabular-nums">{m(data.net_vat_payable)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            Figures are indicative — reconcile against the {company?.tax_id_label ?? 'tax'} authority's
            return form before filing.
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="px-4 py-2">{label}</td>
      <td className="px-4 py-2 text-right tabular-nums">{value}</td>
    </tr>
  );
}
