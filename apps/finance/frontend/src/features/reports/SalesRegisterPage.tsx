import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useSalesRegister } from './api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

function fyDefaults() {
  const today = new Date();
  const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
  return { start: fyStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

export default function SalesRegisterPage() {
  const { companyId } = useActiveCompany();
  const def = useMemo(fyDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const { data, isLoading } = useSalesRegister(companyId, start, end);

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data || data.rows.length === 0) return null;
    return {
      title: `Sales Register (${start} to ${end})`,
      columns: [
        { header: 'Date', key: 'date' },
        { header: 'Invoice #', key: 'invoice_no' },
        { header: 'Customer', key: 'customer_name' },
        { header: 'GSTIN', key: 'gstin' },
        { header: 'PoS', key: 'place_of_supply' },
        { header: 'Taxable', key: 'taxable_amount', align: 'right' },
        { header: 'CGST', key: 'cgst', align: 'right' },
        { header: 'SGST', key: 'sgst', align: 'right' },
        { header: 'IGST', key: 'igst', align: 'right' },
        { header: 'Total', key: 'grand_total', align: 'right' },
        { header: 'Due', key: 'balance_due', align: 'right' },
      ],
      rows: data.rows.map((r) => ({
        ...r,
        taxable_amount: formatINR(r.taxable_amount),
        cgst: formatINR(r.cgst),
        sgst: formatINR(r.sgst),
        igst: formatINR(r.igst),
        grand_total: formatINR(r.grand_total),
        balance_due: formatINR(r.balance_due),
      })),
      totals: {
        date: '', invoice_no: '', customer_name: '', gstin: '', place_of_supply: 'Totals',
        taxable_amount: formatINR(data.totals.taxable_amount),
        cgst: formatINR(data.totals.cgst), sgst: formatINR(data.totals.sgst),
        igst: formatINR(data.totals.igst), grand_total: formatINR(data.totals.grand_total),
        balance_due: '',
      },
    };
  }, [data, start, end]);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Register" subtitle="GST-style register of all posted invoices in the period." action={<DownloadMenu opts={dlOpts} />} />

      <div className="flex gap-4">
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Invoice #</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">GSTIN</th>
              <th className="px-3 py-2">PoS</th>
              <th className="px-3 py-2 text-right">Taxable</th>
              <th className="px-3 py-2 text-right">CGST</th>
              <th className="px-3 py-2 text-right">SGST</th>
              <th className="px-3 py-2 text-right">IGST</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-500">Loading…</td></tr>}
            {data?.rows.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-500">No invoices in period.</td></tr>}
            {data?.rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-1.5 text-slate-500">{r.date}</td>
                <td className="px-3 py-1.5 font-medium text-brand-600">{r.invoice_no}</td>
                <td className="px-3 py-1.5">{r.customer_name}</td>
                <td className="px-3 py-1.5 font-mono">{r.gstin || '—'}</td>
                <td className="px-3 py-1.5">{r.place_of_supply}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(r.taxable_amount)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{Number(r.cgst) ? formatINR(r.cgst) : '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{Number(r.sgst) ? formatINR(r.sgst) : '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{Number(r.igst) ? formatINR(r.igst) : '—'}</td>
                <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatINR(r.grand_total)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">{Number(r.balance_due) ? formatINR(r.balance_due) : '—'}</td>
              </tr>
            ))}
          </tbody>
          {data && data.rows.length > 0 && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td colSpan={5} className="px-3 py-2 text-right">Totals</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.taxable_amount)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.cgst)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.sgst)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.igst)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatINR(data.totals.grand_total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
