import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  rows: T[] | undefined;
  columns: Column<T>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  keyField?: keyof T;
  onRowClick?: (row: T) => void;
}

export default function SimpleTable<T extends Record<string, any>>({
  rows, columns, loading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
  keyField = 'id' as keyof T,
  onRowClick,
}: Props<T>) {
  const isEmpty = !loading && rows && rows.length === 0;

  return (
    <div className="card overflow-hidden p-0">
      {isEmpty ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading && (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            )}
            {rows?.map((row) => (
              <tr
                key={String(row[keyField])}
                className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
