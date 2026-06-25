import { useMemo, useState, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatINR, getDisplayCurrency } from '@/lib/money';
import DownloadMenu from './DownloadMenu';
import type { DownloadOpts } from './download';
import { usePostableAccounts } from '@/features/masters/api';
import { useCreateManualJE } from '@/features/ledger/api';
import { toast } from '@/components/Toaster';
import { Sparkles, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface Row { voucher_no: string; account: string; narration: string; debit: string; credit: string; }

interface AccountSuggestion {
  account_id: number; code: string; name: string; type: string;
  confidence: 'high' | 'medium' | 'low'; reasoning: string;
}

export default function DayBookPage() {
  const { companyId, fyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  const { data, isLoading } = useQuery({
    queryKey: ['day-book', companyId, date], enabled: companyId != null,
    queryFn: async () => (await api.get('/reports/day-book/', { params: { company: companyId, date } })).data,
  });

  // Quick Entry State
  const [formOpen, setFormOpen] = useState(false);
  const [voucherNo, setVoucherNo] = useState(() => 'JV-' + Date.now().toString().slice(-6));
  const [quickNarration, setQuickNarration] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [primaryAcc, setPrimaryAcc] = useState<number | undefined>();
  const [offsetAcc, setOffsetAcc] = useState<number | undefined>();
  const [dir, setDir] = useState<'debit' | 'credit'>('debit');
  const [suggestions, setSuggestions] = useState<AccountSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: accounts } = usePostableAccounts(companyId);
  const createJE = useCreateManualJE();

  const handleNarrationChange = (val: string) => {
    setQuickNarration(val);
    setSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 5 || !companyId) return;
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const r = await api.post('/ledger/suggest-account/', { narration: val, company_id: companyId });
        setSuggestions(r.data.suggestions ?? []);
      } catch { /* silent */ }
      finally { setSuggestLoading(false); }
    }, 900);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId || !fyId) {
      toast.error('Missing active company or fiscal year session.');
      return;
    }
    if (!quickNarration.trim()) {
      toast.error('Narration is required.');
      return;
    }
    const amt = Number(quickAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }
    if (!primaryAcc) {
      toast.error('Primary account is required.');
      return;
    }

    let finalOffset = offsetAcc;
    let isUncategorized = false;

    if (!finalOffset) {
      const suspense = accounts?.find(a => a.code === '2990' || a.name.toLowerCase().includes('suspense'));
      if (!suspense) {
        toast.error('No offset account selected and no Suspense account (2990) found.');
        return;
      }
      finalOffset = suspense.id;
      isUncategorized = true;
    }

    const lines = [
      {
        account: primaryAcc,
        debit: dir === 'debit' ? quickAmount : '0',
        credit: dir === 'credit' ? quickAmount : '0',
        description: quickNarration,
      },
      {
        account: finalOffset,
        debit: dir === 'credit' ? quickAmount : '0',
        credit: dir === 'debit' ? quickAmount : '0',
        description: quickNarration,
      }
    ];

    try {
      await createJE.mutateAsync({
        company: companyId,
        fiscal_year: fyId,
        voucher_no: voucherNo,
        date,
        narration: quickNarration,
        lines,
      });

      if (isUncategorized) {
        toast.info(`Entry posted to Suspense! Action Required: go to Uncategorized Queue to reclassify.`);
      } else {
        toast.success(`Entry ${voucherNo} posted successfully!`);
      }

      setQuickNarration('');
      setQuickAmount('');
      setPrimaryAcc(undefined);
      setOffsetAcc(undefined);
      setSuggestions([]);
      setVoucherNo('JV-' + Date.now().toString().slice(-6));
      setFormOpen(false);

      // Invalidate query to update day book list and badge counts
      queryClient.invalidateQueries({ queryKey: ['day-book', companyId, date] });
      queryClient.invalidateQueries({ queryKey: ['uncategorized-count', companyId] });
    } catch (err: any) {
      toast.error('Failed to post entry: ' + JSON.stringify(err.response?.data ?? err.message));
    }
  };

  const dlOpts = useMemo((): DownloadOpts | null => {
    if (!data?.rows?.length) return null;
    return {
      title: `Day Book (${date})`,
      columns: [
        { header: 'Voucher #', key: 'voucher_no' },
        { header: 'Account', key: 'account' },
        { header: 'Narration', key: 'narration' },
        { header: 'Debit', key: 'debit', align: 'right' },
        { header: 'Credit', key: 'credit', align: 'right' },
      ],
      rows: data.rows.map((r: Row) => ({
        voucher_no: r.voucher_no,
        account: r.account,
        narration: r.narration,
        debit: Number(r.debit) ? formatINR(r.debit) : '',
        credit: Number(r.credit) ? formatINR(r.credit) : '',
      })),
    };
  }, [data, date]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Day Book" 
        subtitle="All journal entries for a single day." 
        action={
          <div className="flex gap-2">
            <button 
              className="btn-ghost flex items-center gap-1.5"
              onClick={() => setFormOpen(prev => !prev)}
            >
              {formOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Quick Entry
            </button>
            <DownloadMenu opts={dlOpts} />
          </div>
        } 
      />

      {/* Quick Entry Form */}
      {formOpen && (
        <form onSubmit={handleQuickSubmit} className="card bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Plus size={16} className="text-brand-500" /> Quick Add Transaction
            </h3>
            <span className="text-xs font-mono text-slate-400">Voucher: {voucherNo}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="label flex items-center gap-1">
                Narration / Description
                {suggestLoading && <Sparkles size={12} className="animate-pulse text-brand-400" />}
              </label>
              <input
                className="input text-xs"
                value={quickNarration}
                onChange={(e) => handleNarrationChange(e.target.value)}
                placeholder="e.g. Sold consulting service to Acme or paid office internet bill"
                required
              />
              {suggestions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400">AI suggestion:</span>
                  {suggestions.map((s) => {
                    const confColor = s.confidence === 'high' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : s.confidence === 'medium' ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100';
                    return (
                      <button
                        type="button"
                        key={s.account_id}
                        onClick={() => setPrimaryAcc(s.account_id)}
                        title={s.reasoning}
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${confColor}`}
                      >
                        {s.code} — {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="md:col-span-3">
              <label className="label">Amount ({getDisplayCurrency()})</label>
              <input
                className="input text-xs text-right font-medium"
                type="number"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="md:col-span-3">
              <label className="label">Primary Account Action</label>
              <select 
                className="input text-xs" 
                value={dir} 
                onChange={(e) => setDir(e.target.value as 'debit' | 'credit')}
              >
                <option value="debit">Debit Account</option>
                <option value="credit">Credit Account</option>
              </select>
            </div>

            <div className="md:col-span-6">
              <label className="label">Primary Account *</label>
              <select 
                className="input text-xs" 
                value={primaryAcc ?? ''} 
                onChange={(e) => setPrimaryAcc(Number(e.target.value) || undefined)}
                required
              >
                <option value="">— select —</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.type})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6">
              <label className="label flex items-center justify-between">
                <span>Offset Account (Double Entry)</span>
                <span className="text-[10px] text-brand-500 font-normal">Leave blank for Uncategorized (Suspense)</span>
              </label>
              <select 
                className="input text-xs" 
                value={offsetAcc ?? ''} 
                onChange={(e) => setOffsetAcc(Number(e.target.value) || undefined)}
              >
                <option value="">— Uncategorized / Suspense —</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" className="btn-ghost text-xs" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary text-xs" disabled={createJE.isPending}>
              {createJE.isPending ? 'Posting...' : 'Post Transaction'}
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-4 items-center">
        <div>
          <label className="label">Date</label>
          <input className="input w-fit text-xs" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <SimpleTable<Row>
        rows={data?.rows} loading={isLoading} keyField={'voucher_no' as keyof Row}
        columns={[
          { key: 'voucher_no', label: 'Voucher #', render: (r) => <span className="font-mono text-xs text-brand-600 font-semibold">{r.voucher_no}</span> },
          { key: 'account', label: 'Account' },
          { key: 'narration', label: 'Narration', className: 'text-xs text-slate-500 font-normal' },
          { key: 'debit', label: 'Debit', align: 'right', render: (r) => Number(r.debit) ? formatINR(r.debit) : '—' },
          { key: 'credit', label: 'Credit', align: 'right', render: (r) => Number(r.credit) ? formatINR(r.credit) : '—' },
        ]}
      />
    </div>
  );
}
