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

  const onLogoFile = (file?: File | null) => {
    setErr(null);
    if (!file) return;
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') { setErr('Logo must be a PNG or JPG image.'); return; }
    if (file.size > 512 * 1024) { setErr('Logo must be under 512 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => upd({ logo: String(reader.result) });
    reader.onerror = () => setErr('Could not read that image — try another file.');
    reader.readAsDataURL(file);
  };

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

      <div className="card">
        <div className="mb-4">
          <h3 className="text-ink-900">Document branding</h3>
          <p className="text-sm text-ink-500">Logo, accent and notes applied to the invoices, receipts and reports you generate.</p>
        </div>
        <div className="space-y-5">
          <div>
            <label className="label">Company logo</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
                {form.logo
                  ? <img src={form.logo} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                  : <span className="text-[11px] text-ink-400">No logo</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-ghost cursor-pointer">
                  {form.logo ? 'Replace logo' : 'Upload logo'}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} />
                </label>
                {form.logo && (
                  <button type="button" className="text-xs text-ink-500 transition-colors hover:text-brand-600" onClick={() => upd({ logo: '' })}>Remove</button>
                )}
                <span className="text-[11px] text-ink-400">PNG or JPG · up to 512 KB.</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="label">Header note</label>
              <input className="input" maxLength={120} placeholder="e.g. Chartered Accountants & Tax Advisors"
                value={form.document_header ?? ''} onChange={(e) => upd({ document_header: e.target.value })} /></div>
            <div><label className="label">Footer note</label>
              <input className="input" maxLength={240} placeholder="e.g. Thank you for your business."
                value={form.document_footer ?? ''} onChange={(e) => upd({ document_footer: e.target.value })} /></div>
            <div><label className="label">Accent colour</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-12 cursor-pointer rounded border border-ink-200 bg-white p-0.5"
                  value={form.brand_color || '#4f46e5'} onChange={(e) => upd({ brand_color: e.target.value })} />
                <input className="input font-mono" maxLength={7} placeholder="#4f46e5"
                  value={form.brand_color ?? ''} onChange={(e) => upd({ brand_color: e.target.value })} />
              </div></div>
            <div><label className="label">Template style</label>
              <div className="grid grid-cols-2 gap-2">
                {(['CLASSIC', 'MODERN'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => upd({ document_template: t })}
                    className={`rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${(form.document_template ?? 'CLASSIC') === t ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-ink-200 text-ink-600 hover:border-ink-300'}`}>
                    {t.toLowerCase()}
                  </button>
                ))}
              </div></div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button className="btn-primary" onClick={save} disabled={update.isPending || !form.name}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="card bg-ink-50 text-sm text-ink-600">
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
