import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer } from 'antd';
import industriesData from '../../data/industries-data';
import { useAuth } from '../../contexts/AuthContext';

const productItems = [
  { key: '/hrms', label: 'HRMS Solutions', desc: 'HR, Payroll & Attendance' },
  { key: '/accounts', label: 'Accounts', desc: 'GST, Billing & Finance' },
  { key: '/mobile-app', label: 'Mobile App', desc: 'On-the-go access' },
];

const industryItems = industriesData.map(i => ({
  key: `/industries/${i.slug}`,
  label: i.title,
  desc: i.tagline,
}));

const aboutItems = [
  { key: '/about', label: 'Company Info', desc: 'Learn about our mission and team' },
  { key: '/contact', label: 'Contact Us', desc: 'Get in touch for support or sales' },
];

const solutionItems = [
  ...productItems,
];

type DropdownKey = 'about' | 'solution' | 'industries' | null;

const navLinks: { key: string; label: string; isDropdown?: DropdownKey }[] = [
  { key: '/', label: 'Home' },
  { key: 'about', label: 'About', isDropdown: 'about' },
  { key: 'solution', label: 'Solution', isDropdown: 'solution' },
  { key: 'industries', label: 'Industries', isDropdown: 'industries' },
  { key: '/features', label: 'Features' },
  { key: '/pricing', label: 'Pricing' },
];

function SapttaLogo({ size = 'default' }: { size?: 'default' | 'large' }) {
  const height = size === 'large' ? 80 : 54;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <img
        src="/logo.png"
        alt="saptta"
        style={{ height, width: 'auto', display: 'block', objectFit: 'contain', transition: 'height 0.25s ease' }}
      />
    </div>
  );
}

export { SapttaLogo };

function DropdownPanel({
  items,
  grid = false,
  viewAllPath,
  viewAllLabel,
}: {
  items: { key: string; label: string; desc: string }[];
  grid?: boolean;
  viewAllPath?: string;
  viewAllLabel?: string;
}) {
  const location = useLocation();
  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#FFFFFF',
      border: '1px solid #EAECEF',
      borderRadius: 14,
      boxShadow: '0 16px 48px rgba(10,17,40,0.12)',
      width: grid ? 520 : 280,
      overflow: 'hidden',
      zIndex: 100,
      animation: 'dropdownFadeIn 0.15s ease',
    }}>
      {/* Header strip */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #FF6D00, #FF9800)' }} />

      <div style={{
        display: grid ? 'grid' : 'flex',
        gridTemplateColumns: grid ? '1fr 1fr' : undefined,
        flexDirection: grid ? undefined : 'column',
        gap: 2,
        padding: '10px 10px 8px',
      }}>
        {items.map(item => {
          const active = location.pathname === item.key || location.pathname.startsWith(item.key + '/');
          return (
            <Link
              key={item.key}
              to={item.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                textDecoration: 'none',
                borderRadius: 8,
                background: active ? '#FFF4EC' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? '#FFF4EC' : 'transparent'; }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                background: active ? '#FF6D00' : '#D1D5DB',
                transition: 'background 0.15s',
              }} />
              <div>
                <div style={{
                  fontSize: 13, fontWeight: active ? 700 : 600,
                  color: active ? '#FF6D00' : '#0A1128',
                  lineHeight: 1.3,
                }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2, lineHeight: 1.4 }}>
                  {item.desc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer link */}
      {viewAllPath && (
        <div style={{ borderTop: '1px solid #F1F3F5', padding: '8px 20px' }}>
          <Link
            to={viewAllPath}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12.5, fontWeight: 600, color: '#FF6D00', textDecoration: 'none',
            }}
          >
            {viewAllLabel ?? 'View all'} →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1100);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [lockedDropdown, setLockedDropdown] = useState<DropdownKey>(null);
  const [mobileOpen, setMobileOpen] = useState<Record<string, boolean>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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

  useEffect(() => { setOpenDropdown(null); setLockedDropdown(null); }, [location.pathname]);

  const isActive = (key: string) =>
    key === '/' ? location.pathname === '/' : location.pathname.startsWith(key);

  const isAboutActive = aboutItems.some(p => location.pathname.startsWith(p.key));
  const isSolutionActive = solutionItems.some(p => location.pathname.startsWith(p.key));
  const isIndustryActive = industryItems.some(p => location.pathname.startsWith(p.key));

  const dropdownItems: Record<DropdownKey & string, typeof productItems> = {
    about: aboutItems,
    solution: solutionItems,
    industries: industryItems,
  };

  const isDropdownActive = (key: DropdownKey) =>
    key === 'about' ? isAboutActive : key === 'solution' ? isSolutionActive : key === 'industries' ? isIndustryActive : false;

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,0.95)' : '#FFFFFF',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: '1px solid #EAECEF',
      boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
      transition: 'all 0.25s ease',
    }}>
      <div style={{
        maxWidth: 1320, margin: '0 auto', padding: '0 24px', height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <SapttaLogo size={isDesktop && !scrolled ? 'large' : 'default'} />
        </Link>

        {/* Desktop Nav */}
        {isDesktop && (
          <nav ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}>
            {navLinks.map(link => {
              if (link.isDropdown) {
                const dk = link.isDropdown;
                const isOpen = openDropdown === dk || lockedDropdown === dk;
                const isAct = isDropdownActive(dk);
                return (
                  <div
                    key={link.key}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => { if (!lockedDropdown) setOpenDropdown(dk); }}
                    onMouseLeave={() => { if (!lockedDropdown) setOpenDropdown(null); }}
                  >
                    <button
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
                      style={{
                        position: 'relative', padding: '10px 14px', fontSize: 14,
                        fontWeight: isAct ? 600 : 500,
                        color: isAct || isOpen ? '#FF6D00' : '#4B5563',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        transition: 'color 0.2s ease', whiteSpace: 'nowrap',
                      }}
                    >
                      {link.label}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', marginTop: 1 }}>
                        <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{
                        position: 'absolute', bottom: 0,
                        left: isAct ? '0' : '50%', width: isAct ? '100%' : '0',
                        height: 2, background: '#FF6D00', borderRadius: 1,
                        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </button>
                    {isOpen && (
                      <DropdownPanel
                        items={dropdownItems[dk]}
                        grid={dk === 'industries'}
                        viewAllPath={dk === 'industries' ? '/industries' : undefined}
                        viewAllLabel={dk === 'industries' ? 'All Industries' : undefined}
                      />
                    )}
                  </div>
                );
              }

              const active = isActive(link.key);
              return (
                <Link
                  key={link.key}
                  to={link.key}
                  style={{
                    position: 'relative', padding: '10px 14px', fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? '#FF6D00' : '#4B5563',
                    whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#FF6D00';
                      const line = e.currentTarget.querySelector('.nav-line') as HTMLElement;
                      if (line) { line.style.width = '100%'; line.style.left = '0'; }
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#4B5563';
                      const line = e.currentTarget.querySelector('.nav-line') as HTMLElement;
                      if (line) { line.style.width = '0'; line.style.left = '50%'; }
                    }
                  }}
                >
                  {link.label}
                  <span className="nav-line" style={{
                    position: 'absolute', bottom: 0,
                    left: active ? '0' : '50%', width: active ? '100%' : '0',
                    height: 2, background: '#FF6D00', borderRadius: 1,
                    transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  }} />
                </Link>
              );
            })}
          </nav>
        )}

        {/* Auth buttons + Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {isDesktop && (
            isAuthenticated ? (
              <Button
                type="primary"
                onClick={() => navigate('/app')}
                style={{ fontWeight: 600, height: 38, padding: '0 20px', borderRadius: 6, fontSize: 13.5, background: '#FF6D00', border: 'none', boxShadow: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E05300'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FF6D00'; }}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  style={{ fontWeight: 600, height: 38, padding: '0 16px', borderRadius: 6, fontSize: 13.5, color: '#4B5563', border: '1px solid #EAECEF', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF6D00'; e.currentTarget.style.color = '#FF6D00'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#EAECEF'; e.currentTarget.style.color = '#4B5563'; }}
                >
                  Sign In
                </Button>
                <Button
                  type="primary"
                  onClick={() => navigate('/pricing')}
                  style={{ fontWeight: 600, height: 38, padding: '0 20px', borderRadius: 6, fontSize: 13.5, background: '#FF6D00', border: 'none', boxShadow: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E05300'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FF6D00'; }}
                >
                  Get Started
                </Button>
              </>
            )
          )}
          {!isDesktop && (
            <Button
              type="text"
              onClick={() => setDrawerOpen(true)}
              style={{ fontSize: 24, color: '#FF6D00', padding: 0, height: 'auto', display: 'flex', alignItems: 'center', border: 'none', background: 'none' }}
            >
              ☰
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        placement="right" width={280} closable={false}
        styles={{ body: { padding: 0, background: '#FFFFFF' }, header: { background: '#FFFFFF', borderBottom: '1px solid #EAECEF' } }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <SapttaLogo />
            <Button type="text" onClick={() => setDrawerOpen(false)}
              style={{ fontSize: 20, color: '#4B5563', padding: 0, height: 'auto', border: 'none', background: 'none' }}>
              ✕
            </Button>
          </div>
        }
      >
        <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
          {navLinks.map(link => {
            if (link.isDropdown) {
              const dk = link.isDropdown;
              const isAct = isDropdownActive(dk);
              const isExpanded = !!mobileOpen[dk];
              const items = dropdownItems[dk];
              return (
                <div key={link.key}>
                  <button
                    onClick={() => setMobileOpen(prev => ({ ...prev, [dk]: !prev[dk] }))}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 24px', fontSize: 15,
                      fontWeight: isAct ? 600 : 500,
                      color: isAct ? '#FF6D00' : '#4B5563',
                      background: isAct ? '#F9FAFB' : 'transparent',
                      borderLeft: `3px solid ${isAct ? '#FF6D00' : 'transparent'}`,
                      border: 'none', borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {link.label}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div style={{ background: '#F9FAFB', borderLeft: '3px solid #FF6D00' }}>
                      {items.map(item => {
                        const active = location.pathname === item.key || location.pathname.startsWith(item.key + '/');
                        return (
                          <Link
                            key={item.key}
                            to={item.key}
                            onClick={() => setDrawerOpen(false)}
                            style={{
                              display: 'block', padding: '11px 24px 11px 28px', fontSize: 14,
                              fontWeight: active ? 600 : 400,
                              color: active ? '#FF6D00' : '#374151',
                              textDecoration: 'none',
                              background: active ? '#FFF4EC' : 'transparent',
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
                  padding: '14px 24px', fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#FF6D00' : '#4B5563',
                  background: active ? '#F9FAFB' : 'transparent',
                  textDecoration: 'none',
                  borderLeft: `3px solid ${active ? '#FF6D00' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isAuthenticated ? (
              <Button
                type="primary" block
                onClick={() => { navigate('/app'); setDrawerOpen(false); }}
                style={{ fontWeight: 600, height: 40, borderRadius: 6, background: '#FF6D00', border: 'none', boxShadow: 'none' }}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  block
                  onClick={() => { navigate('/login'); setDrawerOpen(false); }}
                  style={{ fontWeight: 600, height: 40, borderRadius: 6, color: '#4B5563', border: '1px solid #EAECEF' }}
                >
                  Sign In
                </Button>
                <Button
                  type="primary" block
                  onClick={() => { navigate('/pricing'); setDrawerOpen(false); }}
                  style={{ fontWeight: 600, height: 40, borderRadius: 6, background: '#FF6D00', border: 'none', boxShadow: 'none' }}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </nav>
      </Drawer>

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </header>
  );
}
