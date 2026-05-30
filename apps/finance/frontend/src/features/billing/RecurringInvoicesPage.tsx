import { useState } from 'react';
import { Plus, Repeat } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useParties, useItems } from '@/features/masters/api';
import { api } from '@/lib/api';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

interface RT {
  id: number; name: string; customer: number; customer_name: string;
  frequency: string; next_run_date: string; end_date: string | null;
  is_active: boolean; runs_completed: number; template_json: any;
}

const FREQUENCY = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

export default function RecurringInvoicesPage() {
  const { companyId, fyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['recurring', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/billing/recurring-invoices/', { params: { company: companyId } })).data.results as RT[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<RT | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Recurring Invoices" subtitle="Auto-generate invoices on a schedule."
        action={<button className="btn-primary" onClick={() => setOpen(true)} disabled={!fyId}>
          <Plus size={16} className="mr-1" /> New Recurring Template
        </button>}
      />
      <PageHint storageKey="recurring">
        A background worker checks templates daily and posts a new invoice when the next-run date is due.
      </PageHint>
      <SimpleTable<RT>
        rows={data} loading={isLoading} onRowClick={setViewing}
        emptyIcon={Repeat}
        emptyTitle="No recurring templates yet"
        emptyDescription="Set one up to auto-bill customers monthly, quarterly, etc."
        emptyActionLabel="Create a template"
        onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'customer_name', label: 'Customer' },
          { key: 'frequency', label: 'Frequency' },
          { key: 'next_run_date', label: 'Next Run' },
          { key: 'end_date', label: 'Ends', render: (r) => r.end_date ?? '—' },
          { key: 'runs_completed', label: 'Runs', align: 'right' },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? '✓' : '—' },
        ]}
      />
      <CreateRecurringModal open={open} onClose={() => setOpen(false)} companyId={companyId} fyId={fyId} onCreated={() => qc.invalidateQueries({ queryKey: ['recurring'] })} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle={viewing ? `${viewing.customer_name} · ${viewing.frequency}` : ''}
        sections={viewing ? [{
          title: 'Recurring Template',
          fields: [
            f('Name', viewing.name),
            f('Customer', viewing.customer_name),
            f('Frequency', viewing.frequency),
            f('Next Run', viewing.next_run_date),
            f('End Date', viewing.end_date),
            f('Runs Completed', viewing.runs_completed),
            f('Active', viewing.is_active ? 'Yes' : 'No'),
            f('Template (JSON)', <pre className="rounded bg-slate-50 p-2 text-[10px]">{JSON.stringify(viewing.template_json, null, 2)}</pre>, { fullWidth: true }),
          ],
        }] : []}
      />
    </div>
  );
}

function CreateRecurringModal({ open, onClose, companyId, fyId, onCreated }: { open: boolean; onClose: () => void; companyId?: number; fyId?: number; onCreated: () => void }) {
  const { data: customers } = useParties(companyId, 'CUSTOMER');
  const { data: items } = useItems(companyId);
  const [name, setName] = useState('Monthly retainer');
  const [customer, setCustomer] = useState<number | undefined>();
  const [placeOfSupply, setPlaceOfSupply] = useState('27');
  const [frequency, setFrequency] = useState<typeof FREQUENCY[number]>('MONTHLY');
  const [nextRun, setNextRun] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [itemId, setItemId] = useState<number | undefined>();
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('0');
  const [taxRate, setTaxRate] = useState('18');
  const [dueDays, setDueDays] = useState('30');
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/billing/recurring-invoices/', payload)).data,
    onSuccess: () => { toast.success('Recurring template created'); onCreated(); onClose(); },
    onError: (e: any) => setErr(JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  const pickItem = (id: number) => {
    const it = items?.find((i) => i.id === id);
    if (!it) return;
    setItemId(id);
    setPrice(it.sale_price);
    setTaxRate(it.effective_tax_rate || it.tax_rate);
  };

  const submit = () => {
    if (!companyId || !fyId || !customer) return;
    create.mutate({
      company: companyId, fiscal_year: fyId, name, customer,
      place_of_supply: placeOfSupply, frequency, next_run_date: nextRun,
      end_date: endDate || null, is_active: true,
      template_json: {
        due_days: Number(dueDays),
        lines: [{
          item: itemId ?? null,
          description: items?.find((i) => i.id === itemId)?.name ?? name,
          hsn_code: items?.find((i) => i.id === itemId)?.hsn_code ?? '',
          quantity: qty, unit_price: price,
          discount_percent: '0', tax_rate: taxRate,
        }],
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New Recurring Template" size="md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Customer *</label>
          <select className="input" value={customer ?? ''} onChange={(e) => setCustomer(Number(e.target.value) || undefined)}>
            <option value="">— select —</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="label">Place of Supply (state)</label>
          <input className="input" maxLength={2} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} /></div>
        <div><label className="label">Frequency</label>
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
            {FREQUENCY.map((f) => <option key={f} value={f}>{f}</option>)}
          </select></div>
        <div><label className="label">Next Run Date *</label>
          <input className="input" type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} /></div>
        <div><label className="label">End Date</label>
          <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <div><label className="label">Due days from invoice</label>
          <input className="input" inputMode="numeric" value={dueDays} onChange={(e) => setDueDays(e.target.value)} /></div>
        <div className="md:col-span-2 mt-2 border-t border-slate-200 pt-3">
          <div className="text-sm font-semibold">Line item (template)</div>
        </div>
        <div><label className="label">Item</label>
          <select className="input" value={itemId ?? ''} onChange={(e) => pickItem(Number(e.target.value))}>
            <option value="">— select —</option>
            {items?.map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
          </select></div>
        <div><label className="label">Qty</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        <div><label className="label">Unit Price</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div><label className="label">GST %</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
      </div>
      {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!customer || create.isPending} onClick={submit}>
          {create.isPending ? 'Saving…' : 'Create template'}
        </button>
      </div>
    </Modal>
  );
}
