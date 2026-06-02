import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import {
  useNumberSeries, useUpdateNumberSeries, useSeedNumberSeries, type NumberSeries,
} from '@/features/masters/api';

type Draft = Pick<NumberSeries, 'prefix' | 'padding' | 'start_number'>;

/** Live preview of what the next number would look like for a draft. */
function preview(d: Draft): string {
  return `${d.prefix}${String(Math.max(1, d.start_number || 1)).padStart(d.padding || 1, '0')}`;
}

export default function NumberSeriesPage() {
  const { companyId } = useActiveCompany();
  const { data: rows, isLoading } = useNumberSeries(companyId);
  const update = useUpdateNumberSeries();
  const seed = useSeedNumberSeries();
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  // Seed default rows on first visit if none exist yet.
  useEffect(() => {
    if (!isLoading && companyId != null && rows && rows.length === 0 && !seed.isPending) {
      seed.mutate(companyId);
    }
  }, [isLoading, companyId, rows, seed]);

  const draftFor = (r: NumberSeries): Draft =>
    drafts[r.id] ?? { prefix: r.prefix, padding: r.padding, start_number: r.start_number };

  const setDraft = (id: number, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...draftFor(rows!.find((r) => r.id === id)!), ...d[id], ...patch } }));

  const save = (r: NumberSeries) => {
    const d = draftFor(r);
    update.mutate({ id: r.id, ...d }, {
      onSuccess: () => { toast.success('Saved', `${r.doc_type_display} numbering updated.`); setDrafts((x) => { const n = { ...x }; delete n[r.id]; return n; }); },
      onError: (e: any) => toast.error('Save failed', JSON.stringify(e?.response?.data ?? 'Failed')),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Number Series" subtitle="Control the prefix and running number for each document type." />
      <PageHint storageKey="number-series">
        These set what new document numbers <em>start</em> from. The system always suggests the next number
        after your highest existing one, so changing the prefix won't renumber past documents. You can still
        override any number while creating a document.
      </PageHint>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Prefix</th>
              <th className="px-4 py-3 w-24">Digits</th>
              <th className="px-4 py-3 w-28">Start at</th>
              <th className="px-4 py-3">Next number</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>}
            {rows?.map((r) => {
              const d = draftFor(r);
              const dirty = !!drafts[r.id];
              return (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.doc_type_display}</td>
                  <td className="px-4 py-2.5">
                    <input className="input font-mono w-40" value={d.prefix}
                      onChange={(e) => setDraft(r.id, { prefix: e.target.value })} placeholder="INV-" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={1} max={10} className="input w-20" value={d.padding}
                      onChange={(e) => setDraft(r.id, { padding: Number(e.target.value) })} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={1} className="input w-24" value={d.start_number}
                      onChange={(e) => setDraft(r.id, { start_number: Number(e.target.value) })} />
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs">{dirty ? preview(d) : r.next_number}</code>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="btn-primary inline-flex items-center gap-1 disabled:opacity-40"
                      disabled={!dirty || update.isPending} onClick={() => save(r)}>
                      <Save size={14} /> Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
