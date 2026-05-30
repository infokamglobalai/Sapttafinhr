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
import { useParties } from '@/features/masters/api';
import { api } from '@/lib/api';

interface Proj { id: number; code: string; name: string; customer: number | null; start_date: string | null; end_date: string | null; is_active: boolean; }

export default function ProjectsPage() {
  const { companyId } = useActiveCompany();
  const { data: customers } = useParties(companyId, 'CUSTOMER');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['projects', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/masters/projects/', { params: { company: companyId } })).data.results as Proj[],
  });
  const [editing, setEditing] = useState<Proj | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => (data ?? []).filter((p) =>
    search.trim() === '' || `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase())
  ), [data, search]);

  const del = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/masters/projects/${id}/`)).data,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['projects'] }); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" subtitle="Group expenses and revenue by project."
        action={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} className="mr-1" /> New Project</button>}
      />
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search code or name…" count={filtered.length} />
      <SimpleTable<Proj>
        rows={filtered} loading={isLoading}
        onRowClick={(r) => { setEditing(r); setOpen(true); }}
        emptyTitle="No projects yet"
        emptyActionLabel="Add your first" onEmptyAction={() => { setEditing(null); setOpen(true); }}
        columns={[
          { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: 'name', label: 'Name' },
          { key: 'customer', label: 'Customer', render: (r) => customers?.find((c) => c.id === r.customer)?.name ?? '—' },
          { key: 'start_date', label: 'Start', render: (r) => r.start_date ?? '—' },
          { key: 'end_date', label: 'End', render: (r) => r.end_date ?? '—' },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? '✓' : '—' },
          { key: 'actions', label: '', render: (r) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button className="btn-ghost p-1 text-slate-500 hover:text-brand-600" onClick={() => { setEditing(r); setOpen(true); }}><Pencil size={14} /></button>
                <button className="btn-ghost p-1 text-slate-500 hover:text-red-600" onClick={() => confirm({ title: `Delete ${r.name}?`, danger: true, confirmLabel: 'Delete', onConfirm: () => del.mutateAsync(r.id) })}><Trash2 size={14} /></button>
              </div>
          )},
        ]}
      />
      <ProjForm open={open} onClose={() => setOpen(false)} initial={editing} companyId={companyId} customers={customers ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ['projects'] })} />
    </div>
  );
}

function ProjForm({ open, onClose, initial, companyId, customers, onSaved }: { open: boolean; onClose: () => void; initial: Proj | null; companyId?: number; customers: any[]; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Proj>>({});
  const [err, setErr] = useState<string | null>(null);

  useMemo(() => {
    if (open) {
      setForm(initial ? { ...initial } : { code: '', name: '', is_active: true });
      setErr(null);
    }
  }, [open, initial]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, company: companyId };
      if (initial) return (await api.patch(`/masters/projects/${initial.id}/`, payload)).data;
      return (await api.post('/masters/projects/', payload)).data;
    },
    onSuccess: () => { toast.success(initial ? 'Updated' : 'Created'); onSaved(); onClose(); },
    onError: (e: any) => setErr(JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit ${initial.code}` : 'New Project'} size="sm">
      <div className="space-y-4">
        <div><label className="label">Code *</label>
          <input className="input font-mono" value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
        <div><label className="label">Name *</label>
          <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Customer</label>
          <select className="input" value={form.customer ?? ''} onChange={(e) => setForm({ ...form, customer: Number(e.target.value) || null })}>
            <option value="">— none —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Start</label>
            <input className="input" type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} /></div>
          <div><label className="label">End</label>
            <input className="input" type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
        </label>
        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => save.mutate()} disabled={!form.code || !form.name || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
