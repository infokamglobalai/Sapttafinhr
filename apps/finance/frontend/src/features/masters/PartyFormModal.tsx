import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useCreateParty, useUpdateParty, type Party } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  companyId?: number;
  initial?: Party | null;
}

const empty = (companyId?: number): Partial<Party> => ({
  company: companyId,
  kind: 'CUSTOMER', name: '', gstin: '', email: '', phone: '',
  state_code: '27', billing_address: '', credit_limit: '0',
  legal_name: '', pan: '', is_active: true,
  bank_account_name: '', bank_account_number: '', bank_name: '',
  bank_ifsc: '', bank_branch: '', upi_id: '',
});

export default function PartyFormModal({ open, onClose, companyId, initial }: Props) {
  const isEdit = !!initial;
  const create = useCreateParty();
  const update = useUpdateParty();
  const [form, setForm] = useState<Partial<Party>>(empty(companyId));
  const [err, setErr] = useState<string | null>(null);
  const [showBank, setShowBank] = useState(false);

  useEffect(() => {
    if (open) {
      setErr(null);
      setForm(initial ? { ...initial } : empty(companyId));
      // Auto-open bank section if vendor or already has bank details
      setShowBank(
        initial?.kind === 'VENDOR' || initial?.kind === 'BOTH' ||
        !!initial?.bank_account_number
      );
    }
  }, [open, initial, companyId]);

  const update_ = (patch: Partial<Party>) => setForm((p) => ({ ...p, ...patch }));

  const isVendor = form.kind === 'VENDOR' || form.kind === 'BOTH';

  const submit = async () => {
    setErr(null);
    if (!companyId) return;
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ ...form, id: initial.id } as Partial<Party> & { id: number });
        toast.success(`Updated ${form.name}`);
      } else {
        await create.mutateAsync({ ...form, company: companyId } as Partial<Party>);
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
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${initial?.name}` : 'New Customer / Vendor'} size="lg">
      <div className="space-y-5">
        {/* Identity */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.kind} onChange={(e) => update_({ kind: e.target.value as Party['kind'] })}>
              <option value="CUSTOMER">Customer</option>
              <option value="VENDOR">Vendor</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name ?? ''} onChange={(e) => update_({ name: e.target.value })} />
          </div>
          <div>
            <label className="label">Legal Name</label>
            <input className="input" value={form.legal_name ?? ''} onChange={(e) => update_({ legal_name: e.target.value })} />
          </div>
          <div>
            <label className="label">GSTIN (15 chars)</label>
            <input className="input font-mono" maxLength={15}
              value={form.gstin ?? ''} onChange={(e) => update_({ gstin: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="label">PAN</label>
            <input className="input font-mono" maxLength={10}
              value={form.pan ?? ''} onChange={(e) => update_({ pan: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="label">State Code (2-digit)</label>
            <input className="input" value={form.state_code ?? ''} onChange={(e) => update_({ state_code: e.target.value })} maxLength={2}
              placeholder="e.g. 27 (Maharashtra)" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email ?? ''} onChange={(e) => update_({ email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone ?? ''} onChange={(e) => update_({ phone: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Billing Address</label>
            <textarea className="input" rows={2} value={form.billing_address ?? ''} onChange={(e) => update_({ billing_address: e.target.value })} />
          </div>
          <div>
            <label className="label">Credit Limit (₹)</label>
            <input className="input" inputMode="decimal" value={form.credit_limit ?? '0'} onChange={(e) => update_({ credit_limit: e.target.value })} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => update_({ is_active: e.target.checked })} />
              Active
            </label>
          </div>
        </div>

        {/* Bank details (collapsible) */}
        <div className="rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setShowBank((s) => !s)}
            className="flex w-full items-center justify-between rounded-t-lg bg-slate-50 px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-100"
          >
            <span className="flex items-center gap-2 text-slate-700">
              <Landmark size={15} className="text-slate-500" />
              Bank Details {isVendor && <span className="text-xs text-amber-700">(needed to pay this vendor)</span>}
            </span>
            <span className="text-xs text-slate-500">{showBank ? 'Hide ▴' : 'Show ▾'}</span>
          </button>
          {showBank && (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
              <div>
                <label className="label">Beneficiary Name</label>
                <input className="input" value={form.bank_account_name ?? ''} onChange={(e) => update_({ bank_account_name: e.target.value })}
                  placeholder="As per bank records" />
              </div>
              <div>
                <label className="label">Account Number</label>
                <input className="input font-mono" value={form.bank_account_number ?? ''} onChange={(e) => update_({ bank_account_number: e.target.value })} />
              </div>
              <div>
                <label className="label">Bank Name</label>
                <input className="input" value={form.bank_name ?? ''} onChange={(e) => update_({ bank_name: e.target.value })}
                  placeholder="e.g. HDFC Bank" />
              </div>
              <div>
                <label className="label">IFSC</label>
                <input className="input font-mono" maxLength={11}
                  value={form.bank_ifsc ?? ''} onChange={(e) => update_({ bank_ifsc: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="label">Branch</label>
                <input className="input" value={form.bank_branch ?? ''} onChange={(e) => update_({ bank_branch: e.target.value })} />
              </div>
              <div>
                <label className="label">UPI ID</label>
                <input className="input font-mono" value={form.upi_id ?? ''} onChange={(e) => update_({ upi_id: e.target.value })}
                  placeholder="vendor@upi" />
              </div>
            </div>
          )}
        </div>
      </div>

      {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!form.name || busy} onClick={submit}>
          {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Add')}
        </button>
      </div>
    </Modal>
  );
}
