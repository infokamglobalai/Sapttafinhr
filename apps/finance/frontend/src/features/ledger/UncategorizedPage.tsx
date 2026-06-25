import { useState, useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePostableAccounts } from '@/features/masters/api';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';
import { formatINR, getDisplayCurrency, sum } from '@/lib/money';
import { Edit2, Save, X, Plus, Trash2, HelpCircle } from 'lucide-react';

interface JournalLine {
  id?: number;
  account: number;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string;
}

interface JournalEntry {
  id: number;
  voucher_no: string;
  date: string;
  narration: string;
  status: string;
  category: string;
  lines: JournalLine[];
}

interface EditLineInput {
  tmpId: string;
  id?: number;
  account: number;
  debit: string;
  credit: string;
  description: string;
}

export default function UncategorizedPage() {
  const { companyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { data: accounts } = usePostableAccounts(companyId);

  // Fetch uncategorized entries
  const { data: entries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['uncategorized-entries', companyId],
    enabled: companyId != null,
    queryFn: async () => 
      (await api.get('/ledger/entries/', { params: { company: companyId, category: 'uncategorized', page_size: 100 } })).data.results,
  });

  // State for active editing entry
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLines, setEditLines] = useState<EditLineInput[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditLines(
      entry.lines.map((l) => ({
        tmpId: crypto.randomUUID(),
        id: l.id,
        account: l.account,
        debit: Number(l.debit).toString(),
        credit: Number(l.credit).toString(),
        description: l.description || '',
      }))
    );
    setErr(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLines([]);
    setErr(null);
  };

  // Line editing handlers
  const updateLineEdit = (idx: number, patch: Partial<EditLineInput>) => {
    setEditLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLineEdit = () => {
    setEditLines((prev) => [
      ...prev,
      { tmpId: crypto.randomUUID(), account: 0, debit: '0', credit: '0', description: '' },
    ]);
  };

  const removeLineEdit = (idx: number) => {
    if (editLines.length <= 2) {
      toast.error('A transaction must have at least two lines.');
      return;
    }
    setEditLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculate totals for currently edited lines
  const totals = useMemo(() => {
    const d = sum(editLines.map((l) => l.debit || 0));
    const c = sum(editLines.map((l) => l.credit || 0));
    return { debit: d, credit: c, diff: d.minus(c) };
  }, [editLines]);

  // Save mutation
  const reclassify = useMutation({
    mutationFn: async ({ id, lines }: { id: number; lines: any[] }) =>
      (await api.post(`/ledger/entries/${id}/reclassify/`, { lines })).data,
    onSuccess: (data) => {
      toast.success(`Entry ${data.voucher_no} re-classified successfully!`);
      setEditingId(null);
      setEditLines([]);
      
      // Invalidate all related queries to refresh Day Book, sidebar count badge, and queue
      queryClient.invalidateQueries({ queryKey: ['uncategorized-entries', companyId] });
      queryClient.invalidateQueries({ queryKey: ['uncategorized-count', companyId] });
      queryClient.invalidateQueries({ queryKey: ['day-book'] });
    },
    onError: (e: any) => {
      setErr(JSON.stringify(e.response?.data ?? e.message));
    },
  });

  const handleSave = () => {
    setErr(null);
    if (!editingId) return;
    if (editLines.some((l) => !l.account)) {
      setErr('Every line must have an account selected.');
      return;
    }
    if (!totals.diff.isZero()) {
      setErr(`Lines are unbalanced by ${formatINR(totals.diff.abs())}. Debits must equal Credits.`);
      return;
    }
    if (totals.debit.isZero()) {
      setErr('Amount cannot be zero.');
      return;
    }

    reclassify.mutate({
      id: editingId,
      lines: editLines.map(({ account, debit, credit, description }) => ({
        account,
        debit,
        credit,
        description,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uncategorized Queue"
        subtitle="Review, edit, and classify out-of-category transactions or items posted to Suspense."
      />

      {isLoading && <div className="text-center py-12 text-slate-500">Loading queue...</div>}

      {!isLoading && (!entries || entries.length === 0) && (
        <div className="card bg-white border border-slate-200 p-12 text-center rounded-2xl">
          <HelpCircle size={48} className="mx-auto text-emerald-500 mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">Queue is Clear!</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            All transaction entries are correctly categorized into their specific modules. No action required.
          </p>
        </div>
      )}

      {!isLoading && entries && entries.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 max-w-3xl flex items-start gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold mb-1">Pending Classification Alert</p>
              <p>You have {entries.length} transaction(s) requiring attention. Repositioning their accounts so they no longer reference Suspense (2990) or miscellaneous categories will automatically file them under the right module and clear them from this queue.</p>
            </div>
          </div>

          <div className="space-y-6">
            {entries.map((entry) => {
              const isEditing = editingId === entry.id;

              return (
                <div key={entry.id} className="card bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-0 animate-in fade-in duration-200">
                  {/* Card Header */}
                  <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-brand-600">{entry.voucher_no}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold uppercase tracking-wider scale-95">Uncategorized</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Date: {entry.date} · Narration: <span className="italic">"{entry.narration || '—'}"</span></p>
                    </div>

                    {!isEditing && (
                      <button 
                        onClick={() => startEdit(entry)}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                      >
                        <Edit2 size={13} /> Classify &amp; Resolve
                      </button>
                    )}
                  </div>

                  {/* Card Body / Lines */}
                  <div className="p-6">
                    {!isEditing ? (
                      <table className="w-full text-xs">
                        <thead className="text-left text-[10px] uppercase text-slate-400 border-b border-slate-100">
                          <tr>
                            <th className="pb-2">Account</th>
                            <th className="pb-2">Line Description</th>
                            <th className="pb-2 text-right">Debit ({getDisplayCurrency()})</th>
                            <th className="pb-2 text-right">Credit ({getDisplayCurrency()})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {entry.lines.map((line, idx) => (
                            <tr key={line.id || idx}>
                              <td className="py-2.5 font-medium text-slate-800">
                                <span className="font-mono text-slate-400 mr-2">{line.account_code}</span>
                                {line.account_name}
                              </td>
                              <td className="py-2.5 text-slate-500">{line.description || '—'}</td>
                              <td className="py-2.5 text-right font-mono text-slate-700">{Number(line.debit) ? formatINR(line.debit) : '—'}</td>
                              <td className="py-2.5 text-right font-mono text-slate-700">{Number(line.credit) ? formatINR(line.credit) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="space-y-4">
                        <table className="w-full text-xs">
                          <thead className="text-left text-[10px] uppercase text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="pb-2">Account *</th>
                              <th className="pb-2">Line Description</th>
                              <th className="pb-2 text-right w-32">Debit ({getDisplayCurrency()})</th>
                              <th className="pb-2 text-right w-32">Credit ({getDisplayCurrency()})</th>
                              <th className="pb-2 text-center w-12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {editLines.map((line, idx) => (
                              <tr key={line.tmpId}>
                                <td className="py-2">
                                  <select
                                    className="input text-xs py-1"
                                    value={line.account || ''}
                                    onChange={(e) => updateLineEdit(idx, { account: Number(e.target.value) })}
                                  >
                                    <option value="">— select account —</option>
                                    {accounts?.map((a) => (
                                      <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.type})</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    className="input text-xs py-1"
                                    value={line.description}
                                    onChange={(e) => updateLineEdit(idx, { description: e.target.value })}
                                    placeholder="Line description"
                                  />
                                </td>
                                <td className="py-2">
                                  <input
                                    className="input text-xs py-1 text-right font-mono"
                                    type="number"
                                    value={line.debit}
                                    onChange={(e) => updateLineEdit(idx, { debit: e.target.value, credit: '0' })}
                                  />
                                </td>
                                <td className="py-2">
                                  <input
                                    className="input text-xs py-1 text-right font-mono"
                                    type="number"
                                    value={line.credit}
                                    onChange={(e) => updateLineEdit(idx, { credit: e.target.value, debit: '0' })}
                                  />
                                </td>
                                <td className="py-2 text-center">
                                  <button
                                    onClick={() => removeLineEdit(idx)}
                                    disabled={editLines.length <= 2}
                                    className="text-red-500 hover:text-red-700 disabled:opacity-30 transition"
                                  >
                                    <Trash2 size={14} className="mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 font-medium">
                            <tr>
                              <td className="py-2 px-2 text-slate-600">Totals</td>
                              <td className="py-2 text-right text-xs">
                                <button type="button" onClick={addLineEdit} className="btn-ghost py-0.5 px-2 text-[10px] text-brand-600 font-bold flex items-center gap-1">
                                  <Plus size={10} /> Add Line
                                </button>
                              </td>
                              <td className="py-2 text-right font-mono text-slate-800 pr-1">{formatINR(totals.debit)}</td>
                              <td className="py-2 text-right font-mono text-slate-800 pr-1">{formatINR(totals.credit)}</td>
                              <td className={`py-2 text-center text-[10px] ${totals.diff.isZero() ? 'text-emerald-600' : 'text-red-500'}`}>
                                {totals.diff.isZero() ? 'Balanced ✓' : `Off by ${formatINR(totals.diff.abs())}`}
                              </td>
                            </tr>
                          </tfoot>
                        </table>

                        {err && <div className="text-xs bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg">{err}</div>}

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                          <button onClick={cancelEdit} className="btn-ghost py-1 px-3 text-xs flex items-center gap-1" disabled={reclassify.isPending}>
                            <X size={12} /> Cancel
                          </button>
                          <button onClick={handleSave} className="btn-primary py-1 px-3 text-xs flex items-center gap-1" disabled={reclassify.isPending || !totals.diff.isZero()}>
                            <Save size={12} /> {reclassify.isPending ? 'Saving...' : 'Save & Classify'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
