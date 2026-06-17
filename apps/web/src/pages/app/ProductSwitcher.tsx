import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from 'antd';
import {
  TeamOutlined, BankOutlined, LogoutOutlined, DownloadOutlined, AppstoreOutlined,
  ArrowRightOutlined, LockOutlined, CheckOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import { openFinanceApp, openHrApp, installFinanceApp, installHrApp } from '../../lib/products';

/** PWA install prompt captured from the browser's beforeinstallprompt event. */
let _deferredInstall: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstall = e;
});

/** Local keyframes / global tweaks scoped to this page. */
const SWITCHER_STYLES = `
@keyframes ps-float {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(30px,-24px) scale(1.06); }
  66%     { transform: translate(-22px,18px) scale(0.96); }
}
@keyframes ps-rise {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ps-rise { animation: ps-rise 0.6s cubic-bezier(.16,1,.3,1) both; }
`;

export default function ProductSwitcher() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const products = user?.products || [];
  const [canInstall, setCanInstall] = useState(!!_deferredInstall);

  // Smart landing: no products → billing; exactly one → open it directly (skip
  // the switcher); two → fall through and show the chooser below.
  useEffect(() => {
    if (products.length === 0) {
      navigate('/app/billing', { replace: true });
    } else if (products.length === 1) {
      if (products.includes('finance')) openFinanceApp(user?.tenantId);
      else if (products.includes('hrms')) openHrApp();
    }
  }, [products, navigate, user]);

  // Re-check install availability on mount.
  useEffect(() => {
    const onPrompt = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const installApp = async () => {
    if (!_deferredInstall) return;
    _deferredInstall.prompt();
    const { outcome } = await _deferredInstall.userChoice;
    if (outcome === 'accepted') { _deferredInstall = null; setCanInstall(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  // Time-aware greeting for a touch of warmth.
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', background: '#FAFAFC',
    }}>
      <style>{SWITCHER_STYLES}</style>

      {/* Soft drifting brand orbs (subtle, light) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-12%', left: '-6%', width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.10), transparent 65%)',
          filter: 'blur(10px)', animation: 'ps-float 16s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-16%', right: '-8%', width: 560, height: 560, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,109,0,0.10), transparent 65%)',
          filter: 'blur(10px)', animation: 'ps-float 20s ease-in-out infinite reverse',
        }} />
      </div>

      {/* Top bar */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 40px', flexShrink: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(10,17,40,0.06)',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <SapttaLogo />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {canInstall && (
            <Button icon={<DownloadOutlined />} onClick={installApp}
              style={{ borderRadius: 8, fontSize: 13, fontWeight: 600, borderColor: '#FF6D00', color: '#FF6D00' }}>
              Install Desktop App
            </Button>
          )}
          <span style={{ fontSize: 13, color: 'rgba(10,17,40,0.5)' }}>{user?.email}</span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 8 }}>Sign Out</Button>
        </div>
      </header>

      {/* Body */}
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        <div className="ps-rise" style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', marginBottom: 14,
            borderRadius: 999, background: '#fff', border: '1px solid rgba(10,17,40,0.08)',
            fontSize: 11.5, fontWeight: 600, color: 'rgba(10,17,40,0.6)', letterSpacing: '0.3px',
            boxShadow: '0 2px 8px rgba(10,17,40,0.04)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
            Your workspace is ready
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, color: '#0A1128', marginBottom: 6, letterSpacing: '-0.8px', lineHeight: 1.1 }}>
            {greeting}, {user?.firstName || 'there'} 👋
          </h1>
          <p style={{ color: 'rgba(10,17,40,0.5)', fontSize: 14.5, margin: '0 auto' }}>
            Pick a product to jump back in.
          </p>
        </div>

        {/* Owned products open directly; unsubscribed ones are shown locked with
            an Upgrade CTA (consistent with the in-product top-bar menu). */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 840 }}>
          <ProductCard
            index={0}
            name="fin-saptta"
            tagColor="#10B981"
            gradient="linear-gradient(135deg,#10B981,#059669)"
            icon={<BankOutlined />}
            headline="Accounts & Finance"
            description="GST invoicing, ledger, banking, vendor bills, GSTR returns & financial reports."
            features={['GST / Tax Invoicing','Double-Entry Ledger','Bank Reconciliation','P&L, Balance Sheet, GSTR']}
            locked={!products.includes('finance')}
            onOpen={() => openFinanceApp(user?.tenantId, true)}
            onInstall={() => installFinanceApp(user?.tenantId)}
            onUpgrade={() => navigate('/pricing')}
          />
          <ProductCard
            index={1}
            name="Saptta HR"
            tagColor="#FF6D00"
            gradient="linear-gradient(135deg,#FF6D00,#FFA000)"
            icon={<TeamOutlined />}
            headline="HR & Workforce"
            description="Manage employees, attendance, leave, payroll, recruitment & performance."
            features={['Employee Management','Geofenced Attendance','Payroll & Compliance','Recruitment & ATS']}
            locked={!products.includes('hrms')}
            onOpen={() => openHrApp(true)}
            onInstall={() => installHrApp()}
            onUpgrade={() => navigate('/pricing')}
          />
        </div>

        <p className="ps-rise" style={{ marginTop: 24, fontSize: 12.5, color: 'rgba(10,17,40,0.4)' }}>
          One login · One workspace · Switch anytime from inside either product
        </p>
      </main>
    </div>
  );
}

interface CardProps {
  index: number;
  name: string; tagColor: string; gradient: string;
  icon: React.ReactNode; headline: string; description: string;
  features: string[]; locked?: boolean;
  onOpen: () => void; onUpgrade?: () => void; onInstall?: () => void;
}

function ProductCard({ index, name, tagColor, gradient, icon, headline, description, features, locked = false, onOpen, onUpgrade, onInstall }: CardProps) {
  const [hover, setHover] = useState(false);
  const [spot, setSpot] = useState({ x: 188, y: 120 });
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setSpot({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const active = hover && !locked;

  return (
    <div
      ref={ref}
      className="ps-rise"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseMove={onMove}
      style={{
        width: 360, borderRadius: 22, padding: '22px 24px',
        position: 'relative', overflow: 'hidden',
        animationDelay: `${0.12 + index * 0.1}s`,
        background: locked ? '#F9FAFB' : '#fff',
        border: active ? `1.5px solid ${tagColor}` : locked ? '1.5px dashed #e2e8f0' : '1.5px solid #e2e8f0',
        boxShadow: active ? `0 24px 50px rgba(10,17,40,0.12), 0 0 30px ${tagColor}18` : '0 6px 18px rgba(10,17,40,0.05)',
        transform: active ? 'translateY(-6px)' : 'none',
        transition: 'transform 0.25s cubic-bezier(.16,1,.3,1), box-shadow 0.25s, border-color 0.25s',
      }}
    >
      {/* Cursor-following spotlight */}
      {active && (
        <div aria-hidden style={{
          position: 'absolute', left: spot.x, top: spot.y, width: 320, height: 320,
          transform: 'translate(-50%,-50%)', pointerEvents: 'none',
          background: `radial-gradient(circle, ${tagColor}14, transparent 60%)`,
        }} />
      )}
      {/* Corner glow */}
      {!locked && <div aria-hidden style={{ position: 'absolute', top: -70, right: -70, width: 180, height: 180, background: `${tagColor}12`, borderRadius: '50%' }} />}

      <div style={{ position: 'relative' }}>
        {/* Header row: icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: locked ? '#e2e8f0' : gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: 'white', fontSize: 22,
            boxShadow: locked ? 'none' : `0 8px 20px ${tagColor}30`,
            opacity: locked ? 0.5 : 1,
            transition: 'transform 0.25s', transform: active ? 'scale(1.06) rotate(-3deg)' : 'none',
          }}>
            {locked ? <LockOutlined /> : icon}
          </div>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: locked ? '#94a3b8' : '#0A1128', marginBottom: 1, letterSpacing: '-0.4px', lineHeight: 1.1 }}>{name}</h3>
            <p style={{ fontSize: 12, fontWeight: 600, color: locked ? '#cbd5e1' : tagColor, margin: 0 }}>{headline}</p>
          </div>
        </div>

        <p style={{ fontSize: 13, color: locked ? '#cbd5e1' : 'rgba(10,17,40,0.55)', lineHeight: 1.55, marginBottom: 16 }}>{description}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: locked ? '#f1f5f9' : `${tagColor}18`,
                color: locked ? '#cbd5e1' : tagColor, fontSize: 9,
              }}>
                <CheckOutlined />
              </span>
              <span style={{ color: locked ? '#cbd5e1' : 'rgba(10,17,40,0.6)' }}>{f}</span>
            </div>
          ))}
        </div>

        {locked ? (
          <Button block onClick={onUpgrade}
            style={{ borderRadius: 11, fontWeight: 700, height: 44, borderColor: tagColor, color: tagColor, fontSize: 14 }}>
            Activate {name} <ArrowRightOutlined />
          </Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button type="primary" block onClick={onOpen}
              style={{ background: gradient, border: 'none', fontWeight: 700, height: 44, borderRadius: 11, fontSize: 14, boxShadow: `0 8px 16px ${tagColor}30` }}>
              Open {name} <ArrowRightOutlined />
            </Button>
            {onInstall && (
              <Button block onClick={onInstall} icon={<AppstoreOutlined />}
                style={{ borderRadius: 11, fontWeight: 600, height: 36, fontSize: 12.5, borderColor: '#e2e8f0', color: 'rgba(10,17,40,0.6)' }}>
                Use as Desktop App
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
