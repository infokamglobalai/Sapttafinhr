import { useRef, useState } from 'react';
import { CheckCircle2, CopyCheck, Download, FileSpreadsheet, Scale, Upload, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { formatINR } from '@/lib/money';
import {
  downloadImportTemplate,
  downloadOpeningTemplate,
  useImportMasters,
  useImportOpeningBalances,
  type ImportEntity,
  type ImportReport,
  type OpeningBalanceReport,
} from './api';

type Mode = ImportEntity | 'opening-balance';
type AnyReport = ImportReport | OpeningBalanceReport;

const MODE_OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: 'party', label: 'Customers & Vendors', hint: 'name, kind, GSTIN, email, phone, bank details…' },
  { value: 'account', label: 'Chart of Accounts', hint: 'code, name, type, parent_code, is_postable…' },
  { value: 'item', label: 'Items', hint: 'sku, name, kind, hsn_code, unit, sale_price, tax_rate…' },
  { value: 'opening-balance', label: 'Opening Balances', hint: 'account_code, debit, credit, description' },
];

function isOpening(r: AnyReport): r is OpeningBalanceReport {
  return (r as OpeningBalanceReport).kind === 'opening-balances';
}

export default function ImportPage() {
  const { companyId } = useActiveCompany();
  const masters = useImportMasters();
  const openings = useImportOpeningBalances();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('party');
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<AnyReport | null>(null);
  const [busy, setBusy] = useState<false | 'preview' | 'commit'>(false);

  const reset = () => {
    setFile(null);
    setReport(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const pickMode = (m: Mode) => {
    if (m !== mode) {
      setMode(m);
      reset();
    }
  };

  const downloadTemplate = () =>
    mode === 'opening-balance' ? downloadOpeningTemplate() : downloadImportTemplate(mode);

  const run = async (commit: boolean) => {
    if (!companyId) {
      toast.error('No active company selected');
      return;
    }
    if (!file) {
      toast.error('Choose a CSV file first');
      return;
    }
    setBusy(commit ? 'commit' : 'preview');
    try {
      const res: AnyReport =
        mode === 'opening-balance'
          ? await openings.mutateAsync({ company: companyId, file, commit })
          : await masters.mutateAsync({ entity: mode, company: companyId, file, commit });
      setReport(res);
      if (commit) {
        if (isOpening(res)) {
          if (res.posted_voucher) toast.success(`Opening entry posted (${res.posted_voucher})`);
          else toast.error('Could not post', res.error ?? 'Fix the issues and retry');
        } else {
          toast.success(
            `Imported ${res.created} ${res.label.toLowerCase()}`,
            res.errors || res.duplicates ? `${res.errors} error(s) · ${res.duplicates} duplicate(s) skipped` : undefined,
          );
        }
      }
    } catch (e: any) {
      toast.error('Import failed', JSON.stringify(e?.response?.data ?? 'Please try again'));
    } finally {
      setBusy(false);
    }
  };

  const hint = MODE_OPTIONS.find((o) => o.value === mode)!.hint;

  const canCommit =
    !!report &&
    !report.commit &&
    (isOpening(report) ? report.balanced : report.ok > 0);

  const commitLabel = mode === 'opening-balance' ? 'Post opening entry' : report && !isOpening(report) ? `Import ${report.ok} ${report.ok === 1 ? 'row' : 'rows'}` : 'Import';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        subtitle="Bring your customers, vendors, accounts, items and opening balances in from a CSV — preview before you commit."
      />

      {/* Step 1 — choose what + grab the template */}
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">1. What are you importing?</span>
          <div className="flex flex-wrap gap-2">
            {MODE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => pickMode(o.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  mode === o.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">Columns: {hint}</p>
        {mode === 'opening-balance' && (
          <p className="text-xs text-slate-500">
            Paste your closing trial balance. Total debits must equal total credits; on commit we post a single
            opening journal entry dated at the start of your active fiscal year.
          </p>
        )}
        <button className="btn-ghost border border-slate-200 text-sm" onClick={downloadTemplate}>
          <Download size={15} className="mr-1.5" /> Download CSV template
        </button>
      </div>

      {/* Step 2 — upload + preview + commit */}
      <div className="card space-y-4 p-5">
        <span className="text-sm font-medium text-slate-700">2. Upload your file</span>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setReport(null);
            }}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-slate-50"
          />
          <button
            className="btn-ghost border border-slate-200 text-sm"
            disabled={!file || busy !== false}
            onClick={() => run(false)}
          >
            <FileSpreadsheet size={15} className="mr-1.5" />
            {busy === 'preview' ? 'Checking…' : 'Preview (dry-run)'}
          </button>
          {canCommit && (
            <button className="btn-primary text-sm" disabled={busy !== false} onClick={() => run(true)}>
              <Upload size={15} className="mr-1.5" />
              {busy === 'commit' ? 'Saving…' : commitLabel}
            </button>
          )}
        </div>

        {report && (isOpening(report) ? <OpeningReportView report={report} /> : <ReportView report={report} />)}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label, tone }: { icon: LucideIcon; value: React.ReactNode; label: string; tone: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tone}`}>
      <Icon size={16} /> <strong className="tabular-nums">{value}</strong> <span className="text-xs">{label}</span>
    </div>
  );
}

function RowTable({ rows }: { rows: { row: number; status: string; messages: string[]; label: string }[] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="w-14 px-3 py-2">Row</th>
            <th className="px-3 py-2">Name</th>
            <th className="w-24 px-3 py-2">Status</th>
            <th className="px-3 py-2">Messages</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.row} className={r.status === 'error' ? 'bg-red-50/40' : r.status === 'duplicate' ? 'bg-amber-50/40' : ''}>
              <td className="px-3 py-1.5 tabular-nums text-slate-500">{r.row}</td>
              <td className="px-3 py-1.5 font-medium">{r.label || '—'}</td>
              <td className="px-3 py-1.5">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    r.status === 'ok'
                      ? 'bg-emerald-100 text-emerald-700'
                      : r.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-1.5 text-xs text-slate-600">{r.messages.join('; ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportView({ report }: { report: ImportReport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Stat icon={CheckCircle2} value={report.ok} label="ready" tone="bg-emerald-50 text-emerald-700" />
        <Stat icon={XCircle} value={report.errors} label="errors" tone="bg-red-50 text-red-700" />
        <Stat icon={CopyCheck} value={report.duplicates} label="duplicates" tone="bg-amber-50 text-amber-700" />
        {report.commit && <Stat icon={Upload} value={report.created} label="created" tone="bg-brand-50 text-brand-700" />}
      </div>
      <p className="text-xs text-slate-500">
        {report.commit
          ? `Done — ${report.created} created, ${report.duplicates} duplicate(s) and ${report.errors} error(s) skipped.`
          : report.ok > 0
            ? `Dry-run — nothing saved yet. Click “Import ${report.ok} ${report.ok === 1 ? 'row' : 'rows'}” to commit the ready rows.`
            : 'Dry-run — nothing saved. Fix the errors below and re-upload.'}
      </p>
      <RowTable rows={report.rows} />
    </div>
  );
}

function OpeningReportView({ report }: { report: OpeningBalanceReport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Stat icon={Upload} value={`₹${formatINR(report.total_debit)}`} label="total debit" tone="bg-slate-50 text-slate-700" />
        <Stat icon={Download} value={`₹${formatINR(report.total_credit)}`} label="total credit" tone="bg-slate-50 text-slate-700" />
        <Stat
          icon={Scale}
          value={report.balanced ? 'Balanced' : `Off by ₹${formatINR(report.difference)}`}
          label={report.balanced ? '' : 'fix to post'}
          tone={report.balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}
        />
        <Stat icon={XCircle} value={report.errors} label="errors" tone="bg-red-50 text-red-700" />
      </div>
      {report.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{report.error}</p>}
      <p className="text-xs text-slate-500">
        {report.posted_voucher
          ? `Posted opening entry ${report.posted_voucher} for FY ${report.fiscal_year}.`
          : report.balanced
            ? `Dry-run — balanced and ready. Click “Post opening entry” to create the FY ${report.fiscal_year} opening journal entry.`
            : 'Dry-run — the trial balance must balance (and have no row errors) before it can be posted.'}
      </p>
      <RowTable rows={report.rows} />
    </div>
  );
}
