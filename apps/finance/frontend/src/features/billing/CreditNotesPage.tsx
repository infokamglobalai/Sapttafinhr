import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCreateCreditNote, useCreditNotes, useInvoices, type CreditNote } from './api';
import { peekNumber } from '@/features/masters/api';
import { D, formatINR } from '@/lib/money';
import { toast } from '@/components/Toaster';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

export default function CreditNotesPage() {
  const { companyId } = useActiveCompany();
  const { data: notes, isLoading } = useCreditNotes(companyId);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<CreditNote | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Notes"
        subtitle="Reverse a posted invoice — auto-mirrors GST split."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New credit note</button>}
      />

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Note #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Against Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3 text-right">Taxable</th>
              <th className="px-4 py-3 text-right">Tax</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {notes?.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No credit notes yet.</td></tr>}
            {notes?.map((n) => {
              const tax = Number(n.cgst) + Number(n.sgst) + Number(n.igst);
              return (
                <tr key={n.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(n)}>
                  <td className="px-4 py-2 font-medium text-brand-600">{n.note_no}</td>
                  <td className="px-4 py-2 text-slate-500">{n.date}</td>
                  <td className="px-4 py-2">{n.invoice_no}</td>
                  <td className="px-4 py-2">{n.customer_name}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{n.reason || '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(n.taxable_amount)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-500">{formatINR(tax)}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(n.grand_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreditNoteCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Credit Note ${viewing.note_no}` : ''}
        subtitle={viewing ? `${viewing.customer_name} · against ${viewing.invoice_no}` : ''}
        sections={viewing ? [{
          title: 'Credit Note',
          fields: [
            f('Note #', viewing.note_no, { mono: true }),
            f('Date', viewing.date),
            f('Against Invoice', viewing.invoice_no),
            f('Customer', viewing.customer_name),
            f('Status', viewing.status),
            f('Journal Entry', viewing.journal_entry ? `#${viewing.journal_entry}` : null),
            f('Reason', viewing.reason, { fullWidth: true }),
          ],
        }, {
          title: 'Amounts',
          fields: [
            f('Taxable', formatINR(viewing.taxable_amount)),
            f('CGST', Number(viewing.cgst) ? formatINR(viewing.cgst) : null),
            f('SGST', Number(viewing.sgst) ? formatINR(viewing.sgst) : null),
            f('IGST', Number(viewing.igst) ? formatINR(viewing.igst) : null),
            f('Grand Total', formatINR(viewing.grand_total)),
          ],
        }] : []}
      />
    </div>
  );
}

function CreditNoteCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId, fyId } = useActiveCompany();
  const { data: invoices } = useInvoices(companyId);
  const create = useCreateCreditNote();

  const [noteNo, setNoteNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceId, setInvoiceId] = useState<number | undefined>();
  const [taxable, setTaxable] = useState('0');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && companyId) {
      peekNumber(companyId, 'credit_note').then(setNoteNo).catch(console.error);
    }
  }, [open, companyId]);

  const selectedInvoice = invoices?.find((i) => i.id === invoiceId);

  const submit = async () => {
    setErr(null);
    if (!companyId || !fyId || !invoiceId) { setErr('Pick an invoice'); return; }
    if (D(taxable).lte(0)) { setErr('Taxable amount must be > 0'); return; }
    try {
      const cn = await create.mutateAsync({
        company: companyId, fiscal_year: fyId,
        note_no: noteNo, date, invoice: invoiceId,
        taxable_amount: taxable, reason,
      });
      const m = noteNo.match(/(\d+)(?!.*\d)/);
      const next = m ? noteNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : 'CN-0001';
      setNoteNo(next);
      setTaxable('0'); setReason(''); setInvoiceId(undefined);
      onClose();
      toast.success(`Credit Note ${cn.note_no} posted`, `Total ${formatINR(cn.grand_total)} · JE #${cn.journal_entry}`);
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Save failed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Credit Note" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label className="label">Note #</label>
            <input className="input font-mono" value={noteNo} onChange={(e) => setNoteNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label">Against Invoice *</label>
            <select className="input" value={invoiceId ?? ''} onChange={(e) => setInvoiceId(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {invoices?.filter((i) => i.status === 'POSTED').map((i) => (
                <option key={i.id} value={i.id}>{i.invoice_no} — {i.customer_name} ({formatINR(i.grand_total)})</option>
              ))}
            </select></div>
          <div><label className="label">Taxable Amount (₹) *</label>
            <input className="input text-right tabular-nums" inputMode="decimal" value={taxable} onChange={(e) => setTaxable(e.target.value)} /></div>
          <div><label className="label">Reason</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Return, discount, etc." /></div>
        </div>

        {selectedInvoice && (
          <div className="rounded bg-slate-50 p-3 text-xs text-slate-600">
            Invoice taxable: <strong className="tabular-nums">{formatINR(selectedInvoice.taxable_amount)}</strong> ·
            Tax mix will be applied proportionally to CGST/SGST/IGST.
          </div>
        )}

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!invoiceId || D(taxable).lte(0) || create.isPending} onClick={submit}>
            {create.isPending ? 'Posting…' : 'Post Credit Note'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
