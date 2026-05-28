import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

interface Row { account_code: string; account_name: string; period_start: string; period_end: string; budget: string; actual: string; variance: string; variance_pct: number; }

export default function BudgetVsActualPage() {
  const { companyId, fyId } = useActiveCompany();
  const { data, isLoading } = useQuery({
    queryKey: ['budget-vs-actual', companyId, fyId], enabled: companyId != null && fyId != null,
    queryFn: async () => (await api.get('/reports/budget-vs-actual/', { params: { company: companyId, fiscal_year: fyId } })).data,
  });

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data?.rows?.length) return null;
    return {
      title: 'Budget vs Actual',
      columns: [
        { header: 'Code', key: 'account_code' },
        { header: 'Account', key: 'account_name' },
        { header: 'From', key: 'period_start' },
        { header: 'To', key: 'period_end' },
        { header: 'Budget', key: 'budget', align: 'right' },
        { header: 'Actual', key: 'actual', align: 'right' },
        { header: 'Variance', key: 'variance', align: 'right' },
        { header: '% Used', key: 'variance_pct', align: 'right' },
      ],
      rows: data.rows.map((r: Row) => ({
        account_code: r.account_code,
        account_name: r.account_name,
        period_start: r.period_start,
        period_end: r.period_end,
        budget: formatINR(r.budget),
        actual: formatINR(r.actual),
        variance: formatINR(r.variance),
        variance_pct: `${r.variance_pct.toFixed(1)}%`,
      })),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Budget vs Actual" subtitle="How spending tracks against budgets for the active fiscal year." action={<DownloadMenu opts={dlOpts} />} />
      <SimpleTable<Row>
        rows={data?.rows} loading={isLoading} keyField={'account_code' as keyof Row}
        emptyTitle="No budgets set up"
        emptyDescription="Create budgets in the Django admin under Expenses › Budgets to see this report."
        columns={[
          { key: 'account_code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.account_code}</span> },
          { key: 'account_name', label: 'Account' },
          { key: 'period_start', label: 'From' },
          { key: 'period_end', label: 'To' },
          { key: 'budget', label: 'Budget', align: 'right', render: (r) => formatINR(r.budget) },
          { key: 'actual', label: 'Actual', align: 'right', render: (r) => formatINR(r.actual) },
          { key: 'variance', label: 'Variance', align: 'right', render: (r) => (
              <span className={Number(r.variance) < 0 ? 'text-red-600' : 'text-emerald-700'}>{formatINR(r.variance)}</span>
          )},
          { key: 'variance_pct', label: '% Used', align: 'right', render: (r) => `${r.variance_pct.toFixed(1)}%` },
        ]}
      />
    </div>
  );
}
