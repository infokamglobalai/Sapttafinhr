import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import BankAccountCreateModal from './BankAccountCreateModal';

interface BA {
  id: number; name: string; bank_name: string; account_number: string; ifsc: string;
  branch: string; currency: string; is_active: boolean;
  ledger_account_code: string; opening_balance: string;
}

export default function BankAccountsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/banking/bank-accounts/', { params: { company: companyId } })).data.results as BA[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<BA | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Bank Accounts" subtitle="Real-world bank accounts linked to GL."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New bank account</button>}
      />
      <SimpleTable<BA>
        rows={data} loading={isLoading} onRowClick={setViewing}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'bank_name', label: 'Bank' },
          { key: 'account_number', label: 'A/C #', render: (r) => <span className="font-mono text-xs">{r.account_number}</span> },
          { key: 'ifsc', label: 'IFSC', render: (r) => <span className="font-mono text-xs">{r.ifsc || '—'}</span> },
          { key: 'ledger_account_code', label: 'GL Account' },
          { key: 'currency', label: 'Currency' },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? '✓' : '—' },
        ]}
      />
      <BankAccountCreateModal open={open} onClose={() => setOpen(false)} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''} subtitle={viewing?.bank_name}
        sections={viewing ? [{
          title: 'Bank Account',
          fields: [
            f('Name', viewing.name), f('Bank Name', viewing.bank_name),
            f('A/C Number', viewing.account_number, { mono: true }),
            f('IFSC', viewing.ifsc, { mono: true }),
            f('Branch', viewing.branch),
            f('Currency', viewing.currency),
            f('GL Account', viewing.ledger_account_code, { mono: true }),
            f('Opening Balance', formatINR(viewing.opening_balance)),
            f('Active', viewing.is_active ? 'Yes' : 'No'),
          ],
        }] : []}
      />
    </div>
  );
}
