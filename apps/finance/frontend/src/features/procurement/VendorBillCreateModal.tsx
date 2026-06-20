import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePostableAccounts, useParties, useItems, peekNumber } from '@/features/masters/api';
import { useCreateVendorBill } from './api';
import { D, formatINR, sum } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface DraftLine {
  tmpId: string;
  item: number | null;
  expense_account: number | null;
  description: string;
  hsn_code: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  tds_section: string;
  tds_rate: string;
}

const emptyLine = (): DraftLine => ({
  tmpId: crypto.randomUUID(),
  item: null, expense_account: null, description: '', hsn_code: '',
  quantity: '1', unit_price: '0', tax_rate: '18',
  tds_section: '', tds_rate: '0',
});

export interface BillPrefill {
  billNo?: string;
  date?: string;
  dueDate?: string;
  placeOfSupply?: string;
  notes?: string;
  lines?: { description: string; hsn_code: string; quantity: string; unit_price: string; tax_rate: string }[];
}

export default function VendorBillCreateModal({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: BillPrefill }) {
  const { companyId, fyId, companies } = useActiveCompany();
  const seller = companies?.find((c) => c.id === companyId);
  const { data: vendors } = useParties(companyId, 'VENDOR');
  const { data: items } = useItems(companyId);
  const { data: accounts } = usePostableAccounts(companyId);
  const create = useCreateVendorBill();

  const expenseAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.type === 'EXPENSE' || a.type === 'ASSET'),
    [accounts],
  );

  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [vendorId, setVendorId] = useState<number | undefined>();
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [rcm, setRcm] = useState(false);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const v = vendors?.find((x) => x.id === vendorId);
    if (v?.state_code) setPlaceOfSupply(v.state_code);
  }, [vendorId, vendors]);

  useEffect(() => {
    if (open && companyId && (!prefill || !prefill.billNo)) {
      peekNumber(companyId, 'vendor_bill').then(setBillNo).catch(console.error);
    }
  }, [open, companyId, prefill]);

  const appliedPrefill = useRef<BillPrefill | undefined>(undefined);
  useEffect(() => {
    if (!prefill || !open || prefill === appliedPrefill.current) return;
    appliedPrefill.current = prefill;
    if (prefill.billNo) setBillNo(prefill.billNo);
    if (prefill.date) setDate(prefill.date);
    if (prefill.dueDate) setDueDate(prefill.dueDate);
    if (prefill.placeOfSupply) setPlaceOfSupply(prefill.placeOfSupply);
    if (prefill.notes) setNotes(prefill.notes);
    if (prefill.lines?.length) {
      setLines(prefill.lines.map((l) => ({
        tmpId: crypto.randomUUID(),
        item: null, expense_account: null,
        description: l.description,
        hsn_code: l.hsn_code || '',
        quantity: l.quantity || '1',
        unit_price: l.unit_price || '0',
        tax_rate: l.tax_rate || '18',
        tds_section: '', tds_rate: '0',
      })));
    }
  }, [prefill, open]);

  const sellerState = seller?.state_code ?? '';
  const isInterState = sellerState !== '' && placeOfSupply !== '' && sellerState !== placeOfSupply;

  const totals = useMemo(() => {
    const computed = lines.map((l) => {
      const taxable = D(l.quantity).times(D(l.unit_price));
      const tax = taxable.times(D(l.tax_rate)).div(100);
      const cgst = isInterState ? D(0) : tax.div(2);
      const sgst = isInterState ? D(0) : tax.minus(cgst);
      const igst = isInterState ? tax : D(0);
      const tds = taxable.times(D(l.tds_rate)).div(100);
      return { taxable, cgst, sgst, igst, tds, total: taxable.plus(tax) };
    });
    return {
      taxable: sum(computed.map((c) => c.taxable)),
      cgst: sum(computed.map((c) => c.cgst)),
      sgst: sum(computed.map((c) => c.sgst)),
      igst: sum(computed.map((c) => c.igst)),
      tds: sum(computed.map((c) => c.tds)),
      total: sum(computed.map((c) => c.total)),
    };
  }, [lines, isInterState]);

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
    if (lines.some((l) => !l.expense_account)) { setErr('Every line needs an expense account'); return; }
    if (totals.total.isZero()) { setErr('Total cannot be zero'); return; }
    try {
      const created = await create.mutateAsync({
        company: companyId, fiscal_year: fyId, bill_no: billNo, date,
        due_date: dueDate || null, vendor: vendorId, place_of_supply: placeOfSupply,
        rcm_applicable: rcm, notes,
        lines: lines.map(({ tmpId: _t, ...rest }) => rest),
      });
      toast.success(`Vendor Bill ${created.bill_no} posted`, `Total ${formatINR(totals.total)} · TDS ${formatINR(totals.tds)}`);
      const m = billNo.match(/(\d+)(?!.*\d)/);
      const next = m ? billNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : 'VB-0001';
      setBillNo(next);
      setLines([emptyLine()]); setNotes(''); setVendorId(undefined);
      onClose();
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Save failed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Vendor Bill" size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div><label className="label">Vendor *</label>
            <select className="input" value={vendorId ?? ''} onChange={(e) => setVendorId(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {vendors?.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
            </select></div>
          <div><label className="label">Vendor's Bill #</label>
            <input className="input font-mono" value={billNo} onChange={(e) => setBillNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Due Date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div><label className="label">Place of Supply (state)</label>
            <input className="input" maxLength={2} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
            <div className="mt-1 text-xs text-slate-500">
              Buyer (you): {sellerState || '—'} → {isInterState ? 'IGST' : 'CGST+SGST'}
            </div></div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={rcm} onChange={(e) => setRcm(e.target.checked)} />
              Reverse Charge (RCM)
            </label></div>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-2 py-2">Item</th><th className="px-2 py-2">Expense A/C *</th><th className="px-2 py-2">Description</th>
                <th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">GST%</th><th className="px-2 py-2 text-right">TDS%</th><th /></tr>
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
                  <td className="px-2 py-1">
                    <select className="input text-xs" value={line.expense_account ?? ''} onChange={(e) => updateLine(idx, { expense_account: Number(e.target.value) || null })}>
                      <option value="">— select —</option>
                      {expenseAccounts.map((a) => (<option key={a.id} value={a.id}>{a.code} {a.name}</option>))}
                    </select>
                  </td>
                  <td className="px-2 py-1"><input className="input text-xs" value={line.description} onChange={(e) => updateLine(idx, { description: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.unit_price} onChange={(e) => updateLine(idx, { unit_price: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.tax_rate} onChange={(e) => updateLine(idx, { tax_rate: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.tds_rate} onChange={(e) => updateLine(idx, { tds_rate: e.target.value })} /></td>
                  <td className="px-2 py-1">
                    <button className="btn-ghost p-1" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} disabled={lines.length <= 1}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-200 p-2">
            <button className="btn-ghost" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus size={14} className="mr-1" /> Add line
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label className="label">Notes</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="card space-y-1 bg-slate-50 text-sm">
            <Row label="Taxable" v={totals.taxable} />
            {!isInterState ? (<><Row label="CGST" v={totals.cgst} muted /><Row label="SGST" v={totals.sgst} muted /></>) : <Row label="IGST" v={totals.igst} muted />}
            {totals.tds.gt(0) && <Row label="TDS (deducted)" v={totals.tds} muted />}
            <div className="border-t border-slate-200 pt-2"><Row label="Grand Total" v={totals.total} bold /></div>
            {totals.tds.gt(0) && <Row label="Net Payable to Vendor" v={totals.total.minus(totals.tds)} bold />}
          </div>
        </div>

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!vendorId || totals.total.isZero() || create.isPending} onClick={submit}>
            {create.isPending ? 'Posting…' : 'Post Bill'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, v, bold, muted }: { label: string; v: import('decimal.js').default; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-slate-500' : ''}`}>
      <div className={bold ? 'font-semibold' : ''}>{label}</div>
      <div className={`tabular-nums ${bold ? 'font-semibold' : ''}`}>{formatINR(v)}</div>
    </div>
  );
}
