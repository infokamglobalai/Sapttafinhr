import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
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

interface Key { id: number; name: string; key: string; is_active: boolean; last_used_at: string | null; scopes: string; created_at?: string; }

export default function APIKeysPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['api-keys', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/public/api-keys/', { params: { company: companyId } })).data.results as Key[],
  });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Key | null>(null);

  const create = useMutation({
    mutationFn: async (payload: { name: string; scopes: string }) =>
      (await api.post('/public/api-keys/', { ...payload, company: companyId, is_active: true })).data,
    onSuccess: (k: Key) => {
      toast.success('API key created', 'Copy it now — full key shown only once.');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setOpen(false);
      navigator.clipboard?.writeText(k.key).catch(() => {});
    },
    onError: (e: any) => toast.error('Create failed', JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  const del = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/public/api-keys/${id}/`)).data,
    onSuccess: () => { toast.success('Revoked'); qc.invalidateQueries({ queryKey: ['api-keys'] }); },
  });

  const copy = (v: string) => { navigator.clipboard?.writeText(v).then(() => toast.success('Copied')).catch(() => {}); };

  return (
    <div className="space-y-6">
      <PageHeader title="API Keys" subtitle="Programmatic access to your data."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> New API Key</button>}
      />
      <PageHint storageKey="api-keys">
        Use with header <code>Authorization: ApiKey &lt;key&gt;</code>. Treat keys like passwords — store in a secrets manager, never commit to git.
      </PageHint>
      <SimpleTable<Key>
        rows={data} loading={isLoading} onRowClick={setViewing}
        emptyTitle="No API keys yet"
        emptyActionLabel="Create one" onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'key', label: 'Key', render: (r) => (
              <div className="flex items-center gap-1">
                <code className="font-mono text-xs">{r.key.slice(0, 8)}…{r.key.slice(-4)}</code>
                <button className="btn-ghost p-0.5 text-slate-400 hover:text-slate-700"
                  onClick={(e) => { e.stopPropagation(); copy(r.key); }} title="Copy"><Copy size={12} /></button>
              </div>
          )},
          { key: 'scopes', label: 'Scopes', render: (r) => <code className="text-xs">{r.scopes}</code> },
          { key: 'last_used_at', label: 'Last used', render: (r) => r.last_used_at ? new Date(r.last_used_at).toLocaleString('en-IN') : '—' },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? '✓' : '—' },
          { key: 'actions', label: '', render: (r) => (
              <button className="btn-ghost p-1 text-slate-500 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); confirm({ title: `Revoke "${r.name}"?`, message: 'Any service using this key will lose access immediately.', danger: true, confirmLabel: 'Revoke', onConfirm: () => del.mutateAsync(r.id) }); }}>
                <Trash2 size={14} />
              </button>
          )},
        ]}
      />
      <NewKeyModal open={open} onClose={() => setOpen(false)} onSubmit={(p) => create.mutate(p)} busy={create.isPending} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        sections={viewing ? [{
          title: 'API Key',
          fields: [
            f('Name', viewing.name),
            f('Full Key', <span className="break-all font-mono text-xs">{viewing.key}</span>, { fullWidth: true }),
            f('Scopes', viewing.scopes, { mono: true }),
            f('Active', viewing.is_active ? 'Yes' : 'No'),
            f('Last Used', viewing.last_used_at ? new Date(viewing.last_used_at).toLocaleString('en-IN') : 'Never'),
            f('Created', viewing.created_at ? new Date(viewing.created_at).toLocaleString('en-IN') : null),
          ],
        }] : []}
      />
    </div>
  );
}

function NewKeyModal({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (p: { name: string; scopes: string }) => void; busy: boolean }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('read');
  return (
    <Modal open={open} onClose={onClose} title="New API Key" size="sm">
      <div className="space-y-3">
        <div><label className="label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier integration" /></div>
        <div><label className="label">Scopes</label>
          <select className="input" value={scopes} onChange={(e) => setScopes(e.target.value)}>
            <option value="read">Read only</option>
            <option value="read,write">Read + Write</option>
          </select></div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSubmit({ name, scopes })} disabled={!name || busy}>
            {busy ? 'Creating…' : 'Create key'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
