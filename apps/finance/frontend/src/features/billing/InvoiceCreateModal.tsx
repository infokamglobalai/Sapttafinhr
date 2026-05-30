import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useItems, useParties } from '@/features/masters/api';
import { useCreateInvoice, type InvoiceLineInput } from './api';
import { D, formatINR, sum } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface Props { open: boolean; onClose: () => void; }

interface DraftLine extends InvoiceLineInput { tmpId: string; }

const emptyLine = (): DraftLine => ({
  tmpId: crypto.randomUUID(),
  item: null, description: '', hsn_code: '',
  quantity: '1', unit_price: '0', discount_percent: '0', tax_rate: '18',
});

export default function InvoiceCreateModal({ open, onClose }: Props) {
  const { companyId, fyId, companies } = useActiveCompany();
  const seller = companies?.find((c) => c.id === companyId);
  const { data: customers } = useParties(companyId, 'CUSTOMER');
  const { data: items } = useItems(companyId);
  const create = useCreateInvoice();

  const [customerId, setCustomerId] = useState<number | undefined>();
  const [invoiceNo, setInvoiceNo] = useState('INV-0001');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [err, setErr] = useState<string | null>(null);

  // Auto-set place of supply when customer selected
  useEffect(() => {
    const cust = customers?.find((c) => c.id === customerId);
    if (cust?.state_code) setPlaceOfSupply(cust.state_code);
  }, [customerId, customers]);

  const sellerState = seller?.state_code ?? '';
  const isInterState = sellerState !== '' && placeOfSupply !== '' && sellerState !== placeOfSupply;

  // Compute totals live (mirroring backend math)
  const computed = useMemo(() => {
    const computedLines = lines.map((l) => {
      const gross = D(l.quantity).times(D(l.unit_price));
      const disc = gross.times(D(l.discount_percent)).div(100);
      const taxable = gross.minus(disc);
      const tax = taxable.times(D(l.tax_rate)).div(100);
      const cgst = isInterState ? D(0) : tax.div(2);
      const sgst = isInterState ? D(0) : tax.minus(cgst);
      const igst = isInterState ? tax : D(0);
      return { ...l, taxable, cgst, sgst, igst, total: taxable.plus(tax) };
    });
    const totals = {
      taxable: sum(computedLines.map((l) => l.taxable)),
      cgst: sum(computedLines.map((l) => l.cgst)),
      sgst: sum(computedLines.map((l) => l.sgst)),
      igst: sum(computedLines.map((l) => l.igst)),
      total: sum(computedLines.map((l) => l.total)),
    };
    return { computedLines, totals };
  }, [lines, isInterState]);

  const updateLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const onItemPick = (idx: number, itemId: number) => {
    const item = items?.find((i) => i.id === itemId);
    if (!item) { updateLine(idx, { item: null }); return; }
    updateLine(idx, {
      item: itemId,
      description: item.name,
      hsn_code: item.hsn_code,
      unit_price: item.sale_price,
      tax_rate: item.effective_tax_rate || item.tax_rate,
    });
  };

  const submit = async () => {
    setErr(null);
    if (!companyId || !fyId || !customerId) { setErr('Pick customer and ensure company/FY are set'); return; }
    if (computed.totals.total.isZero()) { setErr('Total cannot be zero'); return; }

    try {
      const inv = await create.mutateAsync({
        company: companyId,
        fiscal_year: fyId,
        invoice_no: invoiceNo,
        date,
        due_date: dueDate || null,
        customer: customerId,
        place_of_supply: placeOfSupply,
        notes,
        lines: lines.map(({ tmpId: _t, ...rest }) => rest),
      });
      // bump invoice number
      const m = invoiceNo.match(/(\d+)(?!.*\d)/);
      const next = m ? invoiceNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : 'INV-0001';
      setInvoiceNo(next);
      setLines([emptyLine()]);
      setNotes('');
      setCustomerId(undefined);
      onClose();
      toast.success(`Invoice ${inv.invoice_no} posted`, `Total ${formatINR(inv.grand_total)} · Journal Entry #${inv.journal_entry}`);
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Save failed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Sales Invoice" size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="label">Customer *</label>
            <select className="input" value={customerId ?? ''} onChange={(e) => setCustomerId(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {customers?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Invoice #</label>
            <input className="input font-mono" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Place of Supply (state)</label>
            <input className="input" maxLength={2} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
            <div className="mt-1 text-xs text-slate-500">
              Seller: {sellerState || '—'} → {isInterState ? <span className="text-amber-700">Inter-state (IGST)</span> : <span className="text-emerald-700">Intra-state (CGST+SGST)</span>}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2">HSN</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Disc%</th>
                <th className="px-2 py-2 text-right">GST%</th>
                <th className="px-2 py-2 text-right">Taxable</th>
                <th className="px-2 py-2 text-right">Tax</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {computed.computedLines.map((line, idx) => (
                <tr key={line.tmpId}>
                  <td className="px-2 py-1">
                    <select className="input text-xs" value={line.item ?? ''} onChange={(e) => onItemPick(idx, Number(e.target.value))}>
                      <option value="">—</option>
                      {items?.map((i) => (<option key={i.id} value={i.id}>{i.sku}</option>))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input className="input text-xs" value={line.description} onChange={(e) => updateLine(idx, { description: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input font-mono text-xs" value={line.hsn_code} onChange={(e) => updateLine(idx, { hsn_code: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.unit_price} onChange={(e) => updateLine(idx, { unit_price: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.discount_percent} onChange={(e) => updateLine(idx, { discount_percent: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.tax_rate} onChange={(e) => updateLine(idx, { tax_rate: e.target.value })} />
                  </td>
                  <td className="px-2 py-1 text-right text-xs tabular-nums">{formatINR(line.taxable)}</td>
                  <td className="px-2 py-1 text-right text-xs tabular-nums text-slate-500">
                    {isInterState
                      ? `I ${formatINR(line.igst)}`
                      : `C+S ${formatINR(line.cgst.plus(line.sgst))}`}
                  </td>
                  <td className="px-2 py-1 text-right text-xs font-medium tabular-nums">{formatINR(line.total)}</td>
                  <td className="px-2 py-1">
                    <button className="btn-ghost p-1" onClick={() => removeLine(idx)} disabled={lines.length <= 1}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-200 p-2">
            <button className="btn-ghost" onClick={addLine}>
              <Plus size={14} className="mr-1" /> Add line
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="card space-y-1 bg-slate-50 text-sm">
            <Row label="Taxable" value={computed.totals.taxable} />
            {!isInterState ? (
              <>
                <Row label="CGST" value={computed.totals.cgst} muted />
                <Row label="SGST" value={computed.totals.sgst} muted />
              </>
            ) : (
              <Row label="IGST" value={computed.totals.igst} muted />
            )}
            <div className="border-t border-slate-200 pt-2">
              <Row label="Grand Total" value={computed.totals.total} bold />
            </div>
          </div>
        </div>

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!customerId || computed.totals.total.isZero() || create.isPending} onClick={submit}>
            {create.isPending ? 'Posting…' : 'Post Invoice'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: import('decimal.js').default; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-slate-500' : ''}`}>
      <div className={bold ? 'font-semibold' : ''}>{label}</div>
      <div className={`tabular-nums ${bold ? 'font-semibold' : ''}`}>{formatINR(value)}</div>
    </div>
  );
}
