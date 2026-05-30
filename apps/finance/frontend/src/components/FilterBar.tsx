import { Search, X } from 'lucide-react';

interface SelectFilter {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: SelectFilter[];
  count?: number;
  rightSlot?: React.ReactNode;
}

export default function FilterBar({ search, onSearchChange, searchPlaceholder, filters, count, rightSlot }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex-1 min-w-[200px]">
        <label className="label">Search</label>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-7 pr-7"
            placeholder={searchPlaceholder ?? 'Search…'}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {filters?.map((f) => (
        <div key={f.label}>
          <label className="label">{f.label}</label>
          <select className="input" value={f.value} onChange={(e) => f.onChange(e.target.value)}>
            {f.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
      ))}
      {count != null && (
        <div className="ml-auto self-center text-xs text-slate-500">
          {count} record{count === 1 ? '' : 's'}
        </div>
      )}
      {rightSlot}
    </div>
  );
}
