import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Tag } from 'antd';
import {
  TeamOutlined, BankOutlined, ArrowRightOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import { openFinanceApp, openHrApp } from '../../lib/products';

export default function ProductSwitcher() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const products = user?.products || [];

  // Auto-open the single owned product. Finance is a separate real app (hand off
  // the JWT); HR opens via its SSO embed route.
  useEffect(() => {
    if (products.length === 1) {
      if (products[0] === 'hrms') openHrApp();
      if (products[0] === 'finance') openFinanceApp(user?.tenantId);
    }
  }, [products, user?.tenantId]);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFC',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background ambience */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ width: 700, height: 700, position: 'absolute', top: -300, left: -200, background: 'radial-gradient(circle, rgba(255,109,0,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ width: 600, height: 600, position: 'absolute', bottom: -200, right: -150, background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', position: 'relative', zIndex: 2,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <SapttaLogo />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Signed in as <strong style={{ color: 'var(--color-text-primary)' }}>{user?.email}</strong>
          </div>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 8, fontWeight: 600 }}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', zIndex: 2,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48, maxWidth: 600 }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 12, letterSpacing: '-1px' }}>
            Welcome back, {user?.firstName || 'there'}
          </h1>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Choose which product you'd like to work in. You can switch between them anytime from the top header.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800 }}>
          {/* HRMS Card */}
          {products.includes('hrms') ? (
            <ProductCard
              productName="Saptta HR"
              productTag="HRMS"
              tagColor="#FF6D00"
              tagBg="rgba(255,109,0,0.1)"
              gradient="linear-gradient(135deg, #FF6D00 0%, #FFA000 100%)"
              icon={<TeamOutlined />}
              title="HR & Workforce"
              description="Manage employees, attendance, leave, payroll, recruitment & performance — all in one place."
              features={['Employee Management', 'Geofenced Attendance', 'Payroll & Compliance', 'Recruitment & ATS']}
              onClick={() => openHrApp()}
            />
          ) : (
            <LockedProductCard
              productName="Saptta HR"
              tagColor="#FF6D00"
              gradient="linear-gradient(135deg, #FF6D00 0%, #FFA000 100%)"
              icon={<TeamOutlined />}
              description="Activate your subscription to start using HR."
              onUpgrade={() => navigate('/app/billing')}
            />
          )}

          {/* Finance Card */}
          {products.includes('finance') ? (
            <ProductCard
              productName="fin-saptta"
              productTag="FINANCE"
              tagColor="#10B981"
              tagBg="rgba(16,185,129,0.1)"
              gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
              icon={<BankOutlined />}
              title="Accounts & Finance"
              description="GST invoicing, ledger, banking, vendor bills, GSTR returns & financial reports."
              features={['GST Invoicing', 'Double-Entry Ledger', 'Bank Reconciliation', 'P&L, Balance Sheet, GSTR']}
              onClick={() => openFinanceApp(user?.tenantId)}
            />
          ) : (
            <LockedProductCard
              productName="fin-saptta"
              tagColor="#10B981"
              gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
              icon={<BankOutlined />}
              description="Activate your subscription to start using Finance."
              onUpgrade={() => navigate('/app/billing')}
            />
          )}
        </div>

        {products.length === 1 && (
          <div style={{ marginTop: 32, padding: '14px 22px', background: 'rgba(255,109,0,0.04)', borderRadius: 12, border: '1px solid rgba(255,109,0,0.12)' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Want both products? <Link to="/pricing" style={{ color: '#FF6D00', fontWeight: 600 }}>Upgrade to Saptta Complete →</Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ productName, productTag, tagColor, tagBg, gradient, icon, title, description, features, onClick }: {
  productName: string;
  productTag: string;
  tagColor: string;
  tagBg: string;
  gradient: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 360, background: '#FFFFFF', borderRadius: 20, padding: '32px 28px',
        border: '1px solid var(--color-border)', cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 24px 48px rgba(10,17,40,0.08)';
        e.currentTarget.style.borderColor = tagColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: tagBg, borderRadius: '50%' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 24, marginBottom: 20,
          boxShadow: `0 12px 24px ${tagColor}30`,
        }}>
          {icon}
        </div>

        <Tag style={{ background: tagBg, color: tagColor, border: 'none', fontWeight: 700, fontSize: 11, borderRadius: 8, marginBottom: 12 }}>
          {productTag}
        </Tag>

        <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {productName}
        </h3>
        <div style={{ fontSize: 13, fontWeight: 600, color: tagColor, marginBottom: 12 }}>{title}</div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          {description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: tagColor }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>{f}</span>
            </div>
          ))}
        </div>

        <Button
          type="primary"
          block
          size="large"
          style={{
            background: gradient, border: 'none', fontWeight: 700,
            height: 48, borderRadius: 10, fontSize: 14,
            boxShadow: `0 8px 16px ${tagColor}25`,
          }}
        >
          Open {productName} <ArrowRightOutlined />
        </Button>
      </div>
    </div>
  );
}

function LockedProductCard({ productName, tagColor, gradient, icon, description, onUpgrade }: {
  productName: string;
  tagColor: string;
  gradient: string;
  icon: React.ReactNode;
  description: string;
  onUpgrade: () => void;
}) {
  return (
    <div style={{
      width: 360, background: '#F9FAFB', borderRadius: 20, padding: '32px 28px',
      border: '1px dashed var(--color-border)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 24, marginBottom: 20, opacity: 0.5,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 12, letterSpacing: '-0.5px' }}>
        {productName}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
        {description}
      </p>
      <Button block size="large" onClick={onUpgrade} style={{ borderRadius: 10, fontWeight: 600, height: 48, borderColor: tagColor, color: tagColor }}>
        Upgrade to Add {productName}
      </Button>
    </div>
  );
}
