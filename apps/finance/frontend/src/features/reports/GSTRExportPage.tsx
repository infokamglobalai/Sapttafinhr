import { useState } from 'react';
import { Download, FileJson } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';

function thisMonthMMYYYY() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
}

export default function GSTRExportPage() {
  const { companyId } = useActiveCompany();
  const [period, setPeriod] = useState(thisMonthMMYYYY());
  const [busy, setBusy] = useState<'1' | '3b' | null>(null);

  const download = async (kind: '1' | '3b') => {
    if (!companyId) return;
    setBusy(kind);
    try {
      const url = kind === '1' ? '/taxation/gstr1/' : '/taxation/gstr3b/';
      const r = await api.get(url, { params: { company: companyId, period } });
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `GSTR-${kind.toUpperCase()}-${period}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`GSTR-${kind.toUpperCase()} downloaded`, `${period}`);
    } catch (e: any) {
      toast.error('Download failed', JSON.stringify(e?.response?.data ?? 'Failed'));
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="GSTR Exports" subtitle="Download GSTR-1 / GSTR-3B JSON for the offline filing tool." />
      <PageHint storageKey="gstr-export">
        These JSON files load into the GSTN offline utility. Real e-filing (direct API push) needs GSP credentials and is on the roadmap.
      </PageHint>

      <div className="card">
        <div className="flex items-end gap-4">
          <div>
            <label className="label">Return Period (MMYYYY)</label>
            <input className="input w-32 font-mono" value={period} onChange={(e) => setPeriod(e.target.value)} maxLength={6} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button onClick={() => download('1')} disabled={busy !== null} className="card text-left transition hover:shadow-md disabled:opacity-50">
          <div className="flex items-center gap-2 text-base font-semibold text-brand-600">
            <FileJson size={18} /> GSTR-1
          </div>
          <p className="mt-2 text-sm text-slate-600">Outward supplies — B2B + B2CS + HSN summary.</p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            <Download size={14} /> {busy === '1' ? 'Generating…' : 'Download JSON'}
          </div>
        </button>

        <button onClick={() => download('3b')} disabled={busy !== null} className="card text-left transition hover:shadow-md disabled:opacity-50">
          <div className="flex items-center gap-2 text-base font-semibold text-brand-600">
            <FileJson size={18} /> GSTR-3B
          </div>
          <p className="mt-2 text-sm text-slate-600">Monthly summary — outward + inward + ITC available.</p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            <Download size={14} /> {busy === '3b' ? 'Generating…' : 'Download JSON'}
          </div>
        </button>
      </div>
    </div>
  );
}
