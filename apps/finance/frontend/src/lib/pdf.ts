/**
 * Browser-side PDF generation for Tax Invoices using jsPDF + autoTable.
 * Regime-aware: India GST shows a CGST/SGST/IGST breakup; GCC VAT shows a single
 * VAT column, the company TRN, and the jurisdiction currency.
 *
 * NOTE: content is rendered in English. True bilingual (Arabic) invoices need an
 * embedded Arabic font + RTL shaping, which jsPDF's core fonts can't do — that is
 * tracked as a follow-up (an HTML/print pipeline is the cleanest route).
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '@/features/billing/api';
import { formatMoney } from '@/lib/money';

export interface PdfCompany {
  name: string;
  legal_name?: string;
  gstin?: string;
  state_code?: string;
  base_currency?: string;
  tax_regime?: 'INDIA_GST' | 'GCC_VAT' | 'NONE';
  tax_id?: string;
}

export interface PdfCustomer {
  name: string;
  gstin?: string;
  billing_address?: string;
  state_code?: string;
  email?: string;
}

export function downloadInvoicePdf(inv: Invoice, company: PdfCompany, customer: PdfCustomer) {
  const isVat = company.tax_regime === 'GCC_VAT';
  const ccy = inv.currency || company.base_currency || 'INR';
  const money = (n: string | number) => formatMoney(n, ccy);
  const taxIdLabel = isVat ? 'TRN' : 'GSTIN';
  const companyTaxId = isVat ? company.tax_id : company.gstin;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // ── Header ──
  doc.setFontSize(20).setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', W - 40, 40, { align: 'right' });

  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text(company.name, 40, 50);
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
  if (company.legal_name) doc.text(company.legal_name, 40, 65);
  if (companyTaxId) doc.text(`${taxIdLabel}: ${companyTaxId}`, 40, 78);
  doc.setTextColor(0);

  doc.setFontSize(9);
  doc.text(`Invoice #: ${inv.invoice_no}`, W - 40, 60, { align: 'right' });
  doc.text(`Date: ${inv.date}`, W - 40, 73, { align: 'right' });
  if (inv.due_date) doc.text(`Due: ${inv.due_date}`, W - 40, 86, { align: 'right' });

  // ── Bill to ──
  let y = 120;
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
  doc.text('BILL TO', 40, y);
  doc.setTextColor(0).setFont('helvetica', 'normal');
  y += 13;
  doc.setFontSize(10);
  doc.text(customer.name, 40, y);
  y += 12;
  if (customer.billing_address) {
    const lines = doc.splitTextToSize(customer.billing_address, 220);
    doc.setFontSize(9).setTextColor(80);
    doc.text(lines, 40, y);
    y += lines.length * 11;
    doc.setTextColor(0);
  }
  doc.setFontSize(9);
  if (customer.gstin) { doc.text(`${taxIdLabel}: ${customer.gstin}`, 40, y); y += 11; }
  if (customer.email) { doc.text(customer.email, 40, y); y += 11; }

  // Place of supply is an Indian-GST concept (a state code) — omit for VAT.
  if (!isVat && inv.place_of_supply) {
    doc.setFontSize(9).setTextColor(120);
    doc.text(`Place of Supply: ${inv.place_of_supply}`, W - 40, 120, { align: 'right' });
    doc.setTextColor(0);
  }

  // ── Line items table ──
  const tableStartY = Math.max(y + 15, 200);
  const supplyTag = (t?: string) =>
    t === 'ZERO_RATED' ? ' (Zero-rated)' : t === 'EXEMPT' ? ' (Exempt)' : '';

  if (isVat) {
    autoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Description', 'Qty', 'Rate', 'Taxable', 'VAT', 'Total']],
      body: inv.lines.map((l, i) => [
        i + 1, l.description + supplyTag(l.supply_type),
        l.quantity, money(l.unit_price), money(l.taxable_amount),
        Number(l.vat) ? money(l.vat) : '—', money(l.line_total),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: 70, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 45 },
        3: { halign: 'right', cellWidth: 75 },
        4: { halign: 'right', cellWidth: 85 },
        5: { halign: 'right', cellWidth: 70 },
        6: { halign: 'right', cellWidth: 85, fontStyle: 'bold' },
      },
    });
  } else {
    autoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total']],
      body: inv.lines.map((l, i) => [
        i + 1, l.description, l.hsn_code || '—',
        l.quantity, money(l.unit_price), money(l.taxable_amount),
        Number(l.cgst) ? money(l.cgst) : '—',
        Number(l.sgst) ? money(l.sgst) : '—',
        Number(l.igst) ? money(l.igst) : '—',
        money(l.line_total),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: 70, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 55 },
        5: { halign: 'right', cellWidth: 60 },
        6: { halign: 'right', cellWidth: 45 },
        7: { halign: 'right', cellWidth: 45 },
        8: { halign: 'right', cellWidth: 45 },
        9: { halign: 'right', cellWidth: 60, fontStyle: 'bold' },
      },
    });
  }

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // ── Totals box ──
  const rightX = W - 40;
  const labelX = W - 200;
  doc.setFontSize(9);
  const row = (label: string, val: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, labelX, (row as any).y);
    doc.text(val, rightX, (row as any).y, { align: 'right' });
    (row as any).y += 14;
  };
  (row as any).y = finalY + 10;
  row('Taxable Amount', money(inv.taxable_amount));
  if (isVat) {
    if (Number(inv.vat)) row('VAT', money(inv.vat));
  } else {
    if (Number(inv.cgst)) row('CGST', money(inv.cgst));
    if (Number(inv.sgst)) row('SGST', money(inv.sgst));
    if (Number(inv.igst)) row('IGST', money(inv.igst));
  }
  (row as any).y += 4;
  row('Grand Total', money(inv.grand_total), true);
  row('Amount Paid', money(inv.amount_paid));
  row('Balance Due', money(inv.balance_due), true);

  // ── Footer ──
  if (inv.notes) {
    const ny = (row as any).y + 20;
    doc.setFontSize(9).setTextColor(120).setFont('helvetica', 'bold');
    doc.text('Notes', 40, ny);
    doc.setFont('helvetica', 'normal').setTextColor(0);
    doc.text(doc.splitTextToSize(inv.notes, W - 80), 40, ny + 12);
  }

  doc.setFontSize(8).setTextColor(150);
  doc.text(`Generated by fin-saptta • ${new Date().toLocaleString('en-IN')}`,
    W / 2, doc.internal.pageSize.getHeight() - 25, { align: 'center' });

  doc.save(`${inv.invoice_no}.pdf`);
}
