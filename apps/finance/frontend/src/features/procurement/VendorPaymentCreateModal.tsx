import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useParties, usePostableAccounts, peekNumber } from '@/features/masters/api';
import { api } from '@/lib/api';
import { D, formatINR, sum } from '@/lib/money';
import type { VendorBill } from './api';
import { toast } from '@/components/Toaster';

function useOpenBillsForVendor(company?: number, vendor?: number) {
  return useQuery({
    queryKey: ['open-bills', company, vendor],
    enabled: company != null && vendor != null,
    queryFn: async () => {
      const r = await api.get('/procurement/vendor-bills/', {
        params: { company, vendor, status: 'POSTED', page_size: 200 },
      });
      return (r.data.results as VendorBill[]).filter((b) => Number(b.balance_due) > 0);
    },
  });
}

function useCreateVendorPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => (await api.post('/procurement/vendor-payments/create/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vpayments'] });
      qc.invalidateQueries({ queryKey: ['vbills'] });
      qc.invalidateQueries({ queryKey: ['open-bills'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export default function VendorPaymentCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId, fyId } = useActiveCompany();
  const { data: vendors } = useParties(companyId, 'VENDOR');
  const { data: accounts } = usePostableAccounts(companyId);
  const create = useCreateVendorPayment();

  const [paymentNo, setPaymentNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState<number | undefined>();
  const [mode, setMode] = useState('BANK');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('0');
  const [paidFrom, setPaidFrom] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const { data: openBills } = useOpenBillsForVendor(companyId, vendorId);

  useEffect(() => {
    if (!accounts) return;
    const code = mode === 'CASH' ? '1110' : '1121';
    const acc = accounts.find((a) => a.code === code);
    if (acc) setPaidFrom(acc.id);
  }, [mode, accounts]);

  useEffect(() => {
    if (open && companyId) {
      peekNumber(companyId, 'vendor_payment').then(setPaymentNo).catch(console.error);
    }
  }, [open, companyId]);

  const totalAllocated = useMemo(
    () => sum(Object.values(allocations).map((v) => v || 0)),
    [allocations],
  );
  const unallocated = D(amount).minus(totalAllocated);

  const submit = async () => {
    setErr(null);
    if (!companyId || !fyId || !vendorId || !paidFrom) { setErr('Missing required fields'); return; }
    if (D(amount).lte(0)) { setErr('Amount must be > 0'); return; }
    if (totalAllocated.gt(D(amount))) { setErr('Allocations exceed amount'); return; }
    const allocs = Object.entries(allocations)
      .filter(([, v]) => D(v).gt(0))
      .map(([billId, v]) => ({ bill: Number(billId), amount: v }));

    try {
      const created = await create.mutateAsync({
        company: companyId, fiscal_year: fyId,
        payment_no: paymentNo, date, vendor: vendorId, mode, reference, amount, notes,
        paid_from_account: paidFrom, allocations: allocs,
      });
      toast.success(`Payment ${created.payment_no} posted`, `${formatINR(amount)}`);
      const m = paymentNo.match(/(\d+)(?!.*\d)/);
      const next = m ? paymentNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : 'VP-0001';
      setPaymentNo(next);
      setAmount('0'); setReference(''); setNotes(''); setAllocations({}); setVendorId(undefined);
      onClose();
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Save failed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Vendor Payment" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div><label className="label">Payment #</label>
            <input className="input font-mono" value={paymentNo} onChange={(e) => setPaymentNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Vendor *</label>
            <select className="input" value={vendorId ?? ''} onChange={(e) => setVendorId(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {vendors?.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
            </select></div>
          <div><label className="label">Mode</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option>BANK</option><option>UPI</option><option>CHEQUE</option><option>CASH</option>
            </select></div>
          <div><label className="label">Reference</label>
            <input className="input font-mono" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div><label className="label">Paid From *</label>
            <select className="input" value={paidFrom ?? ''} onChange={(e) => setPaidFrom(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {accounts?.filter((a) => a.type === 'ASSET').map((a) => (<option key={a.id} value={a.id}>{a.code} {a.name}</option>))}
            </select></div>
          <div><label className="label">Amount (₹) *</label>
            <input className="input text-right tabular-nums" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        {/* Vendor bank details hint */}
        {vendorId && (() => {
          const v = vendors?.find((x) => x.id === vendorId);
          if (!v) return null;
          const hasBank = !!v.bank_account_number;
          const needsBank = mode === 'BANK' || mode === 'UPI' || mode === 'CHEQUE';
          if (!needsBank) return null;
          return hasBank ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Vendor bank details</div>
              <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-3">
                <div><span className="text-sky-600">Beneficiary:</span> <strong>{v.bank_account_name || v.legal_name || v.name}</strong></div>
                <div><span className="text-sky-600">Bank:</span> <strong>{v.bank_name || '—'}</strong></div>
                <div><span className="text-sky-600">A/C #:</span> <span className="font-mono">{v.bank_account_number}</span></div>
                <div><span className="text-sky-600">IFSC:</span> <span className="font-mono">{v.bank_ifsc || '—'}</span></div>
                <div><span className="text-sky-600">Branch:</span> {v.bank_branch || '—'}</div>
                {v.upi_id && <div><span className="text-sky-600">UPI:</span> <span className="font-mono">{v.upi_id}</span></div>}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              ⚠️ <strong>No bank details on file for {v.name}.</strong>{' '}
              <button type="button" className="underline" onClick={() => { window.location.hash = '/parties'; onClose(); }}>
                Add them now →
              </button>
            </div>
          );
        })()}

        {vendorId && (
          <div className="card overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase text-slate-500">
              Allocate to open bills ({openBills?.length ?? 0})
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-2">Bill</th><th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-right">Due</th>
                  <th className="px-4 py-2 text-right">Allocate</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {openBills?.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">No open bills for this vendor.</td></tr>}
                {openBills?.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 font-medium text-brand-600">{b.bill_no}</td>
                    <td className="px-4 py-2 text-slate-500">{b.date}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(b.grand_total)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-amber-700">{formatINR(b.balance_due)}</td>
                    <td className="px-4 py-2"><input className="input text-right tabular-nums" inputMode="decimal" value={allocations[b.id] ?? ''} placeholder="0" onChange={(e) => setAllocations((p) => ({ ...p, [b.id]: e.target.value }))} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Allocated / Payment / Unallocated</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatINR(totalAllocated)} / {formatINR(amount)} /{' '}
                    <span className={unallocated.lt(0) ? 'text-red-600' : 'text-emerald-700'}>{formatINR(unallocated)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!vendorId || D(amount).lte(0) || create.isPending} onClick={submit}>
            {create.isPending ? 'Posting…' : 'Post Payment'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
