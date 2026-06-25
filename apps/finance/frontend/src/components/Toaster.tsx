import { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: Kind;
  title: string;
  message?: string;
  ttlMs?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => number;
  dismiss: (id: number) => void;
}

let _id = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++_id;
    set((s) => ({ toasts: [...s.toasts, { id, ttlMs: 4000, ...t }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience helpers
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'error', title, message, ttlMs: 8000 }),
  info: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'info', title, message }),
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[80] flex flex-col gap-2">
      {toasts.map((t) => <ToastView key={t.id} t={t} onDismiss={() => dismiss(t.id)} />)}
    </div>
  );
}

function ToastView({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  useEffect(() => {
    if (!t.ttlMs) return;
    const h = setTimeout(onDismiss, t.ttlMs);
    return () => clearTimeout(h);
  }, [t.ttlMs, onDismiss]);

  const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
  const tone = {
    success: 'border-emerald-200 bg-emerald-50/80 text-emerald-950 backdrop-blur-md shadow-emerald-500/[0.03]',
    error:   'border-rose-200 bg-rose-50/80 text-rose-950 backdrop-blur-md shadow-rose-500/[0.03]',
    info:    'border-brand-200 bg-brand-50/80 text-brand-950 backdrop-blur-md shadow-brand-500/[0.03]',
  }[t.kind];
  const iconTone = {
    success: 'text-emerald-600',
    error:   'text-rose-600',
    info:    'text-brand-600',
  }[t.kind];

  return (
    <div className={`pointer-events-auto flex w-80 items-start gap-3 rounded-xl border ${tone} p-3.5 shadow-xl animate-in slide-in-from-right-5 duration-300`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconTone}`} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold tracking-tight">{t.title}</div>
        {t.message && <div className="mt-1 text-[11px] font-medium leading-relaxed opacity-80">{t.message}</div>}
      </div>
      <button onClick={onDismiss} className="shrink-0 text-ink-400 hover:text-ink-700 hover:bg-ink-200/40 p-1 rounded-lg transition-colors">
        <X size={12} />
      </button>
    </div>
  );
}
