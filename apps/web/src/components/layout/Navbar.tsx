import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../shared/ThemeToggle';

const productItems = [
  { key: '/products', label: 'All Products', desc: 'HRMS, Accounts & Mobile overview' },
  { key: '/hrms', label: 'HRMS', desc: 'HR, payroll and attendance' },
  { key: '/accounts', label: 'Accounts', desc: 'GST, billing and finance' },
  { key: '/mobile-app', label: 'Mobile App', desc: 'On-the-go access' },
];

const resourceItems = [
  { key: '/resources', label: 'Resource Hub', desc: 'Guides, pricing, and product docs' },
  { key: '/features', label: 'Platform Features', desc: 'Feature comparison matrix' },
];

type DropdownKey = 'products' | 'resources' | null;

const navLinks: { key: string; label: string; isDropdown?: DropdownKey }[] = [
  { key: 'products', label: 'Products', isDropdown: 'products' },
  { key: '/pricing', label: 'Pricing' },
  { key: 'resources', label: 'Resources', isDropdown: 'resources' },
  { key: '/about', label: 'About' },
  { key: '/contact', label: 'Contact' },
  { key: '/careers', label: 'Careers' },
];

function SapttaLogo({ size = 'default', onDark = false }: { size?: 'default' | 'large' | 'compact'; onDark?: boolean }) {
  const height = size === 'large' ? 56 : size === 'compact' ? 30 : 44;
  return (
    <div className={onDark ? 'saptta-logo saptta-logo--on-dark' : 'saptta-logo'} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <img src="/logo.jpeg" alt="Saptta" style={{ height, width: 'auto', objectFit: 'contain' }} />
    </div>
  );
}

export { SapttaLogo };

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`saptta-navbar__chevron${open ? ' saptta-navbar__chevron--open' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DropdownPanel({ items }: { items: { key: string; label: string; desc: string }[] }) {
  const location = useLocation();
  return (
    <div className="saptta-navbar__dropdown">
      <div className="saptta-navbar__dropdown-panel">
        <div className="saptta-navbar__dropdown-accent" />
        <div className="saptta-navbar__dropdown-body">
        {items.map((item) => {
          const active = location.pathname === item.key || location.pathname.startsWith(`${item.key}/`);
          return (
            <Link
              key={item.key}
              to={item.key}
              className={`saptta-navbar__dropdown-item${active ? ' saptta-navbar__dropdown-item--active' : ''}`}
            >
              <span className="saptta-navbar__dropdown-dot" />
              <div>
                <div className="saptta-navbar__dropdown-label">{item.label}</div>
                <div className="saptta-navbar__dropdown-desc">{item.desc}</div>
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { isDark } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1100);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [lockedDropdown, setLockedDropdown] = useState<DropdownKey>(null);
  const [mobileOpen, setMobileOpen] = useState<Record<string, boolean>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const onResize = () => setIsDesktop(window.innerWidth >= 1100);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setLockedDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setLockedDropdown(null);
  }, [location.pathname]);

  const isActive = (key: string) =>
    key === '/' ? location.pathname === '/' : location.pathname.startsWith(key);

  const dropdownItems: Record<string, typeof productItems> = {
    products: productItems,
    resources: resourceItems,
  };

  const isDropdownActive = (key: DropdownKey) => {
    const items = key ? dropdownItems[key] : [];
    return items.some((p) => location.pathname.startsWith(p.key));
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (dk: DropdownKey) => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown((current) => (current === dk ? null : current));
      closeTimerRef.current = null;
    }, 150);
  };

  const handleMenuEnter = (dk: DropdownKey) => {
    clearCloseTimer();
    if (lockedDropdown && lockedDropdown !== dk) {
      setLockedDropdown(null);
    }
    setOpenDropdown(dk);
  };

  const handleMenuLeave = (dk: DropdownKey) => {
    if (lockedDropdown === dk) return;
    scheduleClose(dk);
  };

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <header className={`saptta-navbar${scrolled ? ' saptta-navbar--scrolled' : ''}`}>
      <div className="saptta-navbar__inner">
        <Link to="/" className="saptta-navbar__logo" aria-label="Saptta home">
          <SapttaLogo />
        </Link>

        {isDesktop && (
          <nav ref={navRef} className="saptta-navbar__nav">
            {navLinks.map((link) => {
              if (link.isDropdown) {
                const dk = link.isDropdown;
                const isOpen = openDropdown === dk || lockedDropdown === dk;
                const isAct = isDropdownActive(dk);
                return (
                  <div
                    key={link.key}
                    className="saptta-navbar__menu"
                    onMouseEnter={() => handleMenuEnter(dk)}
                    onMouseLeave={() => handleMenuLeave(dk)}
                  >
                    <button
                      type="button"
                      className={`saptta-navbar__trigger${isAct ? ' saptta-navbar__trigger--active' : ''}${isOpen ? ' saptta-navbar__trigger--open' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (lockedDropdown === dk) {
                          setLockedDropdown(null);
                          setOpenDropdown(null);
                        } else {
                          setLockedDropdown(dk);
                          setOpenDropdown(dk);
                        }
                      }}
                    >
                      {link.label}
                      <Chevron open={isOpen} />
                      <span className="saptta-navbar__underline" />
                    </button>
                    {isOpen && <DropdownPanel items={dropdownItems[dk]} />}
                  </div>
                );
              }

              const active = isActive(link.key);
              return (
                <Link
                  key={link.key}
                  to={link.key}
                  className={`saptta-navbar__link${active ? ' saptta-navbar__link--active' : ''}`}
                >
                  {link.label}
                  <span className="saptta-navbar__underline" />
                </Link>
              );
            })}
          </nav>
        )}

        <div className="saptta-navbar__actions">
          {isDesktop && <ThemeToggle />}
          {isDesktop &&
            (isAuthenticated ? (
              <button type="button" className="saptta-navbar__cta" onClick={() => navigate('/app')}>
                Dashboard
              </button>
            ) : (
              <>
                <Button type="text" className="saptta-navbar__login" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <button type="button" className="saptta-navbar__cta" onClick={() => navigate('/signup')}>
                  Get free trial
                </button>
              </>
            ))}

          {!isDesktop && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ThemeToggle />
              <Button type="text" className="saptta-navbar__menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
                ☰
              </Button>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        width={300}
        closable={false}
        styles={{ 
          body: { padding: 0, background: isDark ? 'var(--color-bg-container)' : '#FFFFFF' }, 
          header: { background: isDark ? 'var(--color-bg-container)' : '#FFFFFF', borderBottom: isDark ? '1px solid var(--color-border)' : '1px solid #EAECEF' } 
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <SapttaLogo />
            <Button type="text" onClick={() => setDrawerOpen(false)} className="saptta-navbar__menu-btn" aria-label="Close menu">
              ✕
            </Button>
          </div>
        }
      >
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
          {navLinks.map((link) => {
            if (link.isDropdown) {
              const dk = link.isDropdown;
              const isAct = isDropdownActive(dk);
              const isExpanded = !!mobileOpen[dk];
              const items = dropdownItems[dk];
              return (
                <div key={link.key}>
                  <button
                    type="button"
                    onClick={() => setMobileOpen((prev) => ({ ...prev, [dk]: !prev[dk] }))}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 24px',
                      fontSize: 15,
                      fontWeight: isAct ? 600 : 500,
                      color: isAct ? '#1E2A78' : '#4B5563',
                      background: isAct ? '#F4F6FC' : 'transparent',
                      border: 'none',
                      borderLeft: `3px solid ${isAct ? '#1E2A78' : 'transparent'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {link.label}
                    <Chevron open={isExpanded} />
                  </button>
                  {isExpanded && (
                    <div style={{ background: isDark ? 'var(--color-bg-base)' : '#F8FAFC', borderLeft: isDark ? '3px solid var(--color-primary)' : '3px solid #1E2A78' }}>
                      {items.map((item) => {
                        const active = location.pathname === item.key || location.pathname.startsWith(`${item.key}/`);
                        return (
                          <Link
                            key={item.key}
                            to={item.key}
                            onClick={() => setDrawerOpen(false)}
                            style={{
                              display: 'block',
                              padding: '11px 24px 11px 28px',
                              fontSize: 14,
                              fontWeight: active ? 600 : 400,
                              color: active ? (isDark ? 'var(--color-primary)' : '#1E2A78') : (isDark ? 'var(--color-text-secondary)' : '#374151'),
                              textDecoration: 'none',
                              background: active ? (isDark ? 'var(--color-border)' : '#EEF2FF') : 'transparent',
                            }}
                          >
                            <div style={{ lineHeight: 1.3 }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{item.desc}</div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = isActive(link.key);
            return (
              <Link
                key={link.key}
                to={link.key}
                onClick={() => setDrawerOpen(false)}
                style={{
                  padding: '14px 24px',
                  fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  color: active ? (isDark ? 'var(--color-primary)' : '#1E2A78') : (isDark ? 'var(--color-text-secondary)' : '#4B5563'),
                  background: active ? (isDark ? 'var(--color-border)' : '#F4F6FC') : 'transparent',
                  textDecoration: 'none',
                  borderLeft: `3px solid ${active ? (isDark ? 'var(--color-primary)' : '#1E2A78') : 'transparent'}`,
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isAuthenticated ? (
              <button
                type="button"
                className="saptta-navbar__cta saptta-navbar__cta--block"
                onClick={() => { navigate('/app'); setDrawerOpen(false); }}
              >
                Dashboard
              </button>
            ) : (
              <>
                <Button
                  block
                  className="saptta-navbar__login"
                  onClick={() => { navigate('/login'); setDrawerOpen(false); }}
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E5E7EB' }}
                >
                  Login
                </Button>
                <button
                  type="button"
                  className="saptta-navbar__cta saptta-navbar__cta--block"
                  onClick={() => { navigate('/signup'); setDrawerOpen(false); }}
                >
                  Get free trial
                </button>
              </>
            )}
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
