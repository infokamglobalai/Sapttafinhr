import { type PropsWithChildren, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  // Portal to <body> so the overlay is positioned against the viewport, not a
  // transformed/will-change ancestor (the app shell's animated route wrapper
  // would otherwise trap `position: fixed` inside the scrollable <main>, leaving
  // the modal off-centre and the scrim covering only the content area).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${SIZE[size]} rounded-2xl bg-white shadow-2xl border border-ink-200/80 overflow-hidden animate-in zoom-in-95 duration-200 my-auto`}
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
    </div>,
    document.body,
  );
}
