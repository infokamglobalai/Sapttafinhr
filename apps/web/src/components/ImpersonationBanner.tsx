import { getImpersonating, exitImpersonation } from '../lib/api';

/**
 * Persistent banner shown while a super-admin is impersonating a tenant.
 * Reads the impersonation marker from localStorage so it survives full reloads
 * (impersonation hard-navigates to re-bootstrap auth). Rendered globally.
 */
export default function ImpersonationBanner() {
  const company = getImpersonating();
  if (!company) return null;
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 4000,
        background: '#7c3aed', color: '#fff', padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <span>👤 Viewing as <strong>{company}</strong> — you are impersonating this workspace.</span>
      <button
        onClick={exitImpersonation}
        style={{
          background: '#fff', color: '#7c3aed', border: 'none', borderRadius: 6,
          padding: '4px 12px', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Exit impersonation
      </button>
    </div>
  );
}
