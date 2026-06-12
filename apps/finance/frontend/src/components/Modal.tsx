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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`mt-12 w-full ${SIZE[size]} rounded-lg bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
