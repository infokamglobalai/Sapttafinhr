import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

interface Row { model: string; object_id: number; action: string; user: string; date: string; }

export default function AuditLogPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/reports/audit-log/', { params: { company: companyId } })).data,
  });

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data?.rows?.length) return null;
    const actionLabel = (a: string) => a === '+' ? 'Created' : a === '-' ? 'Deleted' : 'Updated';
    return {
      title: 'Audit Log',
      columns: [
        { header: 'When', key: 'date' },
        { header: 'Model', key: 'model' },
        { header: 'ID', key: 'object_id' },
        { header: 'Action', key: 'action' },
        { header: 'User', key: 'user' },
      ],
      rows: data.rows.map((r: Row) => ({
        date: new Date(r.date).toLocaleString('en-IN'),
        model: r.model,
        object_id: String(r.object_id),
        action: actionLabel(r.action),
        user: r.user,
      })),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="Every edit on financial records, tracked." action={<DownloadMenu opts={dlOpts} />} />
      <SimpleTable<Row>
        rows={data?.rows} loading={isLoading} keyField={'date' as keyof Row}
        emptyTitle="No history yet"
        columns={[
          { key: 'date', label: 'When', render: (r) => new Date(r.date).toLocaleString('en-IN') },
          { key: 'model', label: 'Model' },
          { key: 'object_id', label: 'ID', render: (r) => <span className="font-mono text-xs">{r.object_id}</span> },
          { key: 'action', label: 'Action', render: (r) => <span className={`rounded px-2 py-0.5 text-xs ${r.action === '+' ? 'bg-emerald-100 text-emerald-700' : r.action === '-' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{r.action === '+' ? 'Created' : r.action === '-' ? 'Deleted' : 'Updated'}</span> },
          { key: 'user', label: 'User' },
        ]}
      />
    </div>
  );
}
