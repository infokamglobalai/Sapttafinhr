import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePostableAccounts } from '@/features/masters/api';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';

export default function FixedAssetCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId } = useActiveCompany();
  const { data: accounts } = usePostableAccounts(companyId);
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/assets/fixed-assets/', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets'] }),
  });

  const assetAccts = (accounts ?? []).filter((a) => a.type === 'ASSET');
  const liabAccts = (accounts ?? []).filter((a) => a.type === 'LIABILITY');
  const expAccts = (accounts ?? []).filter((a) => a.type === 'EXPENSE');

  const [form, setForm] = useState({
    code: 'FA-0001', name: '', category: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    purchase_cost: '0', salvage_value: '0',
    method: 'SLM', useful_life_years: '5', wdv_rate: '15',
  });
  const [assetAccount, setAssetAccount] = useState<number | undefined>();
  const [accumDepr, setAccumDepr] = useState<number | undefined>();
  const [expenseAccount, setExpenseAccount] = useState<number | undefined>();
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!companyId || !assetAccount || !accumDepr || !expenseAccount) {
      setErr('All three accounts required');
      return;
    }
    try {
      await create.mutateAsync({
        ...form, company: companyId,
        asset_account: assetAccount,
        accum_depr_account: accumDepr,
        expense_account: expenseAccount,
      });
      toast.success(`Fixed asset ${form.code} added`);
      onClose();
    } catch (e: any) { setErr(JSON.stringify(e?.response?.data ?? 'Failed')); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Fixed Asset" size="lg">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label className="label">Code *</label>
          <input className="input font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
        <div><label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Category</label>
          <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Computers, Furniture" /></div>
        <div><label className="label">Purchase Date</label>
          <input className="input" type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
        <div><label className="label">Purchase Cost *</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} /></div>
        <div><label className="label">Salvage Value</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={form.salvage_value} onChange={(e) => setForm({ ...form, salvage_value: e.target.value })} /></div>
        <div><label className="label">Method</label>
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="SLM">Straight Line (SLM)</option>
            <option value="WDV">Written Down Value (WDV)</option>
          </select></div>
        {form.method === 'SLM' ? (
          <div><label className="label">Useful Life (years)</label>
            <input className="input text-right tabular-nums" inputMode="decimal" value={form.useful_life_years} onChange={(e) => setForm({ ...form, useful_life_years: e.target.value })} /></div>
        ) : (
          <div><label className="label">WDV Rate (%)</label>
            <input className="input text-right tabular-nums" inputMode="decimal" value={form.wdv_rate} onChange={(e) => setForm({ ...form, wdv_rate: e.target.value })} /></div>
        )}
        <div><label className="label">Asset GL Account *</label>
          <select className="input" value={assetAccount ?? ''} onChange={(e) => setAssetAccount(Number(e.target.value) || undefined)}>
            <option value="">— select —</option>
            {assetAccts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select></div>
        <div><label className="label">Accum. Depr Account *</label>
          <select className="input" value={accumDepr ?? ''} onChange={(e) => setAccumDepr(Number(e.target.value) || undefined)}>
            <option value="">— select (Liability) —</option>
            {liabAccts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select></div>
        <div><label className="label">Depr Expense Account *</label>
          <select className="input" value={expenseAccount ?? ''} onChange={(e) => setExpenseAccount(Number(e.target.value) || undefined)}>
            <option value="">— select —</option>
            {expAccts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select></div>
      </div>
      {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!form.name || create.isPending}>
          {create.isPending ? 'Saving…' : 'Save asset'}
        </button>
      </div>
    </Modal>
  );
}
