import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';

interface PDC {
  id: number; cheque_no: string; cheque_date: string; direction: string;
  party_name: string; amount: string; bank_name: string; status: string;
  notes: string;
}

export default function PDCsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useQuery({
    queryKey: ['pdcs', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/banking/pdcs/', { params: { company: companyId } })).data.results as PDC[],
  });
  const [viewing, setViewing] = useState<PDC | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Post-Dated Cheques" subtitle="Track PDCs issued and received." />
      <SimpleTable<PDC>
        rows={data} loading={isLoading} onRowClick={setViewing}
        columns={[
          { key: 'cheque_no', label: 'Cheque #', render: (r) => <span className="font-mono">{r.cheque_no}</span> },
          { key: 'cheque_date', label: 'Date' },
          { key: 'direction', label: 'Direction' },
          { key: 'party_name', label: 'Party' },
          { key: 'bank_name', label: 'Bank' },
          { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatINR(r.amount) },
          { key: 'status', label: 'Status' },
        ]}
      />
      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Cheque ${viewing.cheque_no}` : ''}
        subtitle={viewing?.party_name}
        sections={viewing ? [{
          title: 'Post-Dated Cheque',
          fields: [
            f('Cheque #', viewing.cheque_no, { mono: true }),
            f('Cheque Date', viewing.cheque_date),
            f('Direction', viewing.direction),
            f('Status', viewing.status),
            f('Party', viewing.party_name),
            f('Bank', viewing.bank_name),
            f('Amount', formatINR(viewing.amount)),
            f('Notes', viewing.notes, { fullWidth: true }),
          ],
        }] : []}
      />
    </div>
  );
}
