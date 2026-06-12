import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Tag } from 'antd';
import {
  TeamOutlined, BankOutlined, LogoutOutlined, DownloadOutlined, AppstoreOutlined,
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

const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

export default function ProductSwitcher() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const products = user?.products || [];
  const [canInstall, setCanInstall] = useState(!!_deferredInstall);

  // Redirect to billing if no active products (PENDING subscription).
  useEffect(() => {
    if (products.length === 0) {
      navigate('/app/billing', { replace: true });
    }
  }, [products, navigate]);

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

  return (
    <div className="product-switcher">
      <header className="product-switcher__header">
        <Link to="/" className="product-switcher__logo">
          <SapttaLogo />
        </Link>
        <div className="product-switcher__header-actions">
          {canInstall && !isElectron && (
            <Button icon={<DownloadOutlined />} onClick={installApp}
              className="product-switcher__install-btn"
              style={{ borderRadius: 8, fontSize: 13, fontWeight: 600, borderColor: '#FF6D00', color: '#FF6D00' }}>
              Install Desktop App
            </Button>
          )}
          <span className="product-switcher__email">{user?.email}</span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 8 }}>Sign Out</Button>
        </div>
      </header>

      <main className="product-switcher__main">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, color: '#0A1128', marginBottom: 8, letterSpacing: '-0.5px' }}>
            Welcome back, {user?.firstName || 'there'} 👋
          </h1>
          <p style={{ color: 'rgba(10,17,40,0.5)', fontSize: 15 }}>
            Choose a product to open. Your data is ready.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 800 }}>
          <ProductCard
            name="fin-saptta"
            tag="FINANCE"
            tagColor="#10B981"
            gradient="linear-gradient(135deg,#10B981,#059669)"
            icon={<BankOutlined />}
            headline="Accounts & Finance"
            description="GST invoicing, ledger, banking, vendor bills, GSTR returns & financial reports."
            features={['GST / Tax Invoicing','Double-Entry Ledger','Bank Reconciliation','P&L, Balance Sheet, GSTR']}
            locked={!products.includes('finance')}
            onOpen={() => isElectron ? navigate('/app') : openFinanceApp(user?.tenantId)}
            onInstall={() => installFinanceApp(user?.tenantId)}
            onUpgrade={() => navigate('/app/billing')}
          />
          <ProductCard
            name="Saptta HR"
            tag="HRMS"
            tagColor="#FF6D00"
            gradient="linear-gradient(135deg,#FF6D00,#FFA000)"
            icon={<TeamOutlined />}
            headline="HR & Workforce"
            description="Manage employees, attendance, leave, payroll, recruitment & performance."
            features={['Employee Management','Geofenced Attendance','Payroll & Compliance','Recruitment & ATS']}
            locked={!products.includes('hrms')}
            onOpen={() => openHrApp()}
            onInstall={() => installHrApp()}
            onUpgrade={() => navigate('/app/billing')}
          />
        </div>

        {products.length === 1 && (
          <div style={{ marginTop: 32, padding: '12px 20px', background: 'rgba(255,109,0,0.04)', borderRadius: 12, border: '1px solid rgba(255,109,0,0.12)', fontSize: 13, color: 'rgba(10,17,40,0.5)' }}>
            Want both products?{' '}
            <Link to="/pricing" style={{ color: '#FF6D00', fontWeight: 600 }}>Upgrade to Saptta Complete →</Link>
          </div>
        )}
      </main>
    </div>
  );
}

interface CardProps {
  name: string; tag: string; tagColor: string; gradient: string;
  icon: React.ReactNode; headline: string; description: string;
  features: string[]; locked: boolean;
  onOpen: () => void; onUpgrade: () => void; onInstall?: () => void;
}

function ProductCard({ name, tag, tagColor, gradient, icon, headline, description, features, locked, onOpen, onUpgrade, onInstall }: CardProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="product-switcher__card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: locked ? '#F9FAFB' : '#fff', borderRadius: 20,
        padding: '28px 24px',
        border: hover && !locked ? `1.5px solid ${tagColor}` : locked ? '1.5px dashed #e2e8f0' : '1.5px solid #e2e8f0',
        boxShadow: hover && !locked ? '0 20px 40px rgba(10,17,40,0.08)' : 'none',
        transform: hover && !locked ? 'translateY(-4px)' : 'none',
        transition: 'all 0.2s ease',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      {!locked && <div style={{ position: 'absolute', top: -60, right: -60, width: 160, height: 160, background: `${tagColor}12`, borderRadius: '50%' }} />}

      <div style={{ position: 'relative' }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: locked ? '#e2e8f0' : gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 22, marginBottom: 16,
          boxShadow: locked ? 'none' : `0 8px 20px ${tagColor}30`,
          opacity: locked ? 0.5 : 1,
        }}>
          {icon}
        </div>

        <Tag style={{ background: locked ? '#f1f5f9' : `${tagColor}18`, color: locked ? '#94a3b8' : tagColor, border: 'none', fontWeight: 700, fontSize: 10, borderRadius: 6, marginBottom: 10 }}>
          {tag}
        </Tag>

        <h3 style={{ fontSize: 20, fontWeight: 800, color: locked ? '#94a3b8' : '#0A1128', marginBottom: 2, letterSpacing: '-0.3px' }}>{name}</h3>
        <p style={{ fontSize: 12, fontWeight: 600, color: locked ? '#cbd5e1' : tagColor, marginBottom: 10 }}>{headline}</p>
        <p style={{ fontSize: 13, color: locked ? '#cbd5e1' : 'rgba(10,17,40,0.55)', lineHeight: 1.6, marginBottom: 18 }}>{description}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: locked ? '#cbd5e1' : tagColor, flexShrink: 0 }} />
              <span style={{ color: locked ? '#cbd5e1' : 'rgba(10,17,40,0.55)' }}>{f}</span>
            </div>
          ))}
        </div>

        {locked ? (
          <Button block size="large" onClick={onUpgrade}
            style={{ borderRadius: 10, fontWeight: 700, height: 46, borderColor: tagColor, color: tagColor, fontSize: 14 }}>
            Activate {name} →
          </Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button type="primary" block size="large" onClick={onOpen}
              style={{ background: gradient, border: 'none', fontWeight: 700, height: 46, borderRadius: 10, fontSize: 14, boxShadow: `0 6px 14px ${tagColor}30` }}>
              Open {name}
            </Button>
            {onInstall && !isElectron && (
              <Button block onClick={onInstall} icon={<AppstoreOutlined />}
                style={{ borderRadius: 10, fontWeight: 600, height: 38, fontSize: 13, borderColor: '#e2e8f0', color: 'rgba(10,17,40,0.6)' }}>
                Use as Desktop App
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
