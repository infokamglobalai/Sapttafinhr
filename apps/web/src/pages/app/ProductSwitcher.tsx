import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from 'antd';
import {
  LogoutOutlined,
  DownloadOutlined,
  AppstoreOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  SafetyOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import { openFinanceApp, openHrApp, installFinanceApp, installHrApp } from '../../lib/products';

/** PWA install prompt captured from the browser's beforeinstallprompt event. */
let _deferredInstall: Event | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstall = e;
});

export default function ProductSwitcher() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const products = user?.products || [];
  const [canInstall, setCanInstall] = useState(!!_deferredInstall);

  useEffect(() => {
    if (products.length === 0) {
      navigate('/app/billing', { replace: true });
    }
  }, [products.length, navigate]);

  useEffect(() => {
    const onPrompt = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const installApp = async () => {
    const prompt = _deferredInstall as (Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null;
    if (!prompt?.prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      _deferredInstall = null;
      setCanInstall(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user?.firstName || user?.email?.split('@')[0] || 'there';

  return (
    <div className="product-switcher">
      <div className="product-switcher__bg" aria-hidden>
        <div className="product-switcher__orb product-switcher__orb--green" />
        <div className="product-switcher__orb product-switcher__orb--orange" />
      </div>

      <header className="product-switcher__header">
        <Link to="/" className="product-switcher__logo">
          <SapttaLogo />
        </Link>
        <div className="product-switcher__header-actions">
          <Button
            icon={<DownloadOutlined />}
            onClick={installApp}
            disabled={!canInstall}
            className="product-switcher__install-btn"
          >
            Download Desktop App
          </Button>
          <span className="product-switcher__email">{user?.email}</span>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className="product-switcher__signout"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="product-switcher__main">
        <div className="product-switcher__hero ps-rise">
          <div className="product-switcher__badge">
            <span className="product-switcher__badge-dot" aria-hidden />
            Your workspace is ready
          </div>
          <h1 className="product-switcher__title">
            {greeting}, {displayName} 👋
          </h1>
          <p className="product-switcher__subtitle">Pick a product to jump back in.</p>
        </div>

        <div className="product-switcher__cards">
          <ProductCard
            index={0}
            variant="finance"
            name="fin-saptta"
            headline="Accounts & Finance"
            description="GST invoicing, ledger, banking, vendor bills, GSTR returns & financial reports."
            features={[
              'GST / Tax Invoicing',
              'Double-Entry Ledger',
              'Bank Reconciliation',
              'P&L, Balance Sheet, GSTR',
            ]}
            logo="/saptta-fin.png"
            locked={!products.includes('finance')}
            onOpen={() => openFinanceApp(user?.tenantId, true)}
            onInstall={() => installFinanceApp(user?.tenantId)}
            onUpgrade={() => navigate('/pricing')}
          />
          <ProductCard
            index={1}
            variant="hr"
            name="Saptta HR"
            headline="HR & Workforce"
            description="Manage employees, attendance, leave, payroll, recruitment & performance."
            features={[
              'Employee Management',
              'Geofenced Attendance',
              'Payroll & Compliance',
              'Recruitment & ATS',
            ]}
            logo="/saptta-hr.png"
            locked={!products.includes('hrms')}
            onOpen={() => openHrApp(true)}
            onInstall={() => installHrApp()}
            onUpgrade={() => navigate('/pricing')}
          />
        </div>

        <div className="product-switcher__feature-bar ps-rise" style={{ animationDelay: '0.2s' }}>
          <div className="product-switcher__feature-bar-item">
            <div className="product-switcher__feature-bar-icon product-switcher__feature-bar-icon--green">
              <SafetyOutlined />
            </div>
            <div className="product-switcher__feature-bar-text">
              <div className="product-switcher__feature-bar-title">One login</div>
              <div className="product-switcher__feature-bar-sub">Secure &amp; private</div>
            </div>
          </div>
          <div className="product-switcher__feature-bar-divider" aria-hidden />
          <div className="product-switcher__feature-bar-item">
            <div className="product-switcher__feature-bar-icon product-switcher__feature-bar-icon--blue">
              <AppstoreOutlined />
            </div>
            <div className="product-switcher__feature-bar-text">
              <div className="product-switcher__feature-bar-title">One workspace</div>
              <div className="product-switcher__feature-bar-sub">Everything in one place</div>
            </div>
          </div>
          <div className="product-switcher__feature-bar-divider" aria-hidden />
          <div className="product-switcher__feature-bar-item">
            <div className="product-switcher__feature-bar-icon product-switcher__feature-bar-icon--purple">
              <SwapOutlined />
            </div>
            <div className="product-switcher__feature-bar-text">
              <div className="product-switcher__feature-bar-title">Switch anytime</div>
              <div className="product-switcher__feature-bar-sub">Seamlessly move between products</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface CardProps {
  index: number;
  variant: 'finance' | 'hr';
  name: string;
  headline: string;
  description: string;
  features: string[];
  logo: string;
  locked?: boolean;
  onOpen: () => void;
  onUpgrade?: () => void;
  onInstall?: () => void;
}

function ProductCard({
  index,
  variant,
  name,
  headline,
  description,
  features,
  logo,
  locked = false,
  onOpen,
  onUpgrade,
  onInstall,
}: CardProps) {
  return (
    <article
      className={[
        'product-switcher__card',
        `product-switcher__card--${variant}`,
        locked ? 'product-switcher__card--locked' : '',
        'ps-rise',
      ].filter(Boolean).join(' ')}
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
    >
      {!locked && (
        <div
          className={`product-switcher__card-glow product-switcher__card-glow--${variant}`}
          aria-hidden
        />
      )}

      <div className="product-switcher__card-head">
        <img
          src={logo}
          alt={name}
          className={['product-switcher__card-logo', locked ? 'product-switcher__card-logo--locked' : ''].filter(Boolean).join(' ')}
        />
        <p
          className={[
            'product-switcher__card-tag',
            `product-switcher__card-tag--${variant}`,
            locked ? 'product-switcher__card-tag--locked' : '',
          ].filter(Boolean).join(' ')}
        >
          {headline}
        </p>
      </div>

      <p className={['product-switcher__card-desc', locked ? 'product-switcher__card-desc--locked' : ''].filter(Boolean).join(' ')}>
        {description}
      </p>

      <div className="product-switcher__features">
        {features.map((f) => (
          <div key={f} className="product-switcher__feature-row">
            <span
              className={[
                'product-switcher__check',
                `product-switcher__check--${variant}`,
                locked ? 'product-switcher__check--locked' : '',
              ].filter(Boolean).join(' ')}
            >
              <CheckOutlined />
            </span>
            <span className={['product-switcher__feature-label', locked ? 'product-switcher__feature-label--locked' : ''].filter(Boolean).join(' ')}>
              {f}
            </span>
          </div>
        ))}
      </div>

      <div className="product-switcher__actions">
        {locked ? (
          <Button
            block
            onClick={onUpgrade}
            className={`product-switcher__upgrade-btn product-switcher__open-btn--${variant}`}
            style={{ borderColor: variant === 'finance' ? '#10b981' : '#ff6d00', color: variant === 'finance' ? '#10b981' : '#ff6d00' }}
          >
            Activate {name} <ArrowRightOutlined />
          </Button>
        ) : (
          <>
            <Button
              type="primary"
              block
              onClick={onOpen}
              className={`product-switcher__open-btn product-switcher__open-btn--${variant}`}
            >
              Open {name} <ArrowRightOutlined />
            </Button>
            {onInstall && (
              <Button
                block
                onClick={onInstall}
                icon={<AppstoreOutlined />}
                className="product-switcher__desktop-btn"
              >
                Use as Desktop App
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
