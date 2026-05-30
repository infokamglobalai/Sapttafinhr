import { useState } from 'react';
import { Check, Plus, Send, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import ClaimCreateModal from './ClaimCreateModal';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

interface ClaimLine { id: number; date: string; description: string; amount: string; expense_account: number; }
interface Claim {
  id: number; claim_no: string; date: string; employee_email: string;
  description: string; total: string; status: string;
  approved_at: string | null; rejection_reason: string;
  journal_entry: number | null;
  lines: ClaimLine[];
}

export default function ClaimsPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['claims', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/expenses/claims/', { params: { company: companyId } })).data.results as Claim[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Claim | null>(null);

  const action = useMutation({
    mutationFn: async ({ id, kind }: { id: number; kind: 'submit' | 'approve' | 'reject' }) => {
      const r = await api.post(`/expenses/claims/${id}/${kind}/`, kind === 'reject' ? { reason: 'rejected' } : {});
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Claims" subtitle="Employee expense reimbursement requests."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New claim</button>}
      />
      <SimpleTable<Claim>
        rows={data} loading={isLoading} onRowClick={setViewing}
        columns={[
          { key: 'claim_no', label: 'Claim #', render: (r) => <span className="font-medium text-brand-600">{r.claim_no}</span> },
          { key: 'date', label: 'Date' },
          { key: 'employee_email', label: 'Employee' },
          { key: 'description', label: 'Description' },
          { key: 'total', label: 'Total', align: 'right', render: (r) => formatINR(r.total) },
          {
            key: 'status', label: 'Status', render: (r) => (
              <span className={`rounded px-2 py-0.5 text-xs ${
                r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700'
                  : r.status === 'REJECTED' ? 'bg-red-100 text-red-700'
                  : r.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>{r.status}</span>
            )
          },
          {
            key: 'actions', label: 'Actions', render: (r) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {r.status === 'DRAFT' && (
                  <button className="btn-ghost p-1 text-xs" title="Submit"
                    onClick={() => action.mutate({ id: r.id, kind: 'submit' })}>
                    <Send size={12} />
                  </button>
                )}
                {(r.status === 'SUBMITTED' || r.status === 'DRAFT') && (
                  <>
                    <button className="btn-ghost p-1 text-xs text-emerald-700" title="Approve"
                      onClick={() => action.mutate({ id: r.id, kind: 'approve' })}>
                      <Check size={12} />
                    </button>
                    <button className="btn-ghost p-1 text-xs text-red-700" title="Reject"
                      onClick={() => action.mutate({ id: r.id, kind: 'reject' })}>
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
            )
          },
        ]}
      />
      <ClaimCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Claim ${viewing.claim_no}` : ''}
        subtitle={viewing?.employee_email}
        sections={viewing ? [{
          title: 'Claim',
          fields: [
            f('Claim #', viewing.claim_no, { mono: true }),
            f('Date', viewing.date),
            f('Employee', viewing.employee_email),
            f('Status', viewing.status),
            f('Total', formatINR(viewing.total)),
            f('Approved At', viewing.approved_at),
            f('Journal Entry', viewing.journal_entry ? `#${viewing.journal_entry}` : null),
            f('Description', viewing.description, { fullWidth: true }),
            f('Rejection Reason', viewing.rejection_reason, { fullWidth: true }),
          ],
        }] : []}
        nestedTables={viewing ? [{
          title: 'Expense lines',
          rows: viewing.lines ?? [],
          columns: [
            { key: 'date', label: 'Date' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount', align: 'right', render: (r: ClaimLine) => formatINR(r.amount) },
          ],
        }] : []}
      />
    </div>
  );
}
