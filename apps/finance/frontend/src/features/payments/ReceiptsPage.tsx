import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePostableAccounts, useParties, peekNumber } from '@/features/masters/api';
import { useOpenInvoicesForCustomer } from '@/features/billing/api';
import { useCreateReceipt, useReceipts, type Receipt } from './api';
import { D, formatINR, sum } from '@/lib/money';
import { toast } from '@/components/Toaster';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

export default function ReceiptsPage() {
  const { companyId } = useActiveCompany();
  const { data: receipts, isLoading } = useReceipts(companyId);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Receipt | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        subtitle="Customer payments — auto-allocates against open invoices."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New receipt</button>}
      />

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Receipt #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Deposited to</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Allocations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {receipts?.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No receipts yet.</td></tr>}
            {receipts?.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(r)}>
                <td className="px-4 py-2 font-medium text-brand-600">{r.receipt_no}</td>
                <td className="px-4 py-2 text-slate-500">{r.date}</td>
                <td className="px-4 py-2">{r.customer_name}</td>
                <td className="px-4 py-2 text-xs">{r.mode}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.reference || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.deposit_account_code}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">{formatINR(r.amount)}</td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {r.allocations.length > 0
                    ? r.allocations.map((a) => `${a.invoice_no}: ${formatINR(a.amount)}`).join(', ')
                    : 'unallocated'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReceiptCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Receipt ${viewing.receipt_no}` : ''}
        subtitle={viewing?.customer_name}
        size="lg"
        sections={viewing ? [{
          title: 'Receipt',
          fields: [
            f('Receipt #', viewing.receipt_no, { mono: true }),
            f('Date', viewing.date),
            f('Customer', viewing.customer_name),
            f('Mode', viewing.mode),
            f('Reference', viewing.reference, { mono: true }),
            f('Amount', formatINR(viewing.amount)),
            f('Deposited To', viewing.deposit_account_code, { mono: true }),
            f('Status', viewing.status),
            f('Notes', viewing.notes, { fullWidth: true }),
          ],
        }] : []}
        nestedTables={viewing ? [{
          title: 'Allocations',
          rows: viewing.allocations ?? [],
          emptyText: 'Unallocated (sits on customer as advance)',
          columns: [
            { key: 'invoice_no', label: 'Invoice #', mono: true },
            { key: 'amount', label: 'Amount', align: 'right', render: (r: any) => formatINR(r.amount) },
          ],
        }] : []}
      />
    </div>
  );
}

function ReceiptCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId, fyId } = useActiveCompany();
  const { data: customers } = useParties(companyId, 'CUSTOMER');
  const { data: accounts } = usePostableAccounts(companyId);
  const create = useCreateReceipt();

  const [receiptNo, setReceiptNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [mode, setMode] = useState<Receipt['mode']>('BANK');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('0');
  const [depositAccount, setDepositAccount] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);

  // Default deposit account: bank for BANK/UPI, cash for CASH
  useEffect(() => {
    if (!accounts) return;
    const code = mode === 'CASH' ? '1110' : '1121';
    const acc = accounts.find((a) => a.code === code);
    if (acc) setDepositAccount(acc.id);
  }, [mode, accounts]);

  useEffect(() => {
    if (open && companyId) {
      peekNumber(companyId, 'receipt').then(setReceiptNo).catch(console.error);
    }
  }, [open, companyId]);

  const { data: openInvoices } = useOpenInvoicesForCustomer(companyId, customerId);

  const totalAllocated = useMemo(
    () => sum(Object.values(allocations).map((v) => v || 0)),
    [allocations],
  );
  const unallocated = D(amount).minus(totalAllocated);

  const submit = async () => {
    setErr(null);
    if (!companyId || !fyId || !customerId || !depositAccount) { setErr('Missing required fields'); return; }
    if (D(amount).lte(0)) { setErr('Amount must be > 0'); return; }
    if (totalAllocated.gt(D(amount))) { setErr('Allocations exceed amount'); return; }

    const allocs = Object.entries(allocations)
      .filter(([, v]) => D(v).gt(0))
      .map(([invoiceId, v]) => ({ invoice: Number(invoiceId), amount: v }));

    try {
      const r = await create.mutateAsync({
        company: companyId, fiscal_year: fyId,
        receipt_no: receiptNo, date,
        customer: customerId, mode, reference, amount, notes,
        deposit_account: depositAccount,
        allocations: allocs,
      });
      const m = receiptNo.match(/(\d+)(?!.*\d)/);
      const next = m ? receiptNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : 'REC-0001';
      setReceiptNo(next);
      setAmount('0'); setReference(''); setNotes(''); setAllocations({}); setCustomerId(undefined);
      onClose();
      toast.success(`Receipt ${r.receipt_no} posted`, `${formatINR(r.amount)} · JE #${r.journal_entry}`);
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Save failed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Receipt" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div><label className="label">Receipt #</label>
            <input className="input font-mono" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Customer *</label>
            <select className="input" value={customerId ?? ''} onChange={(e) => setCustomerId(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {customers?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select></div>
          <div><label className="label">Mode</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as Receipt['mode'])}>
              <option value="BANK">Bank Transfer</option><option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option><option value="CASH">Cash</option>
            </select></div>
          <div><label className="label">Reference (UTR / cheque #)</label>
            <input className="input font-mono" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div><label className="label">Deposit to *</label>
            <select className="input" value={depositAccount ?? ''} onChange={(e) => setDepositAccount(Number(e.target.value) || undefined)}>
              <option value="">— select —</option>
              {accounts?.filter((a) => a.type === 'ASSET').map((a) => (<option key={a.id} value={a.id}>{a.code} — {a.name}</option>))}
            </select></div>
          <div><label className="label">Amount (₹) *</label>
            <input className="input text-right tabular-nums" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="md:col-span-2"><label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        {customerId && (
          <div className="card overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase text-slate-500">
              Allocate to open invoices ({openInvoices?.length ?? 0})
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Invoice</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Due</th>
                  <th className="px-4 py-2 text-right">Allocate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {openInvoices?.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-500">No open invoices for this customer.</td></tr>}
                {openInvoices?.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2 font-medium text-brand-600">{inv.invoice_no}</td>
                    <td className="px-4 py-2 text-slate-500">{inv.date}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(inv.grand_total)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-amber-700">{formatINR(inv.balance_due)}</td>
                    <td className="px-4 py-2">
                      <input
                        className="input text-right tabular-nums"
                        inputMode="decimal"
                        value={allocations[inv.id] ?? ''}
                        placeholder="0"
                        onChange={(e) => setAllocations((p) => ({ ...p, [inv.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Allocated / Receipt / Unallocated</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatINR(totalAllocated)} / {formatINR(amount)} /{' '}
                    <span className={unallocated.lt(0) ? 'text-red-600' : 'text-emerald-700'}>
                      {formatINR(unallocated)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!customerId || D(amount).lte(0) || create.isPending} onClick={submit}>
            {create.isPending ? 'Posting…' : 'Post Receipt'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
