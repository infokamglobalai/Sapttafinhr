import { useMemo, useState } from 'react';
import { ArrowRight, FileCheck2, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import FilterBar from '@/components/FilterBar';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import QuoteSOCreateModal from './QuoteSOCreateModal';

interface QuoteLine { id: number; description: string; quantity: string; unit_price: string; tax_rate: string; line_total: string; }
interface Quote {
  id: number; quote_no: string; date: string; valid_until: string | null;
  customer_name: string; notes: string; grand_total: string; status: string;
  lines: QuoteLine[];
}

export default function QuotationsPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['quotations', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/billing/quotations/', { params: { company: companyId, page_size: 200 } })).data.results as Quote[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Quote | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((r) =>
      (statusFilter === '' || r.status === statusFilter) &&
      (q === '' || `${r.quote_no} ${r.customer_name}`.toLowerCase().includes(q))
    );
  }, [data, search, statusFilter]);

  const convert = useMutation({
    mutationFn: async (id: number) => (await api.post(`/billing/quotations/${id}/convert/`, {})).data,
    onSuccess: (so: any) => {
      toast.success(`Converted to Sales Order ${so.so_no}`);
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['salesorders'] });
    },
    onError: (e: any) => toast.error('Convert failed', JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations" subtitle="Estimates you send to customers before they confirm an order."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New Quotation</button>}
      />
      <PageHint storageKey="quotations">
        Quotations don't post to the ledger. When a customer accepts, convert it to a Sales Order in one click.
      </PageHint>
      <FilterBar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Search quote # or customer…"
        filters={[
          { label: 'Status', value: statusFilter, onChange: setStatusFilter,
            options: [{ value: '', label: 'All' }, { value: 'DRAFT', label: 'Draft' },
                      { value: 'SENT', label: 'Sent' }, { value: 'ACCEPTED', label: 'Accepted' },
                      { value: 'REJECTED', label: 'Rejected' }, { value: 'EXPIRED', label: 'Expired' }] },
        ]}
        count={filtered.length}
      />
      <SimpleTable<Quote>
        rows={filtered} loading={isLoading} onRowClick={setViewing}
        emptyIcon={FileCheck2}
        emptyTitle={data && data.length > 0 ? 'No matches' : 'No quotations yet'}
        emptyDescription={data && data.length > 0 ? 'Try clearing filters.' : 'Quote a customer to start the sales cycle.'}
        emptyActionLabel={data && data.length > 0 ? undefined : 'Create your first quotation'}
        onEmptyAction={data && data.length > 0 ? undefined : () => setOpen(true)}
        columns={[
          { key: 'quote_no', label: 'Quote #', render: (r) => <span className="font-medium text-brand-600">{r.quote_no}</span> },
          { key: 'date', label: 'Date' },
          { key: 'customer_name', label: 'Customer' },
          { key: 'grand_total', label: 'Total', align: 'right', render: (r) => formatINR(r.grand_total) },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: '', render: (r) => (
              r.status !== 'ACCEPTED' && r.status !== 'REJECTED' ? (
                <button className="btn-ghost inline-flex items-center gap-1 text-xs text-brand-600 hover:bg-brand-50"
                  onClick={(e) => { e.stopPropagation(); convert.mutate(r.id); }}
                  disabled={convert.isPending}>
                  Convert to SO <ArrowRight size={12} />
                </button>
              ) : null
          )},
        ]}
      />
      <QuoteSOCreateModal open={open} onClose={() => setOpen(false)} kind="quotation" />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Quotation ${viewing.quote_no}` : ''}
        subtitle={viewing ? `${viewing.customer_name} · ${viewing.status}` : ''}
        size="xl"
        sections={viewing ? [{
          title: 'Header',
          fields: [
            f('Quote #', viewing.quote_no, { mono: true }),
            f('Date', viewing.date),
            f('Valid Until', viewing.valid_until),
            f('Customer', viewing.customer_name),
            f('Status', viewing.status),
            f('Grand Total', formatINR(viewing.grand_total)),
            f('Notes', viewing.notes, { fullWidth: true }),
          ],
        }] : []}
        nestedTables={viewing ? [{
          title: 'Line items',
          rows: viewing.lines,
          columns: [
            { key: 'description', label: 'Description' },
            { key: 'quantity', label: 'Qty', align: 'right' },
            { key: 'unit_price', label: 'Rate', align: 'right', render: (r: QuoteLine) => formatINR(r.unit_price) },
            { key: 'tax_rate', label: 'GST%', align: 'right' },
            { key: 'line_total', label: 'Total', align: 'right', render: (r: QuoteLine) => formatINR(r.line_total) },
          ],
        }] : []}
      />
    </div>
  );
}
