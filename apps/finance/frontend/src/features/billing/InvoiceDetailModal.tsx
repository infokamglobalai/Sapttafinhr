import { useState } from 'react';
import { Download, FileSignature, Link as LinkIcon, Printer, Receipt as ReceiptIcon, Truck } from 'lucide-react';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useParties } from '@/features/masters/api';
import {
  useCreatePaymentLink,
  useGenerateEInvoice,
  useGenerateGccEInvoice,
  useGenerateEWayBill,
  useInvoice,
  useTaxComplianceModes,
} from './api';
import { downloadInvoicePdf } from '@/lib/pdf';
import { printBilingualInvoice } from '@/lib/invoicePrint';
import { formatMoney } from '@/lib/money';

interface Props {
  id: number | null;
  onClose: () => void;
  onRecordPayment?: (invoiceId: number, customerId: number) => void;
}

export default function InvoiceDetailModal({ id, onClose, onRecordPayment }: Props) {
  const { data: inv, isLoading } = useInvoice(id ?? undefined);
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const { data: customers } = useParties(companyId);
  const customer = customers?.find((c) => c.id === inv?.customer);

  const eInvoice = useGenerateEInvoice();
  const gccEInvoice = useGenerateGccEInvoice();
  const payLink = useCreatePaymentLink();
  const { data: taxModes } = useTaxComplianceModes();
  const isVat = company?.tax_regime === 'GCC_VAT';
  // Amounts are stored in the invoice's own transaction currency, so format with
  // that — falling back to the company base only until the invoice has loaded.
  const ccy = inv?.currency || company?.base_currency || 'INR';
  const m = (v: string | number) => formatMoney(v, ccy);

  const open = id != null;
  const [eWayOpen, setEWayOpen] = useState(false);

  const onDownload = () => {
    if (!inv || !company) return;
    downloadInvoicePdf(inv, {
      name: company.name, legal_name: company.legal_name, gstin: company.gstin,
      state_code: company.state_code, base_currency: company.base_currency,
      tax_regime: company.tax_regime, tax_id: company.tax_id,
    }, customer ? {
      name: customer.name, gstin: customer.gstin, billing_address: customer.billing_address,
      state_code: customer.state_code, email: customer.email,
    } : { name: inv.customer_name });
    toast.success('Invoice PDF downloaded', `${inv.invoice_no}.pdf`);
  };

  const onEInvoice = async () => {
    if (!inv) return;
    try {
      const res = await eInvoice.mutateAsync(inv.id);
      toast.success('E-Invoice generated', `IRN: ${String(res.irn).slice(0, 24)}…`);
    } catch (e: any) {
      toast.error('Could not generate E-Invoice', JSON.stringify(e?.response?.data ?? 'Failed'));
    }
  };

  const onPrintBilingual = () => {
    if (!inv || !company) return;
    const ok = printBilingualInvoice(inv, {
      name: company.name, legal_name: company.legal_name,
      tax_id: company.tax_id, base_currency: company.base_currency,
    }, customer
      ? { name: customer.name, gstin: customer.gstin, billing_address: customer.billing_address }
      : { name: inv.customer_name });
    if (!ok) toast.error('Popup blocked', 'Allow popups for this site to print the invoice.');
  };

  const onGccEInvoice = async () => {
    if (!inv) return;
    try {
      const res = await gccEInvoice.mutateAsync(inv.id);
      toast.success('E-invoice generated', `${res.scheme} · ${res.status} · ${String(res.uuid).slice(0, 8)}…`);
    } catch (e: any) {
      toast.error('Could not generate e-invoice', JSON.stringify(e?.response?.data ?? 'Failed'));
    }
  };

  const onPaymentLink = async () => {
    if (!inv) return;
    try {
      const r = await payLink.mutateAsync({ invoice_id: inv.id, amount: inv.balance_due, description: `Inv ${inv.invoice_no}` });
      try { await navigator.clipboard.writeText(r.short_url); } catch { /* ignored */ }
      toast.success('Payment link created', `${r.short_url} — copied to clipboard`);
    } catch (e: any) {
      toast.error('Could not create link', JSON.stringify(e?.response?.data ?? 'Failed'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={inv ? `Invoice ${inv.invoice_no}` : 'Invoice'} size="xl">
      {isLoading && <div className="py-8 text-center text-slate-500">Loading…</div>}
      {inv && (
        <div className="space-y-4 text-sm">
          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary inline-flex items-center gap-1" onClick={onDownload}>
              <Download size={14} /> Download PDF
            </button>
            {isVat && (
              <button className="btn-ghost inline-flex items-center gap-1 border border-slate-200" onClick={onPrintBilingual}>
                <Printer size={14} /> Print (AR / EN)
              </button>
            )}
            {Number(inv.balance_due) > 0 && onRecordPayment && (
              <button className="btn-ghost inline-flex items-center gap-1 border border-slate-200"
                onClick={() => { onRecordPayment(inv.id, inv.customer); onClose(); }}>
                <ReceiptIcon size={14} /> Record Payment
              </button>
            )}
            {isVat ? (
              <button className="btn-ghost inline-flex items-center gap-1 border border-slate-200" onClick={onGccEInvoice} disabled={gccEInvoice.isPending}>
                <FileSignature size={14} /> {gccEInvoice.isPending ? 'Generating…' : 'Generate E-Invoice (ZATCA / Peppol)'}
              </button>
            ) : (
              <>
                {taxModes && (
                  <span className={`rounded px-2 py-1 text-xs font-medium ${
                    taxModes.einvoice_mode === 'LIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    E-Invoice: {taxModes.einvoice_mode}
                    {taxModes.einvoice_mode === 'LIVE' && !taxModes.live_ready.einvoice ? ' (misconfigured)' : ''}
                  </span>
                )}
                <button className="btn-ghost inline-flex items-center gap-1 border border-slate-200" onClick={onEInvoice} disabled={eInvoice.isPending}>
                  <FileSignature size={14} /> {eInvoice.isPending ? 'Generating…' : 'Generate E-Invoice'}
                </button>
                <button className="btn-ghost inline-flex items-center gap-1 border border-slate-200" onClick={() => setEWayOpen(true)}>
                  <Truck size={14} /> Generate E-Way Bill
                </button>
              </>
            )}
            <button className="btn-ghost inline-flex items-center gap-1 border border-slate-200" onClick={onPaymentLink} disabled={payLink.isPending}>
              <LinkIcon size={14} /> {payLink.isPending ? 'Creating…' : 'Payment Link'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Customer" value={inv.customer_name} />
            <Field label="Date" value={inv.date} />
            <Field label="Due" value={inv.due_date ?? '—'} />
            <Field label="Status" value={inv.status} />
            {!isVat && <Field label="Place of supply" value={inv.place_of_supply} />}
            <Field label="Journal Entry" value={inv.journal_entry ? `#${inv.journal_entry}` : '—'} />
          </div>

          <div className="overflow-hidden rounded border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Description</th>
                  {!isVat && <th className="px-3 py-2">HSN</th>}
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Taxable</th>
                  {isVat ? (
                    <th className="px-3 py-2 text-right">VAT</th>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-right">CGST</th>
                      <th className="px-3 py-2 text-right">SGST</th>
                      <th className="px-3 py-2 text-right">IGST</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inv.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.description}</td>
                    {!isVat && <td className="px-3 py-2 font-mono">{l.hsn_code || '—'}</td>}
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m(l.unit_price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m(l.taxable_amount)}</td>
                    {isVat ? (
                      <td className="px-3 py-2 text-right tabular-nums">{Number(l.vat) ? m(l.vat) : '—'}</td>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums">{m(l.cgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{m(l.sgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{m(l.igst)}</td>
                      </>
                    )}
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{m(l.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-72 space-y-1 rounded bg-slate-50 p-3 text-sm">
            <Row label="Taxable" value={inv.taxable_amount} ccy={ccy} />
            {isVat ? (
              Number(inv.vat) ? <Row label="VAT" value={inv.vat} ccy={ccy} muted /> : null
            ) : (
              <>
                <Row label="CGST" value={inv.cgst} ccy={ccy} muted />
                <Row label="SGST" value={inv.sgst} ccy={ccy} muted />
                <Row label="IGST" value={inv.igst} ccy={ccy} muted />
              </>
            )}
            <div className="border-t border-slate-200 pt-1"><Row label="Grand Total" value={inv.grand_total} ccy={ccy} bold /></div>
            <Row label="Paid" value={inv.amount_paid} ccy={ccy} muted />
            <Row label="Balance Due" value={inv.balance_due} ccy={ccy} />
          </div>

          {inv.notes && <div className="text-xs text-slate-500"><strong>Notes:</strong> {inv.notes}</div>}
        </div>
      )}

      {eWayOpen && inv && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setEWayOpen(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold">Generate E-Way Bill</div>
            <EWayForm invoiceId={inv.id} onDone={() => setEWayOpen(false)} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function EWayForm({ invoiceId, onDone }: { invoiceId: number; onDone: () => void }) {
  const eWay = useGenerateEWayBill();
  const [distance, setDistance] = useState('100');
  const [vehicle, setVehicle] = useState('');
  const [transporter, setTransporter] = useState('');
  const submit = async () => {
    try {
      const r = await eWay.mutateAsync({
        invoiceId, distance_km: Number(distance), vehicle_no: vehicle, transporter_name: transporter,
      });
      toast.success('E-Way Bill generated',
        `EWB ${r.eway_no} · valid until ${new Date(r.valid_until).toLocaleDateString('en-IN')}`);
      onDone();
    } catch (e: any) {
      toast.error('Could not generate', JSON.stringify(e?.response?.data ?? 'Failed'));
    }
  };
  return (
    <div className="mt-3 space-y-3">
      <div><label className="label">Distance (km) *</label>
        <input className="input" inputMode="numeric" value={distance} onChange={(e) => setDistance(e.target.value)} /></div>
      <div><label className="label">Vehicle No.</label>
        <input className="input font-mono" value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} placeholder="e.g. MH12AB1234" /></div>
      <div><label className="label">Transporter</label>
        <input className="input" value={transporter} onChange={(e) => setTransporter(e.target.value)} /></div>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={!distance || eWay.isPending} onClick={submit}>
          {eWay.isPending ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Row({ label, value, ccy = 'INR', bold, muted }: { label: string; value: string; ccy?: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-slate-500' : ''}`}>
      <div className={bold ? 'font-semibold' : ''}>{label}</div>
      <div className={`tabular-nums ${bold ? 'font-semibold' : ''}`}>{formatMoney(value, ccy)}</div>
    </div>
  );
}
