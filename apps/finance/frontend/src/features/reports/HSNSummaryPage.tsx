import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';

interface Row { hsn: string; rate: string; qty: string; taxable: string; cgst: string; sgst: string; igst: string; }

function fyDefaults() {
  const today = new Date();
  const fyStart = new Date(today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1, 3, 1);
  return { start: fyStart.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
}

export default function HSNSummaryPage() {
  const { companyId } = useActiveCompany();
  const def = useMemo(fyDefaults, []);
  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const { data, isLoading } = useQuery({
    queryKey: ['hsn-summary', companyId, start, end], enabled: companyId != null,
    queryFn: async () => (await api.get('/taxation/hsn-summary/', { params: { company: companyId, start, end } })).data,
  });

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data?.rows?.length) return null;
    return {
      title: `HSN Summary (${start} to ${end})`,
      columns: [
        { header: 'HSN/SAC', key: 'hsn' },
        { header: 'Rate %', key: 'rate', align: 'right' },
        { header: 'Qty', key: 'qty', align: 'right' },
        { header: 'Taxable', key: 'taxable', align: 'right' },
        { header: 'CGST', key: 'cgst', align: 'right' },
        { header: 'SGST', key: 'sgst', align: 'right' },
        { header: 'IGST', key: 'igst', align: 'right' },
      ],
      rows: data.rows.map((r: Row) => ({
        hsn: r.hsn,
        rate: r.rate,
        qty: r.qty,
        taxable: formatINR(r.taxable),
        cgst: Number(r.cgst) ? formatINR(r.cgst) : '',
        sgst: Number(r.sgst) ? formatINR(r.sgst) : '',
        igst: Number(r.igst) ? formatINR(r.igst) : '',
      })),
    };
  }, [data, start, end]);

  return (
    <div className="space-y-6">
      <PageHeader title="HSN-wise Summary" subtitle="Outward supplies grouped by HSN — required by GSTR-1." action={<DownloadMenu opts={dlOpts} />} />
      <PageHint storageKey="hsn-summary">
        GSTR-1 requires this summary for all sales by HSN code + tax rate.
      </PageHint>
      <div className="flex gap-4">
        <div><label className="label">From</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      <SimpleTable<Row>
        rows={data?.rows} loading={isLoading} keyField={'hsn' as keyof Row}
        emptyTitle="No data in this period"
        columns={[
          { key: 'hsn', label: 'HSN/SAC', render: (r) => <span className="font-mono">{r.hsn}</span> },
          { key: 'rate', label: 'Rate %', align: 'right' },
          { key: 'qty', label: 'Qty', align: 'right' },
          { key: 'taxable', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable) },
          { key: 'cgst', label: 'CGST', align: 'right', render: (r) => Number(r.cgst) ? formatINR(r.cgst) : '—' },
          { key: 'sgst', label: 'SGST', align: 'right', render: (r) => Number(r.sgst) ? formatINR(r.sgst) : '—' },
          { key: 'igst', label: 'IGST', align: 'right', render: (r) => Number(r.igst) ? formatINR(r.igst) : '—' },
        ]}
      />
    </div>
  );
}
