import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePostableAccounts } from '@/features/masters/api';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';

export default function BankAccountCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId } = useActiveCompany();
  const { data: accounts } = usePostableAccounts(companyId);
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/banking/bank-accounts/', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  });

  const [form, setForm] = useState({
    name: '', bank_name: '', account_number: '', ifsc: '', branch: '',
    currency: 'INR', is_active: true, opening_balance: '0',
  });
  const [ledger, setLedger] = useState<number | undefined>();
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!companyId || !ledger) { setErr('Pick GL account'); return; }
    try {
      await create.mutateAsync({ ...form, company: companyId, ledger_account: ledger });
      toast.success(`Bank account ${form.name} added`);
      onClose();
    } catch (e: any) { setErr(JSON.stringify(e?.response?.data ?? 'Failed')); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Bank Account" size="md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Bank Name *</label>
          <input className="input" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
        <div><label className="label">A/C Number *</label>
          <input className="input font-mono" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
        <div><label className="label">IFSC</label>
          <input className="input font-mono" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} /></div>
        <div><label className="label">Branch</label>
          <input className="input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></div>
        <div><label className="label">Currency</label>
          <input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
        <div className="md:col-span-2"><label className="label">GL Account *</label>
          <select className="input" value={ledger ?? ''} onChange={(e) => setLedger(Number(e.target.value) || undefined)}>
            <option value="">— select —</option>
            {accounts?.filter((a) => a.type === 'ASSET').map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select></div>
        <div><label className="label">Opening Balance</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} /></div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label></div>
      </div>
      {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!form.name || !ledger || create.isPending}>
          {create.isPending ? 'Saving…' : 'Save bank account'}
        </button>
      </div>
    </Modal>
  );
}
