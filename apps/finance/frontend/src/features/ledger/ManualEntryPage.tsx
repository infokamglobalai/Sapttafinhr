import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { useCompanies, useFiscalYears, usePostableAccounts } from '@/features/masters/api';
import { useCreateManualJE, type ManualLineInput } from './api';
import { D, formatINR, sum } from '@/lib/money';
import { api } from '@/lib/api';

interface AccountSuggestion {
  account_id: number; code: string; name: string; type: string;
  confidence: 'high' | 'medium' | 'low'; reasoning: string;
}

interface DraftLine extends ManualLineInput { tmpId: string; }

const emptyLine = (): DraftLine => ({
  tmpId: crypto.randomUUID(),
  account: 0,
  debit: '0',
  credit: '0',
  description: '',
});

export default function ManualEntryPage() {
  const { data: companies } = useCompanies();
  const [companyId, setCompanyId] = useState<number | undefined>();
  const { data: fiscalYears } = useFiscalYears(companyId);
  const { data: accounts } = usePostableAccounts(companyId);

  const [fyId, setFyId] = useState<number | undefined>();
  const [voucherNo, setVoucherNo] = useState('JV-0001');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AccountSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const create = useCreateManualJE();

  useEffect(() => {
    if (companyId == null && companies?.length) setCompanyId(companies[0].id);
  }, [companies, companyId]);
  useEffect(() => {
    if (fiscalYears?.length) setFyId(fiscalYears[0].id);
  }, [fiscalYears]);

  const totals = useMemo(() => {
    const d = sum(lines.map((l) => l.debit || 0));
    const c = sum(lines.map((l) => l.credit || 0));
    return { debit: d, credit: c, diff: d.minus(c) };
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const onNarrationChange = (value: string) => {
    setNarration(value);
    setSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 5 || !companyId) return;
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const r = await api.post('/ledger/suggest-account/', { narration: value, company_id: companyId });
        setSuggestions(r.data.suggestions ?? []);
      } catch { /* silent */ }
      finally { setSuggestLoading(false); }
    }, 900);
  };

  const applySuggestion = (s: AccountSuggestion) => {
    const firstEmpty = lines.findIndex((l) => !l.account);
    const idx = firstEmpty >= 0 ? firstEmpty : 0;
    updateLine(idx, { account: s.account_id });
    setSuggestions([]);
  };

  async function onSubmit() {
    setError(null);
    if (!companyId || !fyId) { setError('Pick company and fiscal year'); return; }
    if (!totals.diff.isZero()) { setError(`Unbalanced: debits ${totals.debit} ≠ credits ${totals.credit}`); return; }
    if (totals.debit.isZero()) { setError('Total cannot be zero'); return; }
    if (lines.some((l) => !l.account)) { setError('Every line needs an account'); return; }

    try {
      await create.mutateAsync({
        company: companyId,
        fiscal_year: fyId,
        voucher_no: voucherNo,
        date,
        narration,
        lines: lines.map(({ tmpId: _t, ...rest }) => rest),
      });
      setLines([emptyLine(), emptyLine()]);
      setNarration('');
      const nextNum = Number(voucherNo.replace(/\D/g, '') || 0) + 1;
      setVoucherNo(`JV-${String(nextNum).padStart(4, '0')}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      setError(JSON.stringify(err.response?.data ?? 'Save failed'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Manual Journal Entry</h1>
        <p className="text-sm text-slate-500">Posts directly to the ledger after enforcing D = C.</p>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="label">Company</label>
            <select className="input" value={companyId ?? ''} onChange={(e) => setCompanyId(Number(e.target.value))}>
              {companies?.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Fiscal Year</label>
            <select className="input" value={fyId ?? ''} onChange={(e) => setFyId(Number(e.target.value))}>
              {fiscalYears?.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Voucher No.</label>
            <input className="input" value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label flex items-center gap-1">
            Narration
            {suggestLoading && <Sparkles size={12} className="animate-pulse text-brand-400" />}
          </label>
          <input
            className="input"
            value={narration}
            onChange={(e) => onNarrationChange(e.target.value)}
            placeholder="Description of the transaction — AI suggests accounts after you type"
          />
          {suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="text-xs text-slate-400 self-center">AI suggests:</span>
              {suggestions.map((s) => {
                const confColor = s.confidence === 'high' ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : s.confidence === 'medium' ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-slate-50 border-slate-300 text-slate-600';
                return (
                  <button
                    key={s.account_id}
                    onClick={() => applySuggestion(s)}
                    title={s.reasoning}
                    className={`rounded border px-2 py-0.5 text-xs font-medium transition hover:shadow-sm ${confColor}`}
                  >
                    {s.code} — {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
              <th className="px-3 py-2">Description</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lines.map((line, idx) => (
              <tr key={line.tmpId}>
                <td className="px-3 py-2">
                  <select
                    className="input"
                    value={line.account || ''}
                    onChange={(e) => updateLine(idx, { account: Number(e.target.value) })}
                  >
                    <option value="">— select —</option>
                    {accounts?.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input text-right tabular-nums"
                    inputMode="decimal"
                    value={line.debit}
                    onChange={(e) => updateLine(idx, { debit: e.target.value, credit: '0' })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input text-right tabular-nums"
                    inputMode="decimal"
                    value={line.credit}
                    onChange={(e) => updateLine(idx, { credit: e.target.value, debit: '0' })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input className="input" value={line.description ?? ''}
                         onChange={(e) => updateLine(idx, { description: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <button className="btn-ghost" onClick={() => removeLine(idx)} disabled={lines.length <= 2}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td className="px-3 py-2 font-medium">Totals</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatINR(totals.debit)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatINR(totals.credit)}</td>
              <td className={`px-3 py-2 font-medium ${totals.diff.isZero() ? 'text-emerald-600' : 'text-red-600'}`}>
                {totals.diff.isZero() ? 'Balanced ✓' : `Off by ${formatINR(D(totals.diff).abs())}`}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        <div className="border-t border-slate-200 p-3">
          <button className="btn-ghost" onClick={addLine}>
            <Plus size={16} className="mr-1" /> Add line
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end">
        <button
          className="btn-primary"
          onClick={onSubmit}
          disabled={create.isPending || !totals.diff.isZero() || totals.debit.isZero()}
        >
          {create.isPending ? 'Posting…' : 'Post Journal Entry'}
        </button>
      </div>
    </div>
  );
}
