import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Alert, Spin } from 'antd';
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { hrSsoEntryUrl, hrUrl, HR_SECTIONS, type HrSection } from '../../../lib/hr';

/**
 * Embeds the real Saptta HR (Django) app inside the unified shell, signed in via
 * SSO. We mint a one-time HR-SSO entry URL (FIN token → HR session) so the user
 * isn't asked to log in again. If SSO is unavailable, the helper falls back to
 * the plain HR URL (HR shows its own login) — the embed still works.
 *
 * Route: /app/hrms/workspace/:section?  — section maps to an HR deep link.
 */
export default function HrWorkspace() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [src, setSrc] = useState<string | null>(null);

  const sec: HrSection = (section && section in HR_SECTIONS ? section : 'dashboard') as HrSection;
  const nextPath = HR_SECTIONS[sec];

  // Mint a fresh SSO entry URL each time the section or reload changes. The
  // token is short-lived and single-use, so we never cache it.
  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    hrSsoEntryUrl(nextPath)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(hrUrl(nextPath)); });
    return () => { cancelled = true; };
  }, [nextPath, reloadKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            HR Workspace
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '2px 0 0' }}>
            Your live Saptta HR app, signed in automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={() => setReloadKey(k => k + 1)} style={{ borderRadius: 8, fontWeight: 600 }}>
            Reload
          </Button>
          <Button type="primary" icon={<ExportOutlined />} href={src ?? hrUrl(nextPath)} target="_blank" rel="noreferrer"
            style={{ borderRadius: 8, fontWeight: 600, background: 'linear-gradient(135deg, #FF9800, #FF6D00)', border: 'none' }}>
            Open in new tab
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src ? (
          <iframe
            key={reloadKey}
            title="Saptta HR"
            src={src}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)', fontSize: 13 }}>Signing you in to HR…</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Trouble loading? Your browser may block embedding.{' '}
        <Button type="link" size="small" href={src ?? hrUrl(nextPath)} target="_blank" rel="noreferrer" style={{ padding: 0, height: 'auto' }}>
          Open HR in a new tab
        </Button>{' · '}
        <Button type="link" size="small" onClick={() => navigate('/app/hrms')} style={{ padding: 0, height: 'auto' }}>
          Back to HR overview
        </Button>
      </div>
    </div>
  );
}
