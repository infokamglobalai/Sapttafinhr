import { create } from 'zustand';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface State {
  open: boolean;
  busy: boolean;
  opts: ConfirmOptions | null;
  show: (opts: ConfirmOptions) => void;
  hide: () => void;
  setBusy: (b: boolean) => void;
}

export const useConfirm = create<State>((set) => ({
  open: false, busy: false, opts: null,
  show: (opts) => set({ open: true, opts, busy: false }),
  hide: () => set({ open: false, opts: null, busy: false }),
  setBusy: (b) => set({ busy: b }),
}));

export const confirm = (opts: ConfirmOptions) => useConfirm.getState().show(opts);

export function ConfirmHost() {
  const { open, opts, busy, hide, setBusy } = useConfirm();
  if (!open || !opts) return null;

  const run = async () => {
    try { setBusy(true); await opts.onConfirm(); hide(); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
        <div className="flex items-start gap-3 p-5">
          {opts.danger && (
            <div className="rounded-full bg-red-50 p-2 text-red-600"><AlertTriangle size={18} /></div>
          )}
          <div className="flex-1">
            <div className="text-base font-semibold">{opts.title}</div>
            {opts.message && <p className="mt-1 text-sm text-slate-600">{opts.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button className="btn-ghost" onClick={hide} disabled={busy}>
            {opts.cancelLabel ?? 'Cancel'}
          </button>
          <button
            className={opts.danger
              ? 'btn inline-flex items-center justify-center bg-red-600 text-white hover:bg-red-500'
              : 'btn-primary'}
            onClick={run}
            disabled={busy}
          >
            {busy ? 'Working…' : (opts.confirmLabel ?? 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
