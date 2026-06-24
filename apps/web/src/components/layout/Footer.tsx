import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { message } from 'antd';
import { SapttaLogo } from './Navbar';
import { openCookieSettings } from '../legal/CookieConsent';

/* ─── Vector SVGs for Contact details ─── */
const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

/* ─── Vector SVGs for Social media ─── */
const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.855L2.25 2.25h6.877l4.264 5.633L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

/* ─── Link data ─── */
const footerColumns = [
  {
    heading: 'Product',
    links: [
      { label: 'HRMS', to: '/hrms' },
      { label: 'Payroll', to: '/hrms' },
      { label: 'Finance & Accounting', to: '/finance' },
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

/* ─── Stylesheets for professional B2B layout ─── */
const footerStyles = `
  .pro-footer-link {
    transition: color 0.18s ease, transform 0.18s ease;
    color: #94A3B8 !important;
    text-decoration: none;
    display: inline-block;
  }
  .pro-footer-link:hover {
    color: #F8FAFC !important;
    transform: translateX(3px);
  }
  
  .pro-social-icon {
    color: #64748B;
    transition: color 0.18s ease, transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .pro-social-icon:hover {
    color: #FF6D00;
    transform: translateY(-2px);
    background: rgba(255, 109, 0, 0.05);
    border-color: rgba(255, 109, 0, 0.25);
  }
  
  .pro-input {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 11px 16px;
    font-size: 14px;
    color: #F8FAFC;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
    width: 280px;
    font-family: inherit;
  }
  .pro-input:focus {
    border-color: #FF6D00;
    box-shadow: 0 0 0 2px rgba(255, 109, 0, 0.15);
    background: rgba(255, 255, 255, 0.05);
  }
  
  .pro-btn {
    background: linear-gradient(135deg, #FF6D00 0%, #FF8F00 100%);
    color: #FFFFFF;
    border: none;
    border-radius: 8px;
    padding: 11px 22px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(255, 109, 0, 0.15);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .pro-btn:hover {
    filter: brightness(1.08);
    box-shadow: 0 6px 16px rgba(255, 109, 0, 0.25);
    transform: translateY(-1px);
  }
  .pro-btn:hover .arrow-svg {
    transform: translateX(2px);
  }
  .pro-btn:active {
    transform: translateY(0);
  }

  .pro-contact-link {
    color: #94A3B8;
    text-decoration: none;
    transition: color 0.18s ease;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .pro-contact-link:hover {
    color: #F8FAFC;
  }

  @media (max-width: 767px) {
    .pro-input {
      width: 100%;
    }
  }
`;

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
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
      background: '#0B0F19', // Deep B2B slate blue-black
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      padding: isMobile ? '48px 20px 28px' : '64px 48px 32px',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style dangerouslySetInnerHTML={{ __html: footerStyles }} />

      {/* Subtle background light accents */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: -300, left: -100, width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -200, right: -100, width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,109,0,0.02) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Top Section: Integrated Newsletter ── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 28,
          paddingBottom: isMobile ? 36 : 48,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          marginBottom: isMobile ? 36 : 48,
        }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px', letterSpacing: '-0.01em', fontFamily: 'Sora, sans-serif' }}>
              Stay ahead of the curve
            </h3>
            <p style={{ fontSize: 14.5, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Product launches, compliance updates &amp; AI drops — straight to your inbox.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, width: isMobile ? '100%' : 'auto' }}>
            <input
              type="email"
              placeholder="your@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNewsletter()}
              className="pro-input"
            />
            <button
              onClick={handleNewsletter}
              disabled={subscribing}
              className="pro-btn"
            >
              {subscribing ? '...' : (
                <>
                  Subscribe
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.18s ease' }} className="arrow-svg">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Middle Section: Main Columns Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? 'repeat(2, 1fr)'
            : '2.5fr 1fr 1fr 1fr 1fr 1fr',
          gap: isMobile ? '36px 20px' : '0 32px',
          paddingBottom: isMobile ? 36 : 48,
        }}>

          {/* Brand/Contact column */}
          <div style={{ gridColumn: isMobile ? '1 / -1' : undefined, paddingRight: isMobile ? 0 : 24 }}>
            <Link to="/" style={{ display: 'inline-block', marginBottom: 16 }}>
              <SapttaLogo size="compact" onDark />
            </Link>
            <p style={{
              fontSize: 13.5, color: '#64748B', lineHeight: 1.65,
              marginBottom: 20, maxWidth: 280,
            }}>
              The AI-powered platform for HR, Payroll, Accounting &amp; Compliance. Built for modern businesses.
            </p>

            {/* Contact details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, fontSize: 13.5 }}>
              <a href="tel:+919900007072" className="pro-contact-link">
                <span style={{ display: 'inline-flex', color: '#64748B' }}><PhoneIcon /></span>
                <span>+91 99000 07072</span>
              </a>
              <a href="mailto:info@saptta.com" className="pro-contact-link">
                <span style={{ display: 'inline-flex', color: '#64748B' }}><MailIcon /></span>
                <span>info@saptta.com</span>
              </a>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#94A3B8' }}>
                <span style={{ display: 'inline-flex', color: '#64748B', marginTop: 3 }}><MapPinIcon /></span>
                <span style={{ lineHeight: 1.4 }}>
                  No. 45, 3rd Floor, 80 Feet Road, Koramangala 4th Block, Bangalore, Karnataka - 560034
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                GSTIN: 29AAFCS7072R1Z5
              </div>
            </div>
          </div>

          {/* Nav columns */}
          {footerColumns.map(col => (
            <div key={col.heading}>
              <h4 style={{
                fontSize: 11.5, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                color: '#475569', marginBottom: 16,
              }}>
                {col.heading}
              </h4>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => {
                  const content = (
                    <span className="pro-footer-link" style={{ fontSize: 13.5, fontWeight: 400 }}>
                      {link.label}
                    </span>
                  );

                  if ('isCookieSettings' in link && link.isCookieSettings) {
                    return (
                      <button
                        key={link.label}
                        type="button"
                        onClick={openCookieSettings}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' as const,
                          outline: 'none',
                        }}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      {content}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* ── Hyper-local Locations Served for Bangalore Local SEO ── */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          paddingTop: 16,
          paddingBottom: 8,
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: '#475569',
        }}>
          <span style={{ fontWeight: 600, color: '#64748B' }}>Bangalore locations served:</span>
          {['Koramangala', 'Whitefield', 'Electronic City', 'Indiranagar', 'HSR Layout', 'Mysuru'].map((loc) => (
            <Link key={loc} to={`/locations/${loc.toLowerCase().replace(' ', '-')}`} style={{ color: '#64748B', textDecoration: 'none' }} className="pro-footer-link">
              HRMS &amp; Payroll {loc}
            </Link>
          ))}
        </div>

        {/* ── Bottom Section: Copyright + Social Icons ── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: 24,
        }}>
          <span style={{ fontSize: 13, color: '#475569' }}>
            © 2026 Saptta Technologies Pvt. Ltd. All rights reserved.
          </span>

          {/* Social media icons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'linkedin', icon: <LinkedInIcon />, label: 'LinkedIn', url: 'https://linkedin.com' },
              { id: 'twitter', icon: <TwitterIcon />, label: 'X', url: 'https://x.com' },
              { id: 'instagram', icon: <InstagramIcon />, label: 'Instagram', url: 'https://instagram.com' },
              { id: 'youtube', icon: <YouTubeIcon />, label: 'YouTube', url: 'https://youtube.com' },
              { id: 'facebook', icon: <FacebookIcon />, label: 'Facebook', url: 'https://facebook.com' },
            ].map(s => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="pro-social-icon"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
