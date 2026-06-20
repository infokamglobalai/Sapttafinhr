import { useMemo, useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useItems, useParties, peekNumber } from '@/features/masters/api';
import { useCreatePO } from './api';
import { D, formatINR, sum } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface DraftLine {
  tmpId: string;
  item: number | null;
  description: string;
  hsn_code: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
}

const emptyLine = (): DraftLine => ({
  tmpId: crypto.randomUUID(),
  item: null, description: '', hsn_code: '',
  quantity: '1', unit_price: '0', tax_rate: '18',
});

export default function POCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId, fyId } = useActiveCompany();
  const { data: vendors } = useParties(companyId, 'VENDOR');
  const { data: items } = useItems(companyId);
  const create = useCreatePO();

  const [poNo, setPoNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [vendorId, setVendorId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && companyId) {
      peekNumber(companyId, 'purchase_order').then(setPoNo).catch(console.error);
    }
  }, [open, companyId]);

  const totals = useMemo(() => {
    const computed = lines.map((l) => {
      const taxable = D(l.quantity).times(D(l.unit_price));
      const tax = taxable.times(D(l.tax_rate)).div(100);
      return { taxable, total: taxable.plus(tax) };
    });
    return {
      taxable: sum(computed.map((c) => c.taxable)),
      total: sum(computed.map((c) => c.total)),
    };
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const onItemPick = (idx: number, itemId: number) => {
    const item = items?.find((i) => i.id === itemId);
    if (!item) return;
    updateLine(idx, {
      item: itemId, description: item.name, hsn_code: item.hsn_code,
      unit_price: item.purchase_price || item.sale_price,
      tax_rate: item.effective_tax_rate || item.tax_rate,
    });
  };

  const submit = async () => {
    setErr(null);
    if (!companyId || !fyId || !vendorId) { setErr('Pick vendor'); return; }
    if (totals.total.isZero()) { setErr('Total cannot be zero'); return; }
    try {
      const created = await create.mutateAsync({
        company: companyId, fiscal_year: fyId,
        po_no: poNo, date, delivery_date: deliveryDate || null,
        vendor: vendorId, notes,
        lines: lines.map(({ tmpId: _t, ...rest }) => rest),
      });
      toast.success(`Purchase Order ${created.po_no} created`, `Total ${formatINR(totals.total)}`);
      const m = poNo.match(/(\d+)(?!.*\d)/);
      const next = m ? poNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : 'PO-0001';
      setPoNo(next);
      setLines([emptyLine()]); setNotes(''); setVendorId(undefined);
      onClose();
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Save failed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Order" size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div><label className="label">Vendor *</label>
            <select className="input" value={vendorId ?? ''} onChange={(e) => setVendorId(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {vendors?.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
            </select></div>
          <div><label className="label">PO #</label>
            <input className="input font-mono" value={poNo} onChange={(e) => setPoNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Delivery Date</label>
            <input className="input" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-2 py-2">Item</th><th className="px-2 py-2">Description</th>
                <th className="px-2 py-2">HSN</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">GST%</th>
                <th /></tr>
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
                  <td className="px-2 py-1"><input className="input font-mono text-xs" value={line.hsn_code} onChange={(e) => updateLine(idx, { hsn_code: e.target.value })} /></td>
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
            <tfoot className="bg-slate-50 text-sm font-medium">
              <tr><td colSpan={3} className="px-2 py-2 text-right">Totals</td>
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
          <button className="btn-primary" disabled={!vendorId || totals.total.isZero() || create.isPending} onClick={submit}>
            {create.isPending ? 'Saving…' : 'Create PO'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
