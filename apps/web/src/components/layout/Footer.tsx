import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { message } from 'antd';
import { SapttaLogo } from './Navbar';
import { openCookieSettings } from '../legal/CookieConsent';

/* ─── Link data ─── */
const footerColumns = [
  {
    heading: 'Product',
    links: [
      { label: 'HRMS', to: '/hrms' },
      { label: 'Payroll', to: '/hrms' },
      { label: 'Finance & Accounting', to: '/accounts' },
      { label: 'Attendance', to: '/hrms' },
      { label: 'AI Reports', to: '/features' },
      { label: 'Compliance', to: '/features' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Resource Hub', to: '/resources' },
      { label: 'Product Guides', to: '/resources' },
      { label: 'Help Center', to: '/contact' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Book a Demo', to: '/contact' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'About Saptta', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Security', to: '/security' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'Contact Us', to: '/contact' },
      { label: 'Book a Demo', to: '/contact' },
      { label: 'Help Center', to: '/contact' },
      { label: 'Partners', to: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Security', to: '/security' },
      { label: 'Status', to: '/status' },
      { label: 'Cookie Settings', to: '/privacy#cookies', isCookieSettings: true },
    ],
  },
];

/* ─── Social icons ─── */
const socialLinks = [
  {
    id: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com', color: '#0A66C2',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: 'twitter', label: 'X (Twitter)', url: 'https://x.com', color: '#E2E8F0',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.855L2.25 2.25h6.877l4.264 5.633L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
  },
  {
    id: 'instagram', label: 'Instagram', url: 'https://instagram.com', color: '#E1306C',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: 'youtube', label: 'YouTube', url: 'https://youtube.com', color: '#FF0000',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: 'facebook', label: 'Facebook', url: 'https://facebook.com', color: '#1877F2',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const handleNewsletter = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.warning('Please enter a valid email address.');
      return;
    }
    setSubscribing(true);
    await new Promise((r) => setTimeout(r, 700));
    message.success('Thanks! You are subscribed to Saptta updates.');
    setEmail('');
    setSubscribing(false);
  };

  return (
    <footer style={{
      background: 'linear-gradient(180deg, #080C1F 0%, #0B0F2A 50%, #080C1F 100%)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Background decoration ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: -200, left: -100, width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: -80, width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '44px 20px 24px' : '56px 48px 28px', position: 'relative', zIndex: 1 }}>

        {/* ── Newsletter strip ── */}
        <div style={{
          borderRadius: 20,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: isMobile ? '22px 18px' : '28px 36px',
          marginBottom: isMobile ? 36 : 48,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 24 : 48,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 999, padding: '4px 12px', marginBottom: 10,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#818CF8', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#A5B4FC' }}>
                Newsletter
              </span>
            </div>
            <h3 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#F1F5F9', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Stay ahead of the curve
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.8)', margin: 0, lineHeight: 1.6 }}>
              Product launches, compliance updates &amp; AI drops — straight to your inbox.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
            <input
              type="email"
              placeholder="your@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNewsletter()}
              style={{
                flex: 1,
                minWidth: isMobile ? 0 : 260,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 10,
                padding: '11px 16px',
                fontSize: 14,
                color: '#F1F5F9',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleNewsletter}
              disabled={subscribing}
              style={{
                background: 'linear-gradient(135deg, #FF6D00, #FF9800)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 22px',
                fontSize: 14,
                fontWeight: 700,
                cursor: subscribing ? 'wait' : 'pointer',
                whiteSpace: 'nowrap' as const,
                boxShadow: '0 6px 22px rgba(255,109,0,0.25)',
                transition: 'opacity 0.18s',
                opacity: subscribing ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              {subscribing ? '…' : 'Subscribe →'}
            </button>
          </div>
        </div>

        {/* ── Main columns grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? 'repeat(2, 1fr)'
            : '2fr 1fr 1fr 1fr 1fr 1fr',
          gap: isMobile ? '28px 20px' : '0 48px',
          marginBottom: isMobile ? 32 : 40,
        }}>

          {/* Brand column */}
          <div style={{ gridColumn: isMobile ? '1 / -1' : undefined }}>
            <Link to="/" className="footer-brand-logo">
              <SapttaLogo size="compact" onDark />
            </Link>
            <p style={{
              fontSize: 13.5, color: 'rgba(148,163,184,0.75)', lineHeight: 1.7,
              marginBottom: 20, maxWidth: 260,
            }}>
              The AI-powered platform for HR, Payroll, Accounting &amp; Compliance. Built for modern businesses.
            </p>

            {/* Contact details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {[
                { icon: '📞', text: '+91 99 0000 7072' },
                { icon: '✉️', text: 'info@saptta.com', href: 'mailto:info@saptta.com' },
                { icon: '📍', text: 'India — Nationwide' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  {item.href ? (
                    <a href={item.href} style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', textDecoration: 'none' }}>
                      {item.text}
                    </a>
                  ) : (
                    <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)' }}>{item.text}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {socialLinks.map(s => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setHoveredSocial(s.id)}
                  onMouseLeave={() => setHoveredSocial(null)}
                  aria-label={s.label}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: hoveredSocial === s.id ? `${s.color}22` : 'rgba(255,255,255,0.06)',
                    border: hoveredSocial === s.id ? `1px solid ${s.color}55` : '1px solid rgba(255,255,255,0.08)',
                    color: hoveredSocial === s.id ? s.color : 'rgba(148,163,184,0.65)',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                    transform: hoveredSocial === s.id ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {footerColumns.map(col => (
            <div key={col.heading}>
              <p style={{
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                color: 'rgba(148,163,184,0.5)', marginBottom: 16,
              }}>
                {col.heading}
              </p>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => {
                  const key = `${col.heading}-${link.label}`;
                  const active = hoveredLink === key;
                  const content = (
                    <span style={{
                      fontSize: 13.5, fontWeight: 400,
                      color: active ? '#E2E8F0' : 'rgba(148,163,184,0.7)',
                      transition: 'color 0.15s ease',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {link.label}
                      {active && <span style={{ fontSize: 11, color: '#818CF8' }}>→</span>}
                    </span>
                  );

                  if ('isCookieSettings' in link && link.isCookieSettings) {
                    return (
                      <button
                        key={link.label}
                        type="button"
                        onClick={openCookieSettings}
                        onMouseEnter={() => setHoveredLink(key)}
                        onMouseLeave={() => setHoveredLink(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' as const }}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      style={{ textDecoration: 'none' }}
                      onMouseEnter={() => setHoveredLink(key)}
                      onMouseLeave={() => setHoveredLink(null)}
                    >
                      {content}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)',
          marginBottom: isMobile ? 18 : 24,
        }} />

        {/* ── Bottom bar ── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          justifyContent: 'space-between',
          gap: 16,
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(100,116,139,0.8)' }}>
            © 2026 Saptta Technologies Pvt. Ltd. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
