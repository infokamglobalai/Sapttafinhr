import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePostableAccounts } from '@/features/masters/api';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import { toast } from '@/components/Toaster';

interface Float {
  id: number; name: string; custodian_email: string;
  float_limit: string; current_balance: string; is_active: boolean;
}
export default function PettyCashPage() {
  const { companyId } = useActiveCompany();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: floats, isLoading } = useQuery({
    queryKey: ['petty-floats', companyId],
    enabled: companyId != null,
    queryFn: async () => (await api.get('/expenses/petty-floats/', { params: { company: companyId } })).data.results as Float[],
  });
  const [floatOpen, setFloatOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [selectedFloat, setSelectedFloat] = useState<number | null>(null);
  const { data: accounts } = usePostableAccounts(companyId);

  const createFloat = useMutation({
    mutationFn: async (payload: any) => (await api.post('/expenses/petty-floats/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['petty-floats'] });
      setFloatOpen(false);
      toast.success('Petty cash float created');
    },
  });

  const createTxn = useMutation({
    mutationFn: async (payload: any) => (await api.post('/expenses/petty-txns/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['petty-floats'] });
      setTxnOpen(false);
      toast.success('Transaction recorded');
    },
  });

  const [floatForm, setFloatForm] = useState({ name: 'Main float', float_limit: '5000', cash_account: 0 });
  const [txnForm, setTxnForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    kind: 'EXPENSE', amount: '0', description: '',
  });

  const cashAccounts = (accounts ?? []).filter((a) => a.type === 'ASSET');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Petty Cash"
        subtitle="Float accounts and imprest transactions."
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setTxnOpen(true)}>Record txn</button>
            <button className="btn-primary" onClick={() => setFloatOpen(true)}>
              <Plus size={16} className="mr-1" /> New float
            </button>
          </div>
        }
      />
      <SimpleTable<Float>
        rows={floats}
        loading={isLoading}
        emptyIcon={Wallet}
        emptyTitle="No petty cash floats"
        emptyDescription="Create a float for a custodian to track imprest expenses."
        emptyActionLabel="Create float"
        onEmptyAction={() => setFloatOpen(true)}
        onRowClick={(r) => setSelectedFloat(r.id)}
        columns={[
          { key: 'name', label: 'Float' },
          { key: 'custodian_email', label: 'Custodian' },
          { key: 'float_limit', label: 'Limit', align: 'right', render: (r) => formatINR(r.float_limit) },
          { key: 'current_balance', label: 'Balance', align: 'right', render: (r) => formatINR(r.current_balance) },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? 'Yes' : 'No' },
        ]}
      />

      <Modal open={floatOpen} onClose={() => setFloatOpen(false)} title="New petty cash float">
        <div className="space-y-3">
          <input className="input w-full" placeholder="Name" value={floatForm.name}
            onChange={(e) => setFloatForm({ ...floatForm, name: e.target.value })} />
          <input className="input w-full" placeholder="Float limit" value={floatForm.float_limit}
            onChange={(e) => setFloatForm({ ...floatForm, float_limit: e.target.value })} />
          <select className="input w-full" value={floatForm.cash_account}
            onChange={(e) => setFloatForm({ ...floatForm, cash_account: Number(e.target.value) })}>
            <option value={0}>Cash account…</option>
            {cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
          <button className="btn-primary w-full" disabled={createFloat.isPending || !companyId || !user?.id}
            onClick={() => createFloat.mutate({
              company: companyId,
              name: floatForm.name,
              float_limit: floatForm.float_limit,
              cash_account: floatForm.cash_account,
              custodian: user?.id,
            })}>
            Create
          </button>
        </div>
      </Modal>

      <Modal open={txnOpen} onClose={() => setTxnOpen(false)} title="Record petty cash transaction">
        <div className="space-y-3">
          <select className="input w-full" value={selectedFloat ?? ''}
            onChange={(e) => setSelectedFloat(Number(e.target.value) || null)}>
            <option value="">Float…</option>
            {(floats ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input type="date" className="input w-full" value={txnForm.date}
            onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })} />
          <select className="input w-full" value={txnForm.kind}
            onChange={(e) => setTxnForm({ ...txnForm, kind: e.target.value })}>
            <option value="EXPENSE">Expense</option>
            <option value="REPLENISH">Replenish</option>
          </select>
          <input className="input w-full" placeholder="Amount" value={txnForm.amount}
            onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} />
          <input className="input w-full" placeholder="Description" value={txnForm.description}
            onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })} />
          <button className="btn-primary w-full" disabled={createTxn.isPending || !selectedFloat}
            onClick={() => createTxn.mutate({ float_account: selectedFloat, ...txnForm })}>
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}
