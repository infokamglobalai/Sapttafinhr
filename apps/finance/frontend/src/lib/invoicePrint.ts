/**
 * Bilingual (Arabic + English) tax invoice via the browser's print-to-PDF.
 *
 * Unlike the jsPDF download (lib/pdf.ts), this renders HTML so the browser does
 * the Arabic glyph shaping + RTL layout natively — the correct way to produce a
 * GCC-compliant bilingual tax invoice without embedding an Arabic font.
 */
import type { Invoice } from '@/features/billing/api';

export interface PrintCompany {
  name: string;
  legal_name?: string;
  tax_id?: string;
  base_currency?: string;
  // Branding (set in setup / settings)
  logo?: string;            // base64 data URL
  document_header?: string; // tagline under the company name
  document_footer?: string; // footer note
  brand_color?: string;     // accent hex
}

/** A safe #rrggbb accent, falling back to the default slate when unset/invalid. */
function brandColor(hex?: string): string {
  return hex && /^#[0-9a-f]{6}$/i.test(hex.trim()) ? hex.trim() : '#0f172a';
}

export interface PrintCustomer {
  name: string;
  gstin?: string; // holds the TRN for GCC parties
  billing_address?: string;
}

// English / Arabic label pairs.
const L = {
  taxInvoice: ['Tax Invoice', 'فاتورة ضريبية'],
  trn: ['TRN', 'الرقم الضريبي'],
  invoiceNo: ['Invoice No', 'رقم الفاتورة'],
  date: ['Date', 'التاريخ'],
  due: ['Due Date', 'تاريخ الاستحقاق'],
  billTo: ['Bill To', 'فاتورة إلى'],
  description: ['Description', 'الوصف'],
  qty: ['Qty', 'الكمية'],
  rate: ['Rate', 'السعر'],
  taxable: ['Taxable', 'الخاضع للضريبة'],
  vat: ['VAT', 'ضريبة القيمة المضافة'],
  total: ['Total', 'الإجمالي'],
  taxableAmount: ['Taxable Amount', 'المبلغ الخاضع للضريبة'],
  grandTotal: ['Grand Total', 'الإجمالي الكلي'],
  paid: ['Amount Paid', 'المبلغ المدفوع'],
  balance: ['Balance Due', 'الرصيد المستحق'],
} as const;

const supplyTag = (t?: string) =>
  t === 'ZERO_RATED' ? ' (Zero-rated / صفري)' : t === 'EXEMPT' ? ' (Exempt / معفى)' : '';

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

export function printBilingualInvoice(inv: Invoice, company: PrintCompany, customer: PrintCustomer) {
  const ccy = inv.currency || company.base_currency || 'AED';
  const money = (n: string | number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy }).format(Number(n));
    } catch {
      return `${ccy} ${Number(n).toFixed(2)}`;
    }
  };
  const lbl = ([en, ar]: readonly [string, string]) =>
    `<span class="en">${en}</span><span class="ar"> / ${ar}</span>`;
  const accent = brandColor(company.brand_color);

  const rows = inv.lines.map((l, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(l.description)}${supplyTag(l.supply_type)}</td>
      <td class="r">${l.quantity}</td>
      <td class="r">${money(l.unit_price)}</td>
      <td class="r">${money(l.taxable_amount)}</td>
      <td class="r">${Number(l.vat) ? money(l.vat) : '—'}</td>
      <td class="r b">${money(l.line_total)}</td>
    </tr>`).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(inv.invoice_no)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, 'Geeza Pro', 'Noto Naskh Arabic', Arial, sans-serif;
         color: #0f172a; margin: 32px; font-size: 13px; }
  .ar { font-size: 0.95em; color: #475569; }
  h1 { font-size: 22px; margin: 0; text-align: right; color: ${accent}; }
  .muted { color: #64748b; }
  .logo { max-height: 54px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .box { margin-top: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th, td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; }
  th { background: ${accent}; text-align: left; font-size: 11px; text-transform: uppercase; color: #fff; }
  td.r, th.r { text-align: right; }
  td.c { text-align: center; width: 26px; }
  td.b { font-weight: 700; }
  .totals { width: 320px; margin-left: auto; margin-top: 16px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { border-top: 2px solid ${accent}; font-weight: 700; padding-top: 7px; }
  .foot { margin-top: 28px; text-align: center; color: #94a3b8; font-size: 11px; }
  @media print { body { margin: 12mm; } button { display: none; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      ${company.logo ? `<img class="logo" src="${esc(company.logo)}" alt="" />` : ''}
      <div style="font-size:16px;font-weight:700">${esc(company.name)}</div>
      ${company.legal_name ? `<div class="muted">${esc(company.legal_name)}</div>` : ''}
      ${company.document_header ? `<div class="muted">${esc(company.document_header)}</div>` : ''}
      ${company.tax_id ? `<div class="muted">${lbl(L.trn)}: ${esc(company.tax_id)}</div>` : ''}
    </div>
    <div>
      <h1>${lbl(L.taxInvoice)}</h1>
      <div class="muted" style="text-align:right;margin-top:6px">
        ${lbl(L.invoiceNo)}: <b>${esc(inv.invoice_no)}</b><br/>
        ${lbl(L.date)}: ${esc(inv.date)}${inv.due_date ? `<br/>${lbl(L.due)}: ${esc(inv.due_date)}` : ''}
      </div>
    </div>
  </div>

  <div class="box">
    <div class="muted" style="font-size:11px;text-transform:uppercase">${lbl(L.billTo)}</div>
    <div style="font-weight:600;margin-top:3px">${esc(customer.name)}</div>
    ${customer.billing_address ? `<div class="muted">${esc(customer.billing_address)}</div>` : ''}
    ${customer.gstin ? `<div class="muted">${lbl(L.trn)}: ${esc(customer.gstin)}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th class="c">#</th>
        <th>${lbl(L.description)}</th>
        <th class="r">${lbl(L.qty)}</th>
        <th class="r">${lbl(L.rate)}</th>
        <th class="r">${lbl(L.taxable)}</th>
        <th class="r">${lbl(L.vat)}</th>
        <th class="r">${lbl(L.total)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>${lbl(L.taxableAmount)}</span><span>${money(inv.taxable_amount)}</span></div>
    ${Number(inv.vat) ? `<div><span>${lbl(L.vat)}</span><span>${money(inv.vat)}</span></div>` : ''}
    <div class="grand"><span>${lbl(L.grandTotal)}</span><span>${money(inv.grand_total)}</span></div>
    <div><span>${lbl(L.paid)}</span><span>${money(inv.amount_paid)}</span></div>
    <div><span>${lbl(L.balance)}</span><span><b>${money(inv.balance_due)}</b></span></div>
  </div>

  ${company.document_footer ? `<div class="foot" style="margin-top:22px;color:#475569;font-size:12px">${esc(company.document_footer)}</div>` : ''}
  <div class="foot">Generated by fin-saptta · ${new Date().toLocaleString()}</div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
