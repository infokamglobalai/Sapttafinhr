import { useMemo, useState } from 'react';
import { ArrowRight, Plus, ShoppingCart } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import FilterBar from '@/components/FilterBar';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import QuoteSOCreateModal from './QuoteSOCreateModal';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

interface SOLine { id: number; description: string; quantity: string; unit_price: string; tax_rate: string; line_total: string; }
interface SO {
  id: number; so_no: string; date: string; customer_name: string;
  place_of_supply: string; notes: string; grand_total: string; status: string;
  lines: SOLine[];
}

export default function SalesOrdersPage() {
  const { companyId, fyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['salesorders', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/billing/sales-orders/', { params: { company: companyId, page_size: 200 } })).data.results as SO[],
  });
  const [open, setOpen] = useState(false);
  const [convertSO, setConvertSO] = useState<SO | null>(null);
  const [viewing, setViewing] = useState<SO | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((r) =>
      (statusFilter === '' || r.status === statusFilter) &&
      (q === '' || `${r.so_no} ${r.customer_name}`.toLowerCase().includes(q))
    );
  }, [data, search, statusFilter]);

  const convert = useMutation({
    mutationFn: async (payload: { id: number; invoice_no: string; date: string; due_date?: string }) =>
      (await api.post(`/billing/sales-orders/${payload.id}/convert/`, {
        invoice_no: payload.invoice_no, fiscal_year: fyId, date: payload.date, due_date: payload.due_date,
      })).data,
    onSuccess: (inv: any) => {
      toast.success(`Converted to Invoice ${inv.invoice_no}`, `Total ${formatINR(inv.grand_total)}`);
      qc.invalidateQueries({ queryKey: ['salesorders'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setConvertSO(null);
    },
    onError: (e: any) => toast.error('Convert failed', JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Orders" subtitle="Confirmed customer orders waiting to be invoiced."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New Sales Order</button>}
      />
      <PageHint storageKey="sales-orders">
        A Sales Order locks in pricing. When you deliver / complete the work, convert it to a Tax Invoice in one click.
      </PageHint>
      <FilterBar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Search SO # or customer…"
        filters={[
          { label: 'Status', value: statusFilter, onChange: setStatusFilter,
            options: [{ value: '', label: 'All' }, { value: 'DRAFT', label: 'Draft' },
                      { value: 'CONFIRMED', label: 'Confirmed' }, { value: 'DELIVERED', label: 'Delivered' },
                      { value: 'INVOICED', label: 'Invoiced' }, { value: 'CANCELLED', label: 'Cancelled' }] },
        ]}
        count={filtered.length}
      />
      <SimpleTable<SO>
        rows={filtered} loading={isLoading} onRowClick={setViewing}
        emptyIcon={ShoppingCart}
        emptyTitle={data && data.length > 0 ? 'No matches' : 'No sales orders yet'}
        emptyDescription={data && data.length > 0 ? 'Try clearing filters.' : 'Useful when delivery and invoicing happen later than the order.'}
        emptyActionLabel={data && data.length > 0 ? undefined : 'Create a sales order'}
        onEmptyAction={data && data.length > 0 ? undefined : () => setOpen(true)}
        columns={[
          { key: 'so_no', label: 'SO #', render: (r) => <span className="font-medium text-brand-600">{r.so_no}</span> },
          { key: 'date', label: 'Date' },
          { key: 'customer_name', label: 'Customer' },
          { key: 'grand_total', label: 'Total', align: 'right', render: (r) => formatINR(r.grand_total) },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: '', render: (r) => (
              r.status !== 'INVOICED' && r.status !== 'CANCELLED' ? (
                <button className="btn-ghost inline-flex items-center gap-1 text-xs text-brand-600 hover:bg-brand-50"
                  onClick={(e) => { e.stopPropagation(); setConvertSO(r); }}>
                  Convert to Invoice <ArrowRight size={12} />
                </button>
              ) : null
          )},
        ]}
      />
      <QuoteSOCreateModal open={open} onClose={() => setOpen(false)} kind="so" />

      <ConvertSOModal so={convertSO} onClose={() => setConvertSO(null)} onSubmit={(payload) => convert.mutate(payload)} busy={convert.isPending} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Sales Order ${viewing.so_no}` : ''}
        subtitle={viewing ? `${viewing.customer_name} · ${viewing.status}` : ''}
        size="xl"
        sections={viewing ? [{
          title: 'Header',
          fields: [
            f('SO #', viewing.so_no, { mono: true }),
            f('Date', viewing.date),
            f('Customer', viewing.customer_name),
            f('Place of Supply', viewing.place_of_supply),
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
            { key: 'unit_price', label: 'Rate', align: 'right', render: (r: SOLine) => formatINR(r.unit_price) },
            { key: 'tax_rate', label: 'GST%', align: 'right' },
            { key: 'line_total', label: 'Total', align: 'right', render: (r: SOLine) => formatINR(r.line_total) },
          ],
        }] : []}
      />
    </div>
  );
}

function ConvertSOModal({ so, onClose, onSubmit, busy }: {
  so: SO | null; onClose: () => void;
  onSubmit: (p: { id: number; invoice_no: string; date: string; due_date?: string }) => void;
  busy: boolean;
}) {
  const [invoiceNo, setInvoiceNo] = useState('INV-' + Date.now().toString().slice(-6));
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  return (
    <Modal open={!!so} onClose={onClose} title={so ? `Convert SO ${so.so_no} to Invoice` : ''} size="sm">
      {so && (
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            Creates a Tax Invoice with the SO line items. GST will auto-split by place of supply.
          </div>
          <div><label className="label">Invoice #</label>
            <input className="input font-mono" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Due Date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!invoiceNo || busy}
              onClick={() => onSubmit({ id: so.id, invoice_no: invoiceNo, date, due_date: dueDate || undefined })}>
              {busy ? 'Converting…' : 'Create Invoice'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
