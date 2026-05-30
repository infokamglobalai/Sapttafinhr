import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useParties } from '@/features/masters/api';
import { usePartyLedger } from './api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

function fyDefaults() {
  const today = new Date();
  const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
  return { start: fyStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

export default function PartyLedgerPage() {
  const { companyId } = useActiveCompany();
  const { data: parties } = useParties(companyId);
  const def = useMemo(fyDefaults, []);
  const [partyId, setPartyId] = useState<number | undefined>();
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);

  const { data, isLoading } = usePartyLedger(companyId, partyId, start, end);

  const partyName = parties?.find((p) => p.id === partyId)?.name ?? '';
  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data || data.rows.length === 0) return null;
    return {
      title: `Party Ledger — ${partyName} (${start} to ${end})`,
      columns: [
        { header: 'Date', key: 'date' },
        { header: 'Voucher', key: 'voucher_no' },
        { header: 'Account', key: 'account' },
        { header: 'Narration', key: 'narration' },
        { header: 'Debit', key: 'debit', align: 'right' },
        { header: 'Credit', key: 'credit', align: 'right' },
        { header: 'Running Balance', key: 'running_balance', align: 'right' },
      ],
      rows: data.rows.map((r) => ({
        ...r,
        debit: formatINR(r.debit),
        credit: formatINR(r.credit),
        running_balance: formatINR(r.running_balance),
      })),
      totals: { date: '', voucher_no: '', account: '', narration: 'Closing Balance', debit: '', credit: '', running_balance: formatINR(data.closing_balance) },
    };
  }, [data, partyName, start, end]);

  return (
    <div className="space-y-6">
      <PageHeader title="Party Ledger" subtitle="Statement of account for a customer or vendor." action={<DownloadMenu opts={dlOpts} />} />

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="label">Party</label>
          <select className="input min-w-[260px]" value={partyId ?? ''} onChange={(e) => setPartyId(Number(e.target.value) || undefined)}>
            <option value="">— select —</option>
            {parties?.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.kind})</option>))}
          </select>
        </div>
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Voucher</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Narration</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Running</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {!partyId && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Pick a party.</td></tr>}
            {isLoading && partyId && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {data?.rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No transactions in this period.</td></tr>}
            {data?.rows.map((r, i) => (
              <tr key={`${r.voucher_no}-${i}`}>
                <td className="px-4 py-2 text-slate-500">{r.date}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.voucher_no}</td>
                <td className="px-4 py-2 text-xs">{r.account}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{r.narration}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(r.debit) ? formatINR(r.debit) : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(r.credit) ? formatINR(r.credit) : '—'}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(r.running_balance)}</td>
              </tr>
            ))}
          </tbody>
          {data && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td colSpan={6} className="px-4 py-2 text-right">Closing Balance</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatINR(data.closing_balance)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
