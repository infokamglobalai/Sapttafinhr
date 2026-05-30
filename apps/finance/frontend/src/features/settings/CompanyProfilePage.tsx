import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useUpdateCompany, type Company } from '@/features/masters/api';

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
    try {
      await update.mutateAsync({ ...form, id: companyId });
      toast.success('Company profile saved');
    } catch (e: any) {
      setErr(JSON.stringify(e?.response?.data ?? 'Failed'));
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
            <input className="input font-mono" value={form.gstin ?? ''} onChange={(e) => upd({ gstin: e.target.value.toUpperCase() })} maxLength={15} /></div>
          <div><label className="label">PAN</label>
            <input className="input font-mono" value={form.pan ?? ''} onChange={(e) => upd({ pan: e.target.value.toUpperCase() })} maxLength={10} /></div>
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
