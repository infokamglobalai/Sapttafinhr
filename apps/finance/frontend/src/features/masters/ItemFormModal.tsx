import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useCreateItem, useUpdateItem, type Item } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  companyId?: number;
  initial?: Item | null;
}

const empty = (companyId?: number): Partial<Item> => ({
  company: companyId,
  sku: '', name: '', kind: 'GOODS', unit: 'Nos',
  sale_price: '0', purchase_price: '0', tax_rate: '18',
  description: '', is_active: true,
});

export default function ItemFormModal({ open, onClose, companyId, initial }: Props) {
  const isEdit = !!initial;
  const create = useCreateItem();
  const update = useUpdateItem();
  const [form, setForm] = useState<Partial<Item>>(empty(companyId));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErr(null);
      setForm(initial ? { ...initial } : empty(companyId));
    }
  }, [open, initial, companyId]);

  const upd = (patch: Partial<Item>) => setForm((p) => ({ ...p, ...patch }));

  const submit = async () => {
    setErr(null);
    if (!companyId) return;
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ ...form, id: initial.id } as Partial<Item> & { id: number });
        toast.success(`Updated ${form.name}`);
      } else {
        await create.mutateAsync({ ...form, company: companyId });
        toast.success(`Added ${form.name}`);
      }
      onClose();
    } catch (e: unknown) {
      const er = e as { response?: { data?: unknown } };
      setErr(JSON.stringify(er.response?.data ?? 'Failed'));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${initial?.name}` : 'New Item'} size="md">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label className="label">SKU *</label>
          <input className="input font-mono" value={form.sku ?? ''} onChange={(e) => upd({ sku: e.target.value.toUpperCase() })} /></div>
        <div><label className="label">Name *</label>
          <input className="input" value={form.name ?? ''} onChange={(e) => upd({ name: e.target.value })} /></div>
        <div><label className="label">Kind</label>
          <select className="input" value={form.kind} onChange={(e) => upd({ kind: e.target.value as Item['kind'] })}>
            <option value="GOODS">Goods</option><option value="SERVICE">Service</option>
          </select></div>
        <div><label className="label">Unit (UoM)</label>
          <input className="input" value={form.unit ?? ''} onChange={(e) => upd({ unit: e.target.value })} /></div>
        <div><label className="label">Sale Price (₹)</label>
          <input className="input text-right" inputMode="decimal" value={form.sale_price ?? '0'} onChange={(e) => upd({ sale_price: e.target.value })} /></div>
        <div><label className="label">Purchase Price (₹)</label>
          <input className="input text-right" inputMode="decimal" value={form.purchase_price ?? '0'} onChange={(e) => upd({ purchase_price: e.target.value })} /></div>
        <div><label className="label">GST Rate (%)</label>
          <input className="input text-right" inputMode="decimal" value={form.tax_rate ?? '0'} onChange={(e) => upd({ tax_rate: e.target.value })} /></div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => upd({ is_active: e.target.checked })} />
            Active
          </label></div>
      </div>
      {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!form.name || !form.sku || busy} onClick={submit}>
          {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Add item')}
        </button>
      </div>
    </Modal>
  );
}
