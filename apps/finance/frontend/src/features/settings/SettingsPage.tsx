import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const [closeDate, setCloseDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function closeBooks() {
    if (!companyId || !closeDate) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/masters/companies/${companyId}/close-books/`, { until: closeDate });
      setMsg(`Books closed until ${r.data.books_closed_until}.`);
    } catch (e: any) {
      setMsg(JSON.stringify(e?.response?.data ?? 'Failed'));
    } finally { setBusy(false); }
  }

  async function exportData() {
    if (!companyId) return;
    const r = await api.get(`/masters/companies/${companyId}/export/`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company?.name ?? 'company'}_export.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Books closing, data export, advanced configuration." />

      <div className="card space-y-3">
        <div className="text-base font-semibold">Books Closing</div>
        <p className="text-sm text-slate-500">Locks the period so no JEs dated on/before this can be created or edited.</p>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Close until</label>
            <input className="input" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={closeBooks} disabled={!closeDate || busy}>
            {busy ? 'Working…' : 'Close books'}
          </button>
        </div>
        {msg && <div className="rounded bg-slate-50 p-2 text-xs">{msg}</div>}
      </div>

      <div className="card space-y-3">
        <div className="text-base font-semibold">Data Export</div>
        <p className="text-sm text-slate-500">Download a ZIP of CSVs containing all your company's core data.</p>
        <button className="btn-primary" onClick={exportData} disabled={!companyId}>Download ZIP</button>
      </div>

      <div className="card space-y-3">
        <div className="text-base font-semibold">Admin Backend</div>
        <p className="text-sm text-slate-500">
          Advanced configuration — users, roles, bank accounts, warehouses, fixed assets, recurring invoices, API keys,
          webhooks, customer portal access, SaaS plans — is managed in the Django admin.
        </p>
        <a href="http://acme.localhost:8000/admin/" target="_blank" rel="noreferrer"
           className="btn-primary inline-flex items-center gap-1">
          Open Admin <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
