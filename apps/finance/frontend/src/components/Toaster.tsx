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
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
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
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error:   'border-red-200 bg-red-50 text-red-900',
    info:    'border-sky-200 bg-sky-50 text-sky-900',
  }[t.kind];
  const iconTone = {
    success: 'text-emerald-600',
    error:   'text-red-600',
    info:    'text-sky-600',
  }[t.kind];

  return (
    <div className={`pointer-events-auto flex w-80 items-start gap-3 rounded-lg border ${tone} p-3 shadow-lg animate-in slide-in-from-right-2`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconTone}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{t.title}</div>
        {t.message && <div className="mt-0.5 text-xs leading-snug opacity-80">{t.message}</div>}
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
