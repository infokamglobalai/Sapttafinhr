/**
 * Shared create modal for Quotations + Sales Orders (similar shape, no posting).
 */
import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useItems, useParties } from '@/features/masters/api';
import { api } from '@/lib/api';
import { D, formatINR, sum } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface DraftLine {
  tmpId: string;
  item: number | null;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
}

const emptyLine = (): DraftLine => ({
  tmpId: crypto.randomUUID(),
  item: null, description: '', quantity: '1', unit_price: '0', tax_rate: '18',
});

type Kind = 'quotation' | 'so';

export default function QuoteSOCreateModal({ open, onClose, kind }: { open: boolean; onClose: () => void; kind: Kind }) {
  const { companyId } = useActiveCompany();
  const { data: customers } = useParties(companyId, 'CUSTOMER');
  const { data: items } = useItems(companyId);
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (payload: any) => {
      const path = kind === 'quotation' ? '/billing/quotations/create/' : '/billing/sales-orders/create/';
      return (await api.post(path, payload)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind === 'quotation' ? 'quotations' : 'salesorders'] }),
  });

  const [docNo, setDocNo] = useState(kind === 'quotation' ? 'QUO-0001' : 'SO-0001');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [err, setErr] = useState<string | null>(null);

  const totals = useMemo(() => {
    const items = lines.map((l) => {
      const taxable = D(l.quantity).times(D(l.unit_price));
      const tax = taxable.times(D(l.tax_rate)).div(100);
      return { taxable, total: taxable.plus(tax) };
    });
    return { taxable: sum(items.map((x) => x.taxable)), total: sum(items.map((x) => x.total)) };
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const onItemPick = (idx: number, itemId: number) => {
    const item = items?.find((i) => i.id === itemId);
    if (!item) return;
    updateLine(idx, {
      item: itemId, description: item.name,
      unit_price: item.sale_price, tax_rate: item.effective_tax_rate || item.tax_rate,
    });
  };

  const submit = async () => {
    setErr(null);
    if (!companyId || !customerId) { setErr('Pick customer'); return; }
    if (kind === 'so' && !placeOfSupply) { setErr('Place of supply required'); return; }
    if (totals.total.isZero()) { setErr('Total cannot be zero'); return; }
    const payload: any = {
      company: companyId, date, customer: customerId, notes,
      lines: lines.map(({ tmpId: _t, ...rest }) => rest),
    };
    if (kind === 'quotation') {
      payload.quote_no = docNo;
      payload.valid_until = validUntil || null;
    } else {
      payload.so_no = docNo;
      payload.place_of_supply = placeOfSupply;
    }
    try {
      await create.mutateAsync(payload);
      toast.success(`${kind === 'quotation' ? 'Quotation' : 'Sales Order'} ${docNo} saved`, `Total ${formatINR(totals.total)}`);
      const m = docNo.match(/(\d+)(?!.*\d)/);
      const next = m ? docNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : docNo;
      setDocNo(next);
      setLines([emptyLine()]); setNotes(''); setCustomerId(undefined);
      onClose();
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Save failed'));
    }
  };

  const title = kind === 'quotation' ? 'New Quotation' : 'New Sales Order';

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div><label className="label">Customer *</label>
            <select className="input" value={customerId ?? ''} onChange={(e) => setCustomerId(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {customers?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select></div>
          <div><label className="label">{kind === 'quotation' ? 'Quote #' : 'SO #'}</label>
            <input className="input font-mono" value={docNo} onChange={(e) => setDocNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          {kind === 'quotation' ? (
            <div><label className="label">Valid Until</label>
              <input className="input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
          ) : (
            <div><label className="label">Place of Supply *</label>
              <input className="input" maxLength={2} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} /></div>
          )}
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-2 py-2">Item</th><th className="px-2 py-2">Description</th>
                <th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">GST%</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.map((line, idx) => (
                <tr key={line.tmpId}>
                  <td className="px-2 py-1">
                    <select className="input text-xs" value={line.item ?? ''} onChange={(e) => onItemPick(idx, Number(e.target.value))}>
                      <option value="">—</option>
                      {items?.map((i) => (<option key={i.id} value={i.id}>{i.sku}</option>))}
                    </select>
                  </td>
                  <td className="px-2 py-1"><input className="input text-xs" value={line.description} onChange={(e) => updateLine(idx, { description: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.unit_price} onChange={(e) => updateLine(idx, { unit_price: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.tax_rate} onChange={(e) => updateLine(idx, { tax_rate: e.target.value })} /></td>
                  <td className="px-2 py-1">
                    <button className="btn-ghost p-1" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} disabled={lines.length <= 1}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-medium">
              <tr><td colSpan={2} className="px-2 py-2 text-right">Totals</td>
                <td colSpan={3} className="px-2 py-2 text-right tabular-nums">
                  Taxable {formatINR(totals.taxable)} · Total {formatINR(totals.total)}
                </td><td /></tr>
            </tfoot>
          </table>
          <div className="border-t border-slate-200 p-2">
            <button className="btn-ghost" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus size={14} className="mr-1" /> Add line
            </button>
          </div>
        </div>

        <div><label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!customerId || totals.total.isZero() || create.isPending} onClick={submit}>
            {create.isPending ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
