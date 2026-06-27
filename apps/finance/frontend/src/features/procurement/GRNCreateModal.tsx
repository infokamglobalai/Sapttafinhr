import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { usePOs, useCreateGRN, type PO } from './api';
import { toast } from '@/components/Toaster';

interface ReceiptRow {
  po_line: number;
  description: string;
  ordered: string;
  already: string;
  received_qty: string;
}

export default function GRNCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyId } = useActiveCompany();
  const { data: pos } = usePOs(companyId);
  const create = useCreateGRN();
  const qc = useQueryClient();

  const openPOs = useMemo(() => (pos ?? []).filter((p) => p.status !== 'CLOSED'), [pos]);
  const [poId, setPoId] = useState<number | null>(null);
  const [grnNo, setGrnNo] = useState('GRN-0001');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const selectedPO: PO | undefined = openPOs.find((p) => p.id === poId);

  useEffect(() => {
    if (!selectedPO) {
      setRows([]);
      return;
    }
    setRows(selectedPO.lines.map((l: any) => ({
      po_line: l.id,
      description: l.description,
      ordered: String(l.quantity),
      already: String(l.received_qty ?? 0),
      received_qty: String(Math.max(0, Number(l.quantity) - Number(l.received_qty ?? 0))),
    })));
  }, [selectedPO]);

  const submit = async () => {
    setErr(null);
    if (!companyId || !poId) {
      setErr('Select a purchase order');
      return;
    }
    const receipts = rows
      .filter((r) => Number(r.received_qty) > 0)
      .map((r) => ({ po_line: r.po_line, received_qty: r.received_qty }));
    if (!receipts.length) {
      setErr('Enter at least one received quantity');
      return;
    }
    try {
      await create.mutateAsync({
        company: companyId,
        grn_no: grnNo,
        date,
        purchase_order: poId,
        notes,
        receipts,
      });
      toast('GRN recorded');
      qc.invalidateQueries({ queryKey: ['pos'] });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Failed to create GRN');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Goods Receipt" size="lg">
      <div className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-500">GRN #</span>
            <input className="input mt-1 w-full" value={grnNo} onChange={(e) => setGrnNo(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-500">Date</span>
            <input type="date" className="input mt-1 w-full" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-500">Purchase order</span>
          <select className="input mt-1 w-full" value={poId ?? ''} onChange={(e) => setPoId(Number(e.target.value) || null)}>
            <option value="">Select PO…</option>
            {openPOs.map((p) => (
              <option key={p.id} value={p.id}>{p.po_no} — {p.vendor_name}</option>
            ))}
          </select>
        </label>
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2 text-right">Ordered</th>
                  <th className="px-3 py-2 text-right">Already rcvd</th>
                  <th className="px-3 py-2 text-right">Receive now</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.po_line} className="border-t">
                    <td className="px-3 py-2">{r.description}</td>
                    <td className="px-3 py-2 text-right">{r.ordered}</td>
                    <td className="px-3 py-2 text-right">{r.already}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        className="input w-24 text-right"
                        value={r.received_qty}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...r, received_qty: e.target.value };
                          setRows(next);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <label className="block text-sm">
          <span className="text-slate-500">Notes</span>
          <input className="input mt-1 w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={create.isPending} onClick={submit}>Save GRN</button>
        </div>
      </div>
    </Modal>
  );
}
