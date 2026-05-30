import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import FilterBar from '@/components/FilterBar';
import { confirm } from '@/components/ConfirmDialog';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';

interface CC { id: number; code: string; name: string; is_active: boolean; }

export default function CostCentersPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['cost-centers', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/masters/cost-centers/', { params: { company: companyId } })).data.results as CC[],
  });
  const [editing, setEditing] = useState<CC | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => (data ?? []).filter((c) =>
    search.trim() === '' || `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase())
  ), [data, search]);

  const del = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/masters/cost-centers/${id}/`)).data,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['cost-centers'] }); },
    onError: (e: any) => toast.error('Delete failed', JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Cost Centers" subtitle="Tag JE lines with cost centers to slice your P&L."
        action={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} className="mr-1" /> New Cost Center</button>}
      />
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search code or name…" count={filtered.length} />
      <SimpleTable<CC>
        rows={filtered} loading={isLoading}
        onRowClick={(r) => { setEditing(r); setOpen(true); }}
        emptyTitle="No cost centers yet"
        emptyActionLabel="Add your first" onEmptyAction={() => { setEditing(null); setOpen(true); }}
        columns={[
          { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: 'name', label: 'Name' },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? '✓' : '—' },
          { key: 'actions', label: '', render: (r) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button className="btn-ghost p-1 text-slate-500 hover:text-brand-600" onClick={() => { setEditing(r); setOpen(true); }}><Pencil size={14} /></button>
                <button className="btn-ghost p-1 text-slate-500 hover:text-red-600" onClick={() => confirm({ title: `Delete ${r.name}?`, danger: true, confirmLabel: 'Delete', onConfirm: () => del.mutateAsync(r.id) })}><Trash2 size={14} /></button>
              </div>
          )},
        ]}
      />
      <CostCenterForm open={open} onClose={() => setOpen(false)} initial={editing} companyId={companyId} onSaved={() => qc.invalidateQueries({ queryKey: ['cost-centers'] })} />
    </div>
  );
}

function CostCenterForm({ open, onClose, initial, companyId, onSaved }: { open: boolean; onClose: () => void; initial: CC | null; companyId?: number; onSaved: () => void }) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [err, setErr] = useState<string | null>(null);

  // Reset on open
  useMemo(() => {
    if (open) { setCode(initial?.code ?? ''); setName(initial?.name ?? ''); setActive(initial?.is_active ?? true); setErr(null); }
  }, [open, initial]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { company: companyId, code, name, is_active: active };
      if (initial) return (await api.patch(`/masters/cost-centers/${initial.id}/`, payload)).data;
      return (await api.post('/masters/cost-centers/', payload)).data;
    },
    onSuccess: () => { toast.success(initial ? 'Updated' : 'Created'); onSaved(); onClose(); },
    onError: (e: any) => setErr(JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit ${initial.code}` : 'New Cost Center'} size="sm">
      <div className="space-y-4">
        <div><label className="label">Code *</label>
          <input className="input font-mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
        <div><label className="label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => save.mutate()} disabled={!code || !name || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
