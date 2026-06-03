import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import PageHeader from '@/components/PageHeader';

interface Member {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  invited_by_email: string;
  created_at: string;
}

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE', 'VIEWER'] as const;

const ROLE_COLOR: Record<string, string> = {
  OWNER:      'bg-purple-100 text-purple-800',
  ADMIN:      'bg-blue-100 text-blue-800',
  MANAGER:    'bg-indigo-100 text-indigo-800',
  ACCOUNTANT: 'bg-teal-100 text-teal-800',
  EMPLOYEE:   'bg-green-100 text-green-800',
  VIEWER:     'bg-slate-100 text-slate-600',
};

const ROLE_DESC: Record<string, string> = {
  OWNER:      'Full access — owns the workspace',
  ADMIN:      'Full access, can manage team',
  MANAGER:    'Can approve expenses & view reports',
  ACCOUNTANT: 'Full accounting access, no team settings',
  EMPLOYEE:   'Can submit expenses & view own data',
  VIEWER:     'Read-only access',
};

export default function TeamPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'EMPLOYEE', password: '' });
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['team-members'],
    queryFn: () => api.get('/team/members/').then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/team/members/', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members'] });
      setShowAdd(false);
      setForm({ email: '', full_name: '', role: 'EMPLOYEE', password: '' });
      setError('');
    },
    onError: (e: any) => setError(e?.response?.data?.detail ?? 'Could not add member.'),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; role?: string; is_active?: boolean }) =>
      api.patch(`/team/members/${id}/`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/team/members/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader
        title="Team Members"
        subtitle="Manage who has access to this workspace and what they can do."
        action={
          <button
            onClick={() => { setShowAdd(true); setError(''); }}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Add Member
          </button>
        }
      />

      {/* Add member panel */}
      {showAdd && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Create account & add to workspace</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Ravi Kumar"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ravi@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Password (for their login)</label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                {ROLES.filter(r => r !== 'OWNER').map(r => (
                  <option key={r} value={r}>{r} — {ROLE_DESC[r]}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => addMutation.mutate(form)}
              disabled={addMutation.isPending || !form.email || !form.full_name || !form.password}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {addMutation.isPending ? 'Creating…' : 'Create Account & Add'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(''); }}
              className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading team…</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <div className="mb-2 text-3xl">👥</div>
          <p className="text-sm font-medium text-slate-600">No team members yet</p>
          <p className="mt-1 text-xs text-slate-400">Add employees, managers, and accountants to collaborate.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Added by</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{m.full_name || m.email}</div>
                    <div className="text-xs text-slate-400">{m.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === m.id ? (
                      <select
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                        defaultValue={m.role}
                        onBlur={e => {
                          patchMutation.mutate({ id: m.id, role: e.target.value });
                          setEditingId(null);
                        }}
                        autoFocus
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(m.id)}
                        className={`rounded-full px-3 py-0.5 text-xs font-semibold ${ROLE_COLOR[m.role] ?? 'bg-slate-100 text-slate-600'}`}
                        title="Click to change role"
                      >
                        {m.role}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => patchMutation.mutate({ id: m.id, is_active: !m.is_active })}
                      className={`rounded-full px-3 py-0.5 text-xs font-semibold ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                      title="Click to toggle"
                    >
                      {m.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {m.invited_by_email === user?.email ? 'You' : m.invited_by_email || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.email !== user?.email && (
                      <button
                        onClick={() => { if (confirm(`Remove ${m.email}?`)) removeMutation.mutate(m.id); }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role legend */}
      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Role Permissions</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map(r => (
            <div key={r} className="flex items-start gap-2">
              <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLOR[r]}`}>{r}</span>
              <span className="text-xs text-slate-500">{ROLE_DESC[r]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
