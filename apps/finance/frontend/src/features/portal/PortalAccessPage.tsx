import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { confirm } from '@/components/ConfirmDialog';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useParties } from '@/features/masters/api';
import {
  usePortalAccess, useGrantPortalAccess, useTogglePortalAccess,
  useRevokePortalAccess, portalLink, type PortalAccess,
} from './api';

export default function PortalAccessPage() {
  const { companyId } = useActiveCompany();
  const { data: access, isLoading } = usePortalAccess();
  const grant = useGrantPortalAccess();
  const toggle = useTogglePortalAccess();
  const revoke = useRevokePortalAccess();
  const [open, setOpen] = useState(false);

  const copyLink = (token: string) => {
    navigator.clipboard?.writeText(portalLink(token))
      .then(() => toast.success('Portal link copied', 'Share it with your customer.'))
      .catch(() => {});
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Portal" subtitle="Let customers view their invoices and dues via a private link."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} className="mr-1" /> Give portal access</button>}
      />
      <PageHint storageKey="portal-access">
        Each customer gets a unique, unguessable link — no password needed. They see only their own
        posted invoices and balances. Revoke any time to kill the link instantly.
      </PageHint>

      <SimpleTable<PortalAccess>
        rows={access} loading={isLoading}
        emptyTitle="No portal access granted yet"
        emptyActionLabel="Give a customer access" onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'party_name', label: 'Customer', render: (r) => <span className="font-medium">{r.party_name}</span> },
          { key: 'link', label: 'Portal link', render: (r) => (
              <div className="flex items-center gap-1">
                <button className="btn-ghost inline-flex items-center gap-1 p-0.5 text-xs text-brand-700 hover:text-brand-800"
                  onClick={(e) => { e.stopPropagation(); copyLink(r.token); }} title="Copy link">
                  <Copy size={12} /> Copy link
                </button>
                <a href={portalLink(r.token)} target="_blank" rel="noreferrer"
                  className="btn-ghost p-0.5 text-slate-400 hover:text-slate-700" title="Open"
                  onClick={(e) => e.stopPropagation()}><ExternalLink size={12} /></a>
              </div>
          )},
          { key: 'last_login_at', label: 'Last viewed', render: (r) => r.last_login_at ? new Date(r.last_login_at).toLocaleString('en-IN') : 'Never' },
          { key: 'is_active', label: 'Active', render: (r) => (
              <button
                onClick={(e) => { e.stopPropagation(); toggle.mutate({ id: r.id, is_active: !r.is_active }); }}
                className={r.is_active ? 'text-green-600' : 'text-slate-400'}
                title={r.is_active ? 'Click to disable' : 'Click to enable'}>
                {r.is_active ? '● Active' : '○ Disabled'}
              </button>
          )},
          { key: 'actions', label: '', render: (r) => (
              <button className="btn-ghost p-1 text-slate-500 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); confirm({ title: `Revoke access for "${r.party_name}"?`, message: 'Their link will stop working immediately.', danger: true, confirmLabel: 'Revoke', onConfirm: () => revoke.mutateAsync(r.id) }); }}>
                <Trash2 size={14} />
              </button>
          )},
        ]}
      />

      <GrantModal
        open={open} onClose={() => setOpen(false)}
        companyId={companyId} existing={access ?? []}
        busy={grant.isPending}
        onGrant={(party) => grant.mutate(party, {
          onSuccess: (a) => {
            setOpen(false);
            copyLink(a.token);
          },
          onError: (e: any) => toast.error('Could not grant access', JSON.stringify(e?.response?.data ?? 'Failed')),
        })}
      />
    </div>
  );
}

function GrantModal({ open, onClose, companyId, existing, onGrant, busy }: {
  open: boolean; onClose: () => void; companyId: number | undefined;
  existing: PortalAccess[]; onGrant: (party: number) => void; busy: boolean;
}) {
  const { data: parties } = useParties(companyId);
  const [party, setParty] = useState<number | ''>('');

  // Only customers (or both) that don't already have access.
  const choices = useMemo(() => {
    const taken = new Set(existing.map((a) => a.party));
    return (parties ?? []).filter((p) => p.kind !== 'VENDOR' && !taken.has(p.id));
  }, [parties, existing]);

  return (
    <Modal open={open} onClose={onClose} title="Give portal access" size="sm">
      <div className="space-y-3">
        <div>
          <label className="label">Customer *</label>
          <select className="input" value={party} onChange={(e) => setParty(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select a customer…</option>
            {choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {choices.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">All customers already have access (or none exist yet).</p>
          )}
        </div>
        <p className="text-xs text-slate-500">
          We'll generate a private link and copy it to your clipboard. Share it with the customer however you like.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => party && onGrant(Number(party))} disabled={!party || busy}>
            {busy ? 'Generating…' : 'Generate link'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
