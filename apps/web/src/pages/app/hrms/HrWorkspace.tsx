import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Alert } from 'antd';
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { hrUrl, HR_SECTIONS, type HrSection } from '../../../lib/hr';

/**
 * Embeds the real Saptta HR (Django) app inside the unified shell.
 *
 * Route: /app/hrms/workspace/:section?  — section maps to an HR deep link.
 * The HR app renders in an iframe so the customer stays on one site. A "open
 * in new tab" escape hatch is provided because some HR flows (file downloads,
 * PDFs) behave better full-page.
 */
export default function HrWorkspace() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);

  const sec: HrSection = (section && section in HR_SECTIONS ? section : 'dashboard') as HrSection;
  const src = useMemo(() => hrUrl(HR_SECTIONS[sec]), [sec]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            HR Workspace
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '2px 0 0' }}>
            Your live Saptta HR app, embedded here.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={() => setReloadKey(k => k + 1)} style={{ borderRadius: 8, fontWeight: 600 }}>
            Reload
          </Button>
          <Button type="primary" icon={<ExportOutlined />} href={src} target="_blank" rel="noreferrer"
            style={{ borderRadius: 8, fontWeight: 600, background: 'linear-gradient(135deg, #FF9800, #FF6D00)', border: 'none' }}>
            Open in new tab
          </Button>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12, borderRadius: 8 }}
        message="First time? Sign in to HR once."
        description={
          <span style={{ fontSize: 13 }}>
            Saptta HR keeps its own sign-in for now. If the panel below shows a login
            screen, sign in with your HR credentials —{' '}
            <a href={hrUrl(HR_SECTIONS.login)} target="_blank" rel="noreferrer" style={{ color: '#FF6D00', fontWeight: 600 }}>
              open HR login
            </a>
            . After that you'll stay signed in here.
          </span>
        }
        closable
      />

      <div style={{ flex: 1, minHeight: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#FFFFFF' }}>
        <iframe
          key={reloadKey}
          title="Saptta HR"
          src={src}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Trouble loading? Your browser may block embedding.{' '}
        <Button type="link" size="small" onClick={() => navigate('/app/hrms')} style={{ padding: 0, height: 'auto' }}>
          Back to HR overview
        </Button>
      </div>
    </div>
  );
}
