import { useState } from 'react';
import { Plus, PiggyBank } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePostableAccounts } from '@/features/masters/api';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface Budget {
  id: number;
  fiscal_year: number;
  account_code: string;
  period: string;
  amount: string;
  notes: string;
}

export default function BudgetsPage() {
  const { companyId, fyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['budgets', companyId],
    enabled: companyId != null,
    queryFn: async () => (await api.get('/expenses/budgets/', { params: { company: companyId } })).data.results as Budget[],
  });
  const { data: accounts } = usePostableAccounts(companyId);
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/expenses/budgets/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['budget-vs-actual'] });
      setOpen(false);
      toast('Budget line saved');
    },
  });

  const [form, setForm] = useState({
    account: 0, period: 'MONTHLY', amount: '0', notes: '',
  });

  const expenseAccounts = (accounts ?? []).filter((a) => a.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        subtitle="Set expense budgets by account and period."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1" /> Add budget
          </button>
        }
      />
      <SimpleTable<Budget>
        rows={data}
        loading={isLoading}
        emptyIcon={PiggyBank}
        emptyTitle="No budgets defined"
        emptyDescription="Create budget lines to compare against actuals in Budget vs Actual report."
        emptyActionLabel="Add budget"
        onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'account_code', label: 'Account', render: (r) => <span className="font-mono text-xs">{r.account_code}</span> },
          { key: 'period', label: 'Period' },
          { key: 'amount', label: 'Budget', align: 'right', render: (r) => formatINR(r.amount) },
          { key: 'notes', label: 'Notes' },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New budget line">
        <div className="space-y-3">
          <select className="input w-full" value={form.account}
            onChange={(e) => setForm({ ...form, account: Number(e.target.value) })}>
            <option value={0}>Expense account…</option>
            {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
          <select className="input w-full" value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </select>
          <input className="input w-full" placeholder="Amount" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="input w-full" placeholder="Notes" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn-primary w-full" disabled={create.isPending || !companyId || !fyId || !form.account}
            onClick={() => create.mutate({
              company: companyId,
              fiscal_year: fyId,
              account: form.account,
              period: form.period,
              amount: form.amount,
              notes: form.notes,
            })}>
            Save budget
          </button>
        </div>
      </Modal>
    </div>
  );
}
