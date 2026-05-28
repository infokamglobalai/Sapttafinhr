import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface Props {
  storageKey: string;
  children: React.ReactNode;
}

export default function PageHint({ storageKey, children }: Props) {
  const fullKey = `hint-dismissed:${storageKey}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(fullKey) === '1');

  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
      <Info size={16} className="mt-0.5 shrink-0 text-sky-600" />
      <div className="flex-1 leading-snug">{children}</div>
      <button
        onClick={() => { localStorage.setItem(fullKey, '1'); setDismissed(true); }}
        className="shrink-0 opacity-60 hover:opacity-100"
        title="Got it, hide this">
        <X size={14} />
      </button>
    </div>
  );
}
