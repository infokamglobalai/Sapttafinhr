import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useUpdateCompany, type Company } from '@/features/masters/api';
import {
  GSTIN_HINT,
  GSTIN_PLACEHOLDER,
  gstinPanConsistency,
  gstinStateConsistency,
  sanitizeGstinInput,
  sanitizePanInput,
  validateGstin,
  validatePan,
} from '@/lib/taxValidation';

export default function CompanyProfilePage() {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const update = useUpdateCompany();
  const [form, setForm] = useState<Partial<Company>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (company) setForm({ ...company }); }, [company]);

  const upd = (patch: Partial<Company>) => setForm((p) => ({ ...p, ...patch }));

  const save = async () => {
    setErr(null);
    if (!companyId) return;
    const isIndia = form.base_currency === 'INR' || form.country === 'IN';
    const gstin = sanitizeGstinInput(form.gstin ?? '');
    const pan = sanitizePanInput(form.pan ?? '');
    const stateCode = (form.state_code ?? '').trim();
    if (isIndia && gstin) {
      const gstErr = validateGstin(gstin, true);
      if (gstErr) { setErr(gstErr); return; }
      const panErr = validatePan(pan);
      if (panErr) { setErr(panErr); return; }
      const stateErr = gstinStateConsistency(gstin, stateCode);
      if (stateErr) { setErr(stateErr); return; }
      const panMatchErr = gstinPanConsistency(gstin, pan);
      if (panMatchErr) { setErr(panMatchErr); return; }
    }
    try {
      await update.mutateAsync({
        ...form,
        id: companyId,
        gstin,
        pan: pan || form.pan,
        state_code: stateCode ? stateCode.padStart(2, '0').slice(-2) : form.state_code,
      });
      toast.success('Company profile saved');
    } catch (e: any) {
      const data = e?.response?.data;
      setErr(typeof data?.gstin === 'string' ? data.gstin : JSON.stringify(data ?? 'Failed'));
    }
  };

  if (!company) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Company Profile" subtitle="These details appear on every invoice you send." />

      <div className="card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label className="label">Display Name *</label>
            <input className="input" value={form.name ?? ''} onChange={(e) => upd({ name: e.target.value })} /></div>
          <div><label className="label">Legal Name</label>
            <input className="input" value={form.legal_name ?? ''} onChange={(e) => upd({ legal_name: e.target.value })} /></div>
          <div><label className="label">GSTIN</label>
            <input className="input font-mono" value={form.gstin ?? ''} maxLength={15} placeholder={GSTIN_PLACEHOLDER}
              onChange={(e) => {
                const gstin = sanitizeGstinInput(e.target.value);
                upd({
                  gstin,
                  ...(gstin.length >= 2 ? { state_code: gstin.slice(0, 2) } : {}),
                  ...(gstin.length >= 12 ? { pan: gstin.slice(2, 12) } : {}),
                });
              }} />
            <p className="mt-1 text-[11px] text-slate-500">{GSTIN_HINT}</p></div>
          <div><label className="label">PAN</label>
            <input className="input font-mono" value={form.pan ?? ''} maxLength={10}
              onChange={(e) => upd({ pan: sanitizePanInput(e.target.value) })} /></div>
          <div><label className="label">Home State Code</label>
            <input className="input" value={form.state_code ?? ''} onChange={(e) => upd({ state_code: e.target.value })} maxLength={2}
              placeholder="e.g. 27 (Maharashtra), 29 (Karnataka)" /></div>
          <div><label className="label">Base Currency</label>
            <input className="input" value={form.base_currency ?? 'INR'} onChange={(e) => upd({ base_currency: e.target.value.toUpperCase() })} maxLength={3} /></div>
        </div>
        {err && <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" onClick={save} disabled={update.isPending || !form.name}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="card bg-slate-50 text-sm text-slate-600">
        <strong>Why these matter:</strong>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li><strong>GSTIN + State Code</strong> drive the CGST/SGST vs IGST split on every invoice.</li>
          <li><strong>Legal Name + GSTIN</strong> are printed in the PDF header.</li>
          <li><strong>PAN</strong> is required for TDS/TCS compliance.</li>
        </ul>
      </div>
    </div>
  );
}
