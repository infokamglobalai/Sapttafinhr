import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

interface Row { voucher_no: string; account: string; narration: string; debit: string; credit: string; }

export default function DayBookPage() {
  const { companyId } = useActiveCompany();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useQuery({
    queryKey: ['day-book', companyId, date], enabled: companyId != null,
    queryFn: async () => (await api.get('/reports/day-book/', { params: { company: companyId, date } })).data,
  });

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data?.rows?.length) return null;
    return {
      title: `Day Book (${date})`,
      columns: [
        { header: 'Voucher #', key: 'voucher_no' },
        { header: 'Account', key: 'account' },
        { header: 'Narration', key: 'narration' },
        { header: 'Debit', key: 'debit', align: 'right' },
        { header: 'Credit', key: 'credit', align: 'right' },
      ],
      rows: data.rows.map((r: Row) => ({
        voucher_no: r.voucher_no,
        account: r.account,
        narration: r.narration,
        debit: Number(r.debit) ? formatINR(r.debit) : '',
        credit: Number(r.credit) ? formatINR(r.credit) : '',
      })),
    };
  }, [data, date]);

  return (
    <div className="space-y-6">
      <PageHeader title="Day Book" subtitle="All journal entries for a single day." action={<DownloadMenu opts={dlOpts} />} />
      <div><label className="label">Date</label><input className="input w-fit" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <SimpleTable<Row>
        rows={data?.rows} loading={isLoading} keyField={'voucher_no' as keyof Row}
        columns={[
          { key: 'voucher_no', label: 'Voucher #', render: (r) => <span className="font-mono text-xs">{r.voucher_no}</span> },
          { key: 'account', label: 'Account' },
          { key: 'narration', label: 'Narration', className: 'text-xs text-slate-500' },
          { key: 'debit', label: 'Debit', align: 'right', render: (r) => Number(r.debit) ? formatINR(r.debit) : '—' },
          { key: 'credit', label: 'Credit', align: 'right', render: (r) => Number(r.credit) ? formatINR(r.credit) : '—' },
        ]}
      />
    </div>
  );
}
