import { useState } from 'react';
import { Upload, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';

interface BA { id: number; name: string; bank_name: string; }
interface Stmt { id: number; bank_account: number; period_start: string; period_end: string; opening_balance: string; closing_balance: string; source: string; }
interface Line { id: number; statement: number; date: string; description: string; reference: string; debit: string; credit: string; balance: string; status: string; }

export default function ReconciliationPage() {
  const { companyId } = useActiveCompany();
  const [bankId, setBankId] = useState<number | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const qc = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ['bank-accounts', companyId], enabled: companyId != null,
    queryFn: async () => (await api.get('/banking/bank-accounts/', { params: { company: companyId } })).data.results as BA[],
  });

  const { data: stmts } = useQuery({
    queryKey: ['statements', bankId], enabled: bankId != null,
    queryFn: async () => (await api.get('/banking/statements/', { params: { bank_account: bankId } })).data.results as Stmt[],
  });

  const stmtIds = stmts?.map((s) => s.id) ?? [];
  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ['stmt-lines', stmtIds.join(',')], enabled: stmtIds.length > 0,
    queryFn: async () => {
      const all: Line[] = [];
      for (const sid of stmtIds) {
        const r = await api.get('/banking/statement-lines/', { params: { statement: sid, page_size: 500 } });
        all.push(...r.data.results);
      }
      return all;
    },
  });

  const reconcile = useMutation({
    mutationFn: async () => (await api.post(`/banking/bank-accounts/${bankId}/reconcile/`)).data,
    onSuccess: (r: any) => {
      toast.success(`Auto-matched ${r.matched} line(s)`, `${r.total_unmatched} still unmatched`);
      qc.invalidateQueries({ queryKey: ['stmt-lines'] });
    },
    onError: (e: any) => toast.error('Reconcile failed', JSON.stringify(e?.response?.data ?? 'Failed')),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Reconciliation"
        subtitle="Match imported statement lines against ledger entries."
        action={
          <div className="flex gap-2">
            <button className="btn-ghost border border-slate-200" disabled={!bankId || reconcile.isPending}
              onClick={() => reconcile.mutate()}>
              <Zap size={14} className="mr-1" /> {reconcile.isPending ? 'Matching…' : 'Auto-match'}
            </button>
            <button className="btn-primary" disabled={!bankId} onClick={() => setImportOpen(true)}>
              <Upload size={14} className="mr-1" /> Import Statement (CSV)
            </button>
          </div>
        }
      />
      <PageHint storageKey="reconcile">
        Upload a CSV with columns <code>date, description, reference, debit, credit, balance</code>. Auto-match looks for entries on the bank's GL account with matching amount within ±2 days.
      </PageHint>

      <div className="flex gap-4">
        <div className="w-72">
          <label className="label">Bank Account</label>
          <select className="input" value={bankId ?? ''} onChange={(e) => setBankId(Number(e.target.value) || undefined)}>
            <option value="">— select —</option>
            {accounts?.map((b) => (<option key={b.id} value={b.id}>{b.name} ({b.bank_name})</option>))}
          </select>
        </div>
      </div>

      {bankId && (
        <SimpleTable<Line>
          rows={lines} loading={linesLoading}
          emptyTitle="No statement lines"
          emptyDescription="Import a statement CSV to start reconciling."
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'description', label: 'Description', className: 'text-xs' },
            { key: 'reference', label: 'Ref', render: (r) => <span className="font-mono text-xs">{r.reference || '—'}</span> },
            { key: 'debit', label: 'Debit', align: 'right', render: (r) => Number(r.debit) ? <span className="text-red-600 tabular-nums">{formatINR(r.debit)}</span> : '—' },
            { key: 'credit', label: 'Credit', align: 'right', render: (r) => Number(r.credit) ? <span className="text-emerald-700 tabular-nums">{formatINR(r.credit)}</span> : '—' },
            { key: 'balance', label: 'Balance', align: 'right', render: (r) => formatINR(r.balance) },
            { key: 'status', label: 'Status', render: (r) => (
                <span className={`rounded px-2 py-0.5 text-xs ${
                  r.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700'
                    : r.status === 'IGNORED' ? 'bg-slate-100 text-slate-500'
                    : 'bg-amber-100 text-amber-700'
                }`}>{r.status}</span>
            )},
          ]}
        />
      )}

      <ImportStatementModal open={importOpen} onClose={() => setImportOpen(false)} bankId={bankId} />
    </div>
  );
}

function ImportStatementModal({ open, onClose, bankId }: { open: boolean; onClose: () => void; bankId?: number }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [opening, setOpening] = useState('0');
  const [closing, setClosing] = useState('0');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!file || !bankId || !periodStart || !periodEnd) { setErr('All fields required'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('bank_account', String(bankId));
      fd.append('file', file);
      fd.append('period_start', periodStart);
      fd.append('period_end', periodEnd);
      fd.append('opening', opening);
      fd.append('closing', closing);
      const r = await api.post('/banking/statements/import/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Statement imported', `${r.data.lines?.length ?? 0} lines`);
      qc.invalidateQueries({ queryKey: ['statements'] });
      qc.invalidateQueries({ queryKey: ['stmt-lines'] });
      onClose();
    } catch (e: any) {
      setErr(JSON.stringify(e?.response?.data ?? 'Failed'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import Bank Statement (CSV)" size="md">
      <div className="space-y-4">
        <div><label className="label">CSV File *</label>
          <input className="input" type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="mt-1 text-xs text-slate-500">Columns: date, description, reference, debit, credit, balance</div></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Period From *</label>
            <input className="input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
          <div><label className="label">Period To *</label>
            <input className="input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
          <div><label className="label">Opening Balance</label>
            <input className="input text-right tabular-nums" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} /></div>
          <div><label className="label">Closing Balance</label>
            <input className="input text-right tabular-nums" inputMode="decimal" value={closing} onChange={(e) => setClosing(e.target.value)} /></div>
        </div>
        {err && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy || !file} onClick={submit}>
            {busy ? 'Uploading…' : 'Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
