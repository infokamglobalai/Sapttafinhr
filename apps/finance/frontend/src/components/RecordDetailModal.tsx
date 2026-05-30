/**
 * Generic detail modal — show all fields of a record in tidy sections + optional
 * nested tables for line items / allocations / etc.
 *
 * Usage:
 *   <RecordDetailModal
 *     open={!!selected} onClose={() => setSelected(null)}
 *     title="Invoice INV-001" subtitle="Posted on 2026-05-26"
 *     sections={[{ title: 'Customer', fields: [{label:'Name', value:'Globex'}] }]}
 *     nestedTables={[{ title: 'Line items', columns: [...], rows: invoice.lines }]}
 *   />
 */
import type { ReactNode } from 'react';
import Modal from './Modal';

export interface DetailField {
  label: string;
  value: ReactNode;
  mono?: boolean;
  fullWidth?: boolean;
  hidden?: boolean;
}

export interface DetailSection {
  title?: string;
  fields: DetailField[];
}

export interface NestedColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: any) => ReactNode;
  mono?: boolean;
}

export interface NestedTable {
  title: string;
  columns: NestedColumn[];
  rows: any[];
  emptyText?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  sections: DetailSection[];
  nestedTables?: NestedTable[];
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function RecordDetailModal({
  open, onClose, title, subtitle, sections, nestedTables, actions, size = 'lg',
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size={size}>
      <div className="space-y-5">
        {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}

        {actions && (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}

        {sections.map((section, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
            {section.title && (
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {section.title}
              </div>
            )}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 md:grid-cols-2">
              {section.fields.filter((f) => !f.hidden).map((f, j) => (
                <div key={j} className={f.fullWidth ? 'md:col-span-2' : ''}>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">{f.label}</dt>
                  <dd className={`mt-0.5 text-sm text-slate-900 ${f.mono ? 'font-mono' : ''} break-words`}>
                    {f.value ?? <span className="text-slate-400">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        {nestedTables?.map((nt, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {nt.title} ({nt.rows.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {nt.columns.map((c) => (
                      <th key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {nt.rows.length === 0 ? (
                    <tr><td colSpan={nt.columns.length} className="px-3 py-4 text-center text-slate-500">
                      {nt.emptyText ?? 'No rows.'}
                    </td></tr>
                  ) : nt.rows.map((row, ri) => (
                    <tr key={ri}>
                      {nt.columns.map((c) => (
                        <td key={c.key} className={`px-3 py-1.5 ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.mono ? 'font-mono' : ''}`}>
                          {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// Helper to format a label/value pair concisely from a record key.
export const f = (label: string, value: any, opts: Partial<DetailField> = {}): DetailField => ({
  label,
  value: value == null || value === '' ? null : value,
  ...opts,
});
