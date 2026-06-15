import { type PropsWithChildren, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

export default function Modal({ open, onClose, title, size = 'md', children }: PropsWithChildren<Props>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className={`mt-12 w-full ${SIZE[size]} rounded-2xl bg-white shadow-2xl border border-ink-200/80 overflow-hidden animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-150 bg-ink-50/60 px-6 py-4.5">
          <h2 className="text-sm font-extrabold text-ink-950 uppercase tracking-widest font-display">{title}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 hover:bg-ink-100 p-1.5 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
