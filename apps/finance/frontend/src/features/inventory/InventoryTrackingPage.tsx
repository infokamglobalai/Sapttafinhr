import { useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useItems } from '@/features/masters/api';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';

interface WH { id: number; code: string; name: string; }
interface Bin { id: number; code: string; warehouse: number; }
interface Batch { id: number; batch_no: string; item: number; item_sku: string; expiry_date: string | null; }
interface Serial { id: number; serial_no: string; item: number; item_sku: string; warehouse: number | null; status: string; }

type Tab = 'bins' | 'batches' | 'serials';

export default function InventoryTrackingPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('bins');
  const [open, setOpen] = useState(false);

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/inventory/warehouses/', { params: { company: companyId } })).data.results as WH[],
  });
  const { data: items } = useItems(companyId);

  const { data: bins, isLoading: binsLoading } = useQuery({
    queryKey: ['bins', companyId],
    enabled: companyId != null && tab === 'bins',
    queryFn: async () => (await api.get('/inventory/bins/', { params: { page_size: 200 } })).data.results as Bin[],
  });
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches', companyId],
    enabled: companyId != null && tab === 'batches',
    queryFn: async () => (await api.get('/inventory/batches/', { params: { company: companyId, page_size: 200 } })).data.results as Batch[],
  });
  const { data: serials, isLoading: serialsLoading } = useQuery({
    queryKey: ['serials', companyId],
    enabled: companyId != null && tab === 'serials',
    queryFn: async () => (await api.get('/inventory/serials/', { params: { company: companyId, page_size: 200 } })).data.results as Serial[],
  });

  const createBin = useMutation({
    mutationFn: async (p: unknown) => (await api.post('/inventory/bins/', p)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bins'] }); setOpen(false); toast('Bin created'); },
  });
  const createBatch = useMutation({
    mutationFn: async (p: unknown) => (await api.post('/inventory/batches/', p)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setOpen(false); toast('Batch created'); },
  });
  const createSerial = useMutation({
    mutationFn: async (p: unknown) => (await api.post('/inventory/serials/', p)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['serials'] }); setOpen(false); toast('Serial created'); },
  });

  const [binForm, setBinForm] = useState({ warehouse: 0, code: '' });
  const [batchForm, setBatchForm] = useState({ item: 0, batch_no: '', expiry_date: '' });
  const [serialForm, setSerialForm] = useState({ item: 0, serial_no: '', warehouse: 0 });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'bins', label: 'Bins' },
    { id: 'batches', label: 'Batches' },
    { id: 'serials', label: 'Serial numbers' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bins, Batches & Serials"
        subtitle="Advanced inventory tracking beyond warehouse-level stock."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1" /> Add {tab.slice(0, -1)}
          </button>
        }
      />
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button key={t.id}
            className={`rounded px-3 py-1 text-sm ${tab === t.id ? 'bg-brand-100 text-brand-700 font-medium' : 'text-slate-500'}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bins' && (
        <SimpleTable<Bin>
          rows={bins} loading={binsLoading} emptyIcon={Layers}
          emptyTitle="No bins" emptyDescription="Bins subdivide a warehouse (aisle/rack)."
          columns={[
            { key: 'code', label: 'Bin code' },
            { key: 'warehouse', label: 'Warehouse ID' },
          ]}
        />
      )}
      {tab === 'batches' && (
        <SimpleTable<Batch>
          rows={batches} loading={batchesLoading}
          columns={[
            { key: 'batch_no', label: 'Batch #' },
            { key: 'item_sku', label: 'SKU' },
            { key: 'expiry_date', label: 'Expiry' },
          ]}
        />
      )}
      {tab === 'serials' && (
        <SimpleTable<Serial>
          rows={serials} loading={serialsLoading}
          columns={[
            { key: 'serial_no', label: 'Serial #', render: (r) => <span className="font-mono text-xs">{r.serial_no}</span> },
            { key: 'item_sku', label: 'SKU' },
            { key: 'status', label: 'Status' },
          ]}
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`New ${tab.slice(0, -1)}`}>
        {tab === 'bins' && (
          <div className="space-y-3">
            <select className="input w-full" value={binForm.warehouse}
              onChange={(e) => setBinForm({ ...binForm, warehouse: Number(e.target.value) })}>
              <option value={0}>Warehouse…</option>
              {(warehouses ?? []).map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
            </select>
            <input className="input w-full" placeholder="Bin code" value={binForm.code}
              onChange={(e) => setBinForm({ ...binForm, code: e.target.value })} />
            <button className="btn-primary w-full" onClick={() => createBin.mutate(binForm)}>Save</button>
          </div>
        )}
        {tab === 'batches' && (
          <div className="space-y-3">
            <select className="input w-full" value={batchForm.item}
              onChange={(e) => setBatchForm({ ...batchForm, item: Number(e.target.value) })}>
              <option value={0}>Item…</option>
              {(items ?? []).map((i) => <option key={i.id} value={i.id}>{i.sku}</option>)}
            </select>
            <input className="input w-full" placeholder="Batch number" value={batchForm.batch_no}
              onChange={(e) => setBatchForm({ ...batchForm, batch_no: e.target.value })} />
            <input type="date" className="input w-full" value={batchForm.expiry_date}
              onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} />
            <button className="btn-primary w-full" onClick={() => createBatch.mutate({
              company: companyId, ...batchForm,
              expiry_date: batchForm.expiry_date || null,
            })}>Save</button>
          </div>
        )}
        {tab === 'serials' && (
          <div className="space-y-3">
            <select className="input w-full" value={serialForm.item}
              onChange={(e) => setSerialForm({ ...serialForm, item: Number(e.target.value) })}>
              <option value={0}>Item…</option>
              {(items ?? []).map((i) => <option key={i.id} value={i.id}>{i.sku}</option>)}
            </select>
            <input className="input w-full" placeholder="Serial number" value={serialForm.serial_no}
              onChange={(e) => setSerialForm({ ...serialForm, serial_no: e.target.value })} />
            <select className="input w-full" value={serialForm.warehouse}
              onChange={(e) => setSerialForm({ ...serialForm, warehouse: Number(e.target.value) })}>
              <option value={0}>Warehouse (optional)…</option>
              {(warehouses ?? []).map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
            </select>
            <button className="btn-primary w-full" onClick={() => createSerial.mutate({
              company: companyId,
              item: serialForm.item,
              serial_no: serialForm.serial_no,
              warehouse: serialForm.warehouse || null,
              status: 'IN_STOCK',
            })}>Save</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
