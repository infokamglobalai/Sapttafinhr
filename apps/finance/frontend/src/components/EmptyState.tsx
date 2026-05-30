import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
          <Icon size={28} />
        </div>
      )}
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {description && <div className="mt-1 max-w-md text-xs text-slate-500">{description}</div>}
      {actionLabel && onAction && (
        <button className="btn-primary mt-4" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
