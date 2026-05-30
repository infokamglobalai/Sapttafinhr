import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';

export default function WarehouseCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/inventory/warehouses/', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  });
  const [form, setForm] = useState({ code: 'WH-MAIN', name: 'Main Warehouse', address: '', is_default: true, is_active: true });
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!companyId) return;
    try {
      await create.mutateAsync({ ...form, company: companyId });
      toast.success(`Warehouse ${form.code} added`);
      onClose();
    } catch (e: any) { setErr(JSON.stringify(e?.response?.data ?? 'Failed')); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Warehouse" size="md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label className="label">Code *</label>
          <input className="input font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
        <div><label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Default
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
        </div>
      </div>
      {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!form.code || !form.name || create.isPending}>
          {create.isPending ? 'Saving…' : 'Save warehouse'}
        </button>
      </div>
    </Modal>
  );
}
