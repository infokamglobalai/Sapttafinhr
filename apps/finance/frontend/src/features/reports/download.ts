import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Column {
  header: string;
  key: string;
  align?: 'left' | 'right';
}

export interface DownloadOpts {
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  totals?: Record<string, string>;
}

function formatValue(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export function downloadPDF(opts: DownloadOpts) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(opts.title, 14, 18);
  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(opts.subtitle, 14, 25);
    doc.setTextColor(0);
  }

  const head = [opts.columns.map((c) => c.header)];
  const body = opts.rows.map((r) => opts.columns.map((c) => formatValue(r[c.key])));

  if (opts.totals) {
    const totalRow = opts.columns.map((c) => opts.totals![c.key] ?? '');
    body.push(totalRow);
  }

  const colStyles: Record<number, { halign: 'left' | 'right' }> = {};
  opts.columns.forEach((c, i) => {
    if (c.align === 'right') colStyles[i] = { halign: 'right' };
  });

  autoTable(doc, {
    startY: opts.subtitle ? 30 : 24,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], fontSize: 7, textColor: 255 },
    columnStyles: colStyles,
    didParseCell(data) {
      if (opts.totals && data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 14, doc.internal.pageSize.getHeight() - 8);
  doc.text('fin-saptta', pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });

  doc.save(`${opts.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function downloadCSV(opts: DownloadOpts) {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines: string[] = [];
  lines.push(opts.columns.map((c) => escape(c.header)).join(','));

  for (const r of opts.rows) {
    lines.push(opts.columns.map((c) => escape(formatValue(r[c.key]))).join(','));
  }

  if (opts.totals) {
    lines.push(opts.columns.map((c) => escape(opts.totals![c.key] ?? '')).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${opts.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
