import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePostableAccounts } from '@/features/masters/api';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { formatINR, sum } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface DraftLine {
  tmpId: string;
  date: string;
  expense_account: number | null;
  description: string;
  amount: string;
}

const emptyLine = (): DraftLine => ({
  tmpId: crypto.randomUUID(),
  date: new Date().toISOString().slice(0, 10),
  expense_account: null, description: '', amount: '0',
});

export default function ClaimCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId, fyId } = useActiveCompany();
  const { user } = useAuthStore();
  const { data: accounts } = usePostableAccounts(companyId);
  const qc = useQueryClient();

  const expenseAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.type === 'EXPENSE'),
    [accounts],
  );

  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/expenses/claims/', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
  });

  const [claimNo, setClaimNo] = useState('EXP-0001');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [err, setErr] = useState<string | null>(null);

  const total = useMemo(() => sum(lines.map((l) => l.amount || 0)), [lines]);

  const submit = async () => {
    setErr(null);
    if (!companyId || !fyId || !user) { setErr('Missing required fields'); return; }
    if (lines.some((l) => !l.expense_account)) { setErr('Every line needs an expense account'); return; }
    if (total.isZero()) { setErr('Total cannot be zero'); return; }
    try {
      await create.mutateAsync({
        company: companyId, fiscal_year: fyId, claim_no: claimNo, date,
        employee: user.id, description,
        lines: lines.map(({ tmpId: _t, ...rest }) => rest),
      });
      toast.success(`Claim ${claimNo} saved as Draft`, `Total ${formatINR(total)} · Submit it for approval next.`);
      const m = claimNo.match(/(\d+)(?!.*\d)/);
      const next = m ? claimNo.replace(/(\d+)(?!.*\d)/, String(Number(m[1]) + 1).padStart(m[1].length, '0')) : 'EXP-0001';
      setClaimNo(next);
      setLines([emptyLine()]); setDescription('');
      onClose();
    } catch (e: any) { setErr(JSON.stringify(e?.response?.data ?? 'Failed')); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Expense Claim" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div><label className="label">Claim #</label>
            <input className="input font-mono" value={claimNo} onChange={(e) => setClaimNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="md:col-span-3"><label className="label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Client meeting expenses, travel" /></div>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-2 py-2">Date</th><th className="px-2 py-2">Expense A/C *</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2 text-right">Amount</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.map((line, idx) => (
                <tr key={line.tmpId}>
                  <td className="px-2 py-1"><input className="input text-xs" type="date" value={line.date} onChange={(e) => setLines((p) => p.map((l, i) => i === idx ? { ...l, date: e.target.value } : l))} /></td>
                  <td className="px-2 py-1">
                    <select className="input text-xs" value={line.expense_account ?? ''} onChange={(e) => setLines((p) => p.map((l, i) => i === idx ? { ...l, expense_account: Number(e.target.value) || null } : l))}>
                      <option value="">— select —</option>
                      {expenseAccounts.map((a) => (<option key={a.id} value={a.id}>{a.code} {a.name}</option>))}
                    </select>
                  </td>
                  <td className="px-2 py-1"><input className="input text-xs" value={line.description} onChange={(e) => setLines((p) => p.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))} /></td>
                  <td className="px-2 py-1"><input className="input text-right text-xs tabular-nums" inputMode="decimal" value={line.amount} onChange={(e) => setLines((p) => p.map((l, i) => i === idx ? { ...l, amount: e.target.value } : l))} /></td>
                  <td className="px-2 py-1">
                    <button className="btn-ghost p-1" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} disabled={lines.length <= 1}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-medium">
              <tr><td colSpan={3} className="px-2 py-2 text-right">Total</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatINR(total)}</td><td /></tr>
            </tfoot>
          </table>
          <div className="border-t border-slate-200 p-2">
            <button className="btn-ghost" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus size={14} className="mr-1" /> Add line
            </button>
          </div>
        </div>

        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={total.isZero() || create.isPending} onClick={submit}>
            {create.isPending ? 'Saving…' : 'Save claim (Draft)'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
