import { useState, type FormEvent } from 'react';
import { login } from './api';

interface Props { onSuccess: () => void; }

export default function LoginPage({ onSuccess }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  // Try to pull workspace name from subdomain for a personalised header.
  const subdomain = window.location.hostname.split('.')[0];
  const workspaceName = subdomain && subdomain !== 'localhost' ? subdomain : null;

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Left panel (decorative, hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-emerald-600 to-teal-700 p-12 text-white">
        <div>
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
              fs
            </div>
            <span className="text-xl font-bold tracking-tight">fin-saptta</span>
          </div>

          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Your accounts,<br />always in order.
          </h2>
          <p className="text-emerald-100 text-base leading-relaxed max-w-xs">
            GST invoicing, double-entry ledger, bank reconciliation, and financial reports — built for Indian businesses.
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-3 text-sm text-emerald-50">
          {[
            'GST / Tax Invoicing (CGST · SGST · IGST)',
            'Double-entry ledger & trial balance',
            'Bank reconciliation & PDC management',
            'P&L, Balance Sheet, Cash Flow reports',
            'GSTR-1 / 3B export ready',
          ].map(f => (
            <li key={f} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</span>
              {f}
            </li>
          ))}
        </ul>

        <p className="text-xs text-emerald-200 mt-8">
          © {new Date().getFullYear()} Saptta Tech Solutions
        </p>
      </div>

      {/* ── Right panel: login form ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
              fs
            </div>
            <span className="font-bold text-slate-800">fin-saptta</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign in
              {workspaceName && (
                <span className="ml-2 text-sm font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                  {workspaceName}
                </span>
              )}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="input pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {err && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {err}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-2.5 text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Back link */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Not your workspace?{' '}
            <a href="http://localhost:8080" className="text-brand-600 hover:underline font-medium">
              Go to Saptta platform →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
