import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useItems } from '@/features/masters/api';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';

interface WH { id: number; code: string; name: string; }

export default function StockTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId } = useActiveCompany();
  const { data: items } = useItems(companyId);
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', companyId],
    enabled: companyId != null,
    queryFn: async () => (await api.get('/inventory/warehouses/', { params: { company: companyId } })).data.results as WH[],
  });
  const qc = useQueryClient();
  const transfer = useMutation({
    mutationFn: async (payload: any) => (await api.post('/inventory/movements/transfer/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['stock-summary'] });
    },
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    item: 0,
    from_warehouse: 0,
    to_warehouse: 0,
    quantity: '1',
    reference: '',
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!companyId || !form.item || !form.from_warehouse || !form.to_warehouse) {
      setErr('Item and both warehouses required');
      return;
    }
    if (form.from_warehouse === form.to_warehouse) {
      setErr('Source and destination must differ');
      return;
    }
    try {
      await transfer.mutateAsync({ company: companyId, ...form });
      toast.success('Stock transferred');
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Transfer failed');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Transfer stock" size="md">
      <div className="space-y-3">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <input type="date" className="input w-full" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <select className="input w-full" value={form.item}
          onChange={(e) => setForm({ ...form, item: Number(e.target.value) })}>
          <option value={0}>Item…</option>
          {(items ?? []).map((i) => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
        </select>
        <select className="input w-full" value={form.from_warehouse}
          onChange={(e) => setForm({ ...form, from_warehouse: Number(e.target.value) })}>
          <option value={0}>From warehouse…</option>
          {(warehouses ?? []).map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
        </select>
        <select className="input w-full" value={form.to_warehouse}
          onChange={(e) => setForm({ ...form, to_warehouse: Number(e.target.value) })}>
          <option value={0}>To warehouse…</option>
          {(warehouses ?? []).map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
        </select>
        <input className="input w-full" placeholder="Quantity" value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input className="input w-full" placeholder="Reference" value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <button className="btn-primary w-full" disabled={transfer.isPending} onClick={submit}>
          Transfer
        </button>
      </div>
    </Modal>
  );
}
