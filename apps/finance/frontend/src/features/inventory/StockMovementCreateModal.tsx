import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useItems } from '@/features/masters/api';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';

interface WH { id: number; code: string; name: string; }

const KINDS = [
  ['OPENING', 'Opening Balance'],
  ['PURCHASE', 'Purchase In'],
  ['SALE', 'Sale Out'],
  ['ADJUST', 'Adjustment'],
  ['SCRAP', 'Scrap Out'],
  ['RTN_IN', 'Sales Return In'],
  ['RTN_OUT', 'Purchase Return Out'],
] as const;

export default function StockMovementCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId } = useActiveCompany();
  const { data: items } = useItems(companyId);
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/inventory/warehouses/', { params: { company: companyId } })).data.results as WH[],
  });
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (payload: any) => (await api.post('/inventory/movements/record/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
    },
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    item: 0, warehouse: 0, kind: 'PURCHASE',
    quantity: '1', unit_cost: '0', reference: '', notes: '',
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!companyId || !form.item || !form.warehouse) { setErr('Item + warehouse required'); return; }
    // Negate quantity for outbound kinds (the backend just expects sign)
    const isOut = ['SALE', 'SCRAP', 'XFER_OUT', 'RTN_OUT'].includes(form.kind);
    const qty = isOut ? `-${form.quantity}` : form.quantity;
    try {
      await create.mutateAsync({ ...form, company: companyId, quantity: qty });
      toast.success('Stock movement recorded', `${form.kind} · qty ${qty}`);
      onClose();
    } catch (e: any) { setErr(JSON.stringify(e?.response?.data ?? 'Failed')); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Stock Movement" size="md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div><label className="label">Kind</label>
          <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div><label className="label">Item *</label>
          <select className="input" value={form.item || ''} onChange={(e) => setForm({ ...form, item: Number(e.target.value) })}>
            <option value="">— select —</option>
            {items?.map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
          </select></div>
        <div><label className="label">Warehouse *</label>
          <select className="input" value={form.warehouse || ''} onChange={(e) => setForm({ ...form, warehouse: Number(e.target.value) })}>
            <option value="">— select —</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select></div>
        <div><label className="label">Quantity (+)</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
        <div><label className="label">Unit Cost (₹)</label>
          <input className="input text-right tabular-nums" inputMode="decimal" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label">Reference</label>
          <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. PO-001, INV-001" /></div>
      </div>
      {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!form.item || !form.warehouse || create.isPending}>
          {create.isPending ? 'Saving…' : 'Record movement'}
        </button>
      </div>
    </Modal>
  );
}
