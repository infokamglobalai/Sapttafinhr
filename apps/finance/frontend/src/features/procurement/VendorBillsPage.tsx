import { useState } from 'react';
import { Plus, ReceiptText, ScanLine } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useVendorBills, type VendorBill } from './api';
import { api } from '@/lib/api';
import { formatINR, formatMoney } from '@/lib/money';
import VendorBillCreateModal, { type BillPrefill } from './VendorBillCreateModal';

export default function VendorBillsPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading } = useVendorBills(companyId);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<VendorBill | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [prefill, setPrefill] = useState<BillPrefill | undefined>(undefined);

  function handleUseScan(p: BillPrefill) {
    setPrefill(p);
    setScanOpen(false);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Vendor Bills" subtitle="Bills you've received. Posting deducts TDS and claims GST input."
        action={
          <div className="flex gap-2">
            <button
              className="btn-ghost border border-slate-200 text-sm"
              onClick={() => setScanOpen(true)}
              title="Upload a vendor bill image or PDF — AI extracts the data for you"
            >
              <ScanLine size={14} className="mr-1" /> Scan Bill (AI)
            </button>
            <button className="btn-primary" onClick={() => { setPrefill(undefined); setOpen(true); }}>
              <Plus size={16} className="mr-1" /> New Vendor Bill
            </button>
          </div>
        }
      />
      <PageHint storageKey="vendor-bills">
        Each line picks its own expense account and TDS rate. We post: Dr expense + Dr GST input, Cr TDS payable, Cr Accounts Payable.
        Use <strong>Scan Bill (AI)</strong> to upload a PDF or photo — AI extracts the details automatically.
      </PageHint>
      <div className="card overflow-hidden p-0">
        {!isLoading && data?.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No vendor bills yet"
            description="When a vendor sends you a bill, record it here. We'll handle GST input, TDS deduction, and the journal entry automatically."
            actionLabel="Record your first bill"
            onAction={() => setOpen(true)}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Bill #</th><th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
              {data?.map((b) => {
                const gst = Number(b.cgst) + Number(b.sgst) + Number(b.igst);
                const m = (v: string | number) => formatMoney(v, b.currency || 'INR');
                return (
                  <tr key={b.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(b)}>
                    <td className="px-4 py-2 font-medium text-brand-600">{b.bill_no}</td>
                    <td className="px-4 py-2 text-slate-500">{b.date}</td>
                    <td className="px-4 py-2">{b.vendor_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m(b.taxable_amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{m(gst)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{Number(b.tds_amount) ? m(b.tds_amount) : '—'}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{m(b.grand_total)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-amber-700">{Number(b.balance_due) > 0 ? m(b.balance_due) : '—'}</td>
                    <td className="px-4 py-2 text-xs"><span className={`rounded px-2 py-0.5 ${b.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{b.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <VendorBillCreateModal open={open} onClose={() => setOpen(false)} prefill={prefill} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing ? `Vendor Bill ${viewing.bill_no}` : ''}
        subtitle={viewing ? `${viewing.vendor_name} · ${viewing.status}` : ''}
        size="xl"
        sections={viewing ? [
          { title: 'Header',
            fields: [
              f('Bill #', viewing.bill_no, { mono: true }),
              f('Date', viewing.date),
              f('Vendor', viewing.vendor_name),
              f('Status', viewing.status),
              f('Journal Entry', viewing.journal_entry ? `#${viewing.journal_entry}` : null, { mono: true }),
            ],
          },
          { title: 'Amounts',
            fields: [
              f('Taxable', formatMoney(viewing.taxable_amount, viewing.currency || 'INR')),
              f('CGST', Number(viewing.cgst) ? formatMoney(viewing.cgst, viewing.currency || 'INR') : null),
              f('SGST', Number(viewing.sgst) ? formatMoney(viewing.sgst, viewing.currency || 'INR') : null),
              f('IGST', Number(viewing.igst) ? formatMoney(viewing.igst, viewing.currency || 'INR') : null),
              f('TDS Deducted', Number(viewing.tds_amount) ? formatMoney(viewing.tds_amount, viewing.currency || 'INR') : null),
              f('Grand Total', formatMoney(viewing.grand_total, viewing.currency || 'INR')),
              f('Amount Paid', formatMoney(viewing.amount_paid, viewing.currency || 'INR')),
              f('Balance Due', formatMoney(viewing.balance_due, viewing.currency || 'INR')),
            ],
          },
        ] : []}
        nestedTables={viewing ? [{
          title: 'Line items',
          rows: viewing.lines,
          columns: [
            { key: 'description', label: 'Description' },
            { key: 'expense_account_code', label: 'Expense A/C', mono: true },
            { key: 'hsn_code', label: 'HSN', mono: true },
            { key: 'quantity', label: 'Qty', align: 'right' },
            { key: 'unit_price', label: 'Rate', align: 'right', render: (r: any) => formatMoney(r.unit_price, viewing.currency || 'INR') },
            { key: 'tax_rate', label: 'GST%', align: 'right' },
            { key: 'tds_rate', label: 'TDS%', align: 'right' },
            { key: 'taxable_amount', label: 'Taxable', align: 'right', render: (r: any) => formatMoney(r.taxable_amount, viewing.currency || 'INR') },
            { key: 'line_total', label: 'Total', align: 'right', render: (r: any) => formatMoney(r.line_total, viewing.currency || 'INR') },
          ],
        }] : []}
      />

      <BillScanModal open={scanOpen} onClose={() => setScanOpen(false)} onUseData={handleUseScan} />
    </div>
  );
}

/* ─── Bill Scan Modal ─────────────────────────────────────────────────────── */
interface ScannedBill {
  vendor_name?: string;
  vendor_gstin?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string | null;
  place_of_supply?: string;
  line_items?: { description: string; hsn_code: string; quantity: number; unit_price: number; tax_rate: number; amount: number }[];
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total?: number;
  notes?: string;
  _confidence?: string;
}

function BillScanModal({
  open,
  onClose,
  onUseData,
}: {
  open: boolean;
  onClose: () => void;
  onUseData: (prefill: BillPrefill) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScannedBill | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    setErr(null);
  }

  async function scan() {
    if (!file) return;
    setScanning(true);
    setErr(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post<ScannedBill>('/procurement/bills/scan/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(r.data);
    } catch (e: any) {
      setErr(JSON.stringify(e?.response?.data ?? 'Scan failed. Please try again.'));
    } finally {
      setScanning(false);
    }
  }

  function useData() {
    if (!result) return;
    onUseData({
      billNo: result.invoice_number || '',
      date: result.invoice_date || '',
      dueDate: result.due_date || '',
      placeOfSupply: result.place_of_supply || '',
      notes: result.notes || '',
      lines: (result.line_items || []).map((l) => ({
        description: l.description || '',
        hsn_code: l.hsn_code || '',
        quantity: String(l.quantity ?? 1),
        unit_price: String(l.unit_price ?? 0),
        tax_rate: String(l.tax_rate ?? 18),
      })),
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="📷 Scan Vendor Bill (AI OCR)"
      size="lg"
    >
      <div className="space-y-4">
        {!result && (
          <>
            <p className="text-sm text-slate-500">
              Upload a vendor invoice (PDF or image). AI will extract vendor name, invoice number, dates, line items, and GST amounts to pre-fill the bill form.
            </p>
            <div>
              <label className="label">Bill file (PDF or image) *</label>
              <input
                className="input"
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(null); }}
              />
            </div>
            {err && <div className="rounded bg-red-50 p-3 text-xs text-red-700">{err}</div>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => { reset(); onClose(); }}>Cancel</button>
              <button className="btn-primary" disabled={!file || scanning} onClick={scan}>
                {scanning ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Extracting…
                  </span>
                ) : 'Extract with AI'}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              ✓ Extraction complete — review the data below, then click "Use This Data" to pre-fill the bill form.
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {result.vendor_name && (
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Vendor</div>
                  <div className="font-medium">{result.vendor_name}</div>
                  {result.vendor_gstin && <div className="text-xs text-slate-500 font-mono mt-0.5">{result.vendor_gstin}</div>}
                </div>
              )}
              {result.invoice_number && (
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Invoice #</div>
                  <div className="font-medium font-mono">{result.invoice_number}</div>
                </div>
              )}
              {result.invoice_date && (
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Invoice Date</div>
                  <div>{result.invoice_date}</div>
                </div>
              )}
              {result.due_date && (
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Due Date</div>
                  <div>{result.due_date}</div>
                </div>
              )}
            </div>

            {result.line_items && result.line_items.length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Line Items</div>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">HSN</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">GST%</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.line_items.map((l, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5">{l.description}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{l.hsn_code || '—'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{l.quantity}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(l.unit_price)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{l.tax_rate}%</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              {[
                { label: 'Subtotal', v: result.subtotal },
                { label: 'CGST', v: result.cgst },
                { label: 'SGST', v: result.sgst },
                { label: 'IGST', v: result.igst },
              ].map(({ label, v }) => v != null && Number(v) > 0 ? (
                <div key={label} className="rounded-md bg-slate-50 p-2">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="font-medium tabular-nums">{formatINR(v)}</div>
                </div>
              ) : null)}
              {result.total != null && (
                <div className="rounded-md bg-slate-100 p-2 col-span-4 md:col-span-1">
                  <div className="text-xs text-slate-500 font-medium">Total</div>
                  <div className="font-bold tabular-nums">{formatINR(result.total)}</div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2">
              <button className="btn-ghost text-sm" onClick={() => { reset(); }}>
                ← Scan another
              </button>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => { reset(); onClose(); }}>Cancel</button>
                <button className="btn-primary" onClick={useData}>
                  Use This Data →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
