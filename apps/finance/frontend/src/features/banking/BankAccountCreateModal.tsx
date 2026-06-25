import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useIfscLookup } from '@/hooks/useIfscLookup';
import { usePostableAccounts, useSeedAccounts } from '@/features/masters/api';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';
import {
  formatIfscLocation,
  sanitizeAccountNumber,
  sanitizeIfscInput,
  suggestBankLabel,
  validateAccountNumber,
  validateIfscFormat,
} from '@/lib/ifscLookup';

export default function BankAccountCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId } = useActiveCompany();
  const { data: accounts } = usePostableAccounts(companyId);
  const seedAccounts = useSeedAccounts();
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
  const ifscLookup = useIfscLookup(form.ifsc);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: '', bank_name: '', account_number: '', ifsc: '', branch: '',
      currency: 'INR', is_active: true, opening_balance: '0',
    });
    setLedger(undefined);
    setErr(null);
  }, [open]);

  useEffect(() => {
    if (ifscLookup.status !== 'found' || !ifscLookup.details) return;
    const d = ifscLookup.details;
    setForm((prev) => ({
      ...prev,
      branch: d.branch_text || prev.branch,
      bank_name: prev.bank_name || d.bank,
      name: prev.name || suggestBankLabel(d),
    }));
    toast.success('IFSC verified', `${d.bank}, ${d.city || d.branch}`);
  }, [ifscLookup.status, ifscLookup.details]);

  const submit = async () => {
    setErr(null);
    const ifscErr = validateIfscFormat(form.ifsc, true);
    if (ifscErr) { setErr(ifscErr); return; }
    if (ifscLookup.status === 'loading') {
      setErr('IFSC lookup in progress — wait a moment.');
      return;
    }
    if (ifscLookup.status !== 'found') {
      setErr(ifscLookup.error ?? 'Enter a valid IFSC to verify the bank branch.');
      return;
    }
    const acErr = validateAccountNumber(form.account_number);
    if (acErr) { setErr(acErr); return; }
    if (!form.name) { setErr('Name is required'); return; }
    if (!form.bank_name) { setErr('Bank Name is required'); return; }
    if (!companyId || !ledger) { setErr('Pick GL account'); return; }
    try {
      await create.mutateAsync({
        ...form,
        account_number: sanitizeAccountNumber(form.account_number),
        ifsc: sanitizeIfscInput(form.ifsc),
        company: companyId,
        ledger_account: ledger,
      });
      toast.success(`Bank account ${form.name} added`);
      onClose();
    } catch (e: any) { setErr(JSON.stringify(e?.response?.data ?? 'Failed')); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Bank Account" size="md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">IFSC *</label>
          <div className="relative">
            <input
              className={`input font-mono pr-9 ${ifscLookup.status === 'invalid' || ifscLookup.status === 'error' ? 'border-red-300' : ifscLookup.status === 'found' ? 'border-emerald-300' : ''}`}
              maxLength={11}
              placeholder="HDFC0001234"
              value={form.ifsc}
              onChange={(e) => setForm({ ...form, ifsc: sanitizeIfscInput(e.target.value) })}
            />
            {ifscLookup.status === 'loading' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>
            )}
            {ifscLookup.status === 'found' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">✓</span>
            )}
          </div>
          {(ifscLookup.status === 'invalid' || ifscLookup.status === 'error') && ifscLookup.error && (
            <p className="mt-1 text-[11px] text-red-600">{ifscLookup.error}</p>
          )}
        </div>
        <div><label className="label">Bank Name *</label>
          <input className="input" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
        {ifscLookup.details && (
          <div className="md:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
            <div className="font-medium">{ifscLookup.details.bank}</div>
            <div className="mt-0.5">{formatIfscLocation(ifscLookup.details)}</div>
          </div>
        )}
        <div><label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">A/C Number *</label>
          <input
            className="input font-mono"
            inputMode="numeric"
            value={form.account_number}
            onChange={(e) => setForm({ ...form, account_number: sanitizeAccountNumber(e.target.value) })}
          /></div>
        <div><label className="label">Currency</label>
          <input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
        <div className="md:col-span-2"><label className="label">GL Account *</label>
          <div className="flex flex-col gap-2 w-full">
            {(!accounts || accounts.filter((a) => a.type === 'ASSET').length === 0) ? (
              <div className="flex flex-col gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-sm text-amber-800 font-medium">
                  <strong>Missing Chart of Accounts:</strong> You must initialize the standard accounting ledgers before you can save a bank account.
                </div>
                <button 
                  type="button"
                  className="btn-primary w-full bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
                  onClick={() => {
                    if (companyId) seedAccounts.mutateAsync(companyId);
                  }}
                  disabled={seedAccounts.isPending || !companyId}
                >
                  {seedAccounts.isPending ? 'Initializing...' : 'Initialize Default Accounts Now'}
                </button>
              </div>
            ) : (
              <select className="input w-full" value={ledger ?? ''} onChange={(e) => setLedger(Number(e.target.value) || undefined)}>
                <option value="">— select —</option>
                {accounts.filter((a) => a.type === 'ASSET').map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
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
        <button className="btn-primary" onClick={submit} disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Save bank account'}
        </button>
      </div>
    </Modal>
  );
}
