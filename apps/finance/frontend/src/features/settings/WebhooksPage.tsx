import { useState } from 'react';
import { Plus, Trash2, Webhook } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { confirm } from '@/components/ConfirmDialog';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

interface WH { id: number; name: string; url: string; events: string; is_active: boolean; secret: string; }

export default function WebhooksPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['webhooks', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/public/webhooks/', { params: { company: companyId } })).data.results as WH[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<WH | null>(null);

  const create = useMutation({
    mutationFn: async (payload: Partial<WH>) =>
      (await api.post('/public/webhooks/', { ...payload, company: companyId, is_active: true })).data,
    onSuccess: () => { toast.success('Webhook added'); qc.invalidateQueries({ queryKey: ['webhooks'] }); setOpen(false); },
    onError: (e: any) => toast.error('Failed', JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  const del = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/public/webhooks/${id}/`)).data,
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['webhooks'] }); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Webhooks" subtitle="Push events to your URL when things happen."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New Webhook</button>}
      />
      <PageHint storageKey="webhooks">
        We POST JSON payloads with an <code>X-FinSaptta-Signature</code> HMAC-SHA256 header (signed with your secret). 5 retry attempts with exponential backoff.
      </PageHint>
      <SimpleTable<WH>
        rows={data} loading={isLoading} onRowClick={setViewing}
        emptyIcon={Webhook}
        emptyTitle="No webhooks yet"
        emptyDescription="Add an endpoint to receive events: invoice.posted, receipt.posted, etc."
        emptyActionLabel="Add a webhook" onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'url', label: 'URL', render: (r) => <code className="text-xs">{r.url}</code> },
          { key: 'events', label: 'Events', render: (r) => <code className="text-xs">{r.events}</code> },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? '✓' : '—' },
          { key: 'actions', label: '', render: (r) => (
              <button className="btn-ghost p-1 text-slate-500 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); confirm({ title: `Delete "${r.name}"?`, danger: true, confirmLabel: 'Delete', onConfirm: () => del.mutateAsync(r.id) }); }}>
                <Trash2 size={14} />
              </button>
          )},
        ]}
      />
      <NewWebhookModal open={open} onClose={() => setOpen(false)} onSubmit={(p) => create.mutate(p)} busy={create.isPending} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        sections={viewing ? [{
          title: 'Webhook',
          fields: [
            f('Name', viewing.name),
            f('URL', <span className="break-all">{viewing.url}</span>, { fullWidth: true }),
            f('Events', viewing.events, { mono: true, fullWidth: true }),
            f('Signing Secret', <span className="break-all font-mono text-xs">{viewing.secret}</span>, { fullWidth: true }),
            f('Active', viewing.is_active ? 'Yes' : 'No'),
          ],
        }] : []}
      />
    </div>
  );
}

function NewWebhookModal({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (p: Partial<WH>) => void; busy: boolean }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('invoice.posted,receipt.posted');
  return (
    <Modal open={open} onClose={onClose} title="New Webhook" size="sm">
      <div className="space-y-3">
        <div><label className="label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">URL *</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.example/webhook" /></div>
        <div><label className="label">Events (comma-separated)</label>
          <input className="input" value={events} onChange={(e) => setEvents(e.target.value)} /></div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSubmit({ name, url, events })} disabled={!name || !url || busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
