import { useState, type FormEvent } from 'react';
import { login } from './api';

interface Props { onSuccess: () => void; }

export default function LoginPage({ onSuccess }: Props) {
  const [email, setEmail] = useState('admin@acme.test');
  const [password, setPassword] = useState('admin12345');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sign in to fin-saptta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use the dev tenant at <code>acme.localhost:5173</code>.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required
                 value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" required
                 value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
