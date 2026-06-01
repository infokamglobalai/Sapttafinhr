import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface CTABannerProps {
  title?: ReactNode;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryTo?: string;
  secondaryTo?: string;
  /** `hero` matches the home page section background */
  variant?: 'dark' | 'hero';
}

export default function CTABanner({
  title,
  subtitle = 'Join thousands of businesses using AI-powered automation.',
  primaryLabel = 'Start Free Trial',
  secondaryLabel = 'Book a Demo',
  primaryTo = '/signup',
  secondaryTo = '/contact',
  variant = 'dark',
}: CTABannerProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [hoveredBtn, setHoveredBtn] = useState<'primary' | 'secondary' | null>(null);
  const isHero = variant === 'hero';

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  return (
    <section
      className={isHero ? 'cta-banner-section cta-banner-section--hero' : 'cta-banner-section'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: isMobile ? '80px 20px' : '120px 40px',
        ...(isHero
          ? {}
          : {
              background: 'linear-gradient(135deg, #1E1245 0%, #2D1B69 35%, #1a237e 65%, #0D1B3E 100%)',
            }),
      }}
    >
      {/* ── Ambient glow orbs ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -160, left: -120, width: 560, height: 560,
          borderRadius: '50%',
          background: isHero
            ? 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, rgba(79,70,229,0) 70%)'
            : 'radial-gradient(circle, rgba(108,59,255,0.35) 0%, transparent 65%)',
          animation: isHero ? undefined : 'ctaOrb1 10s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', bottom: -180, right: -100, width: 500, height: 500,
          borderRadius: '50%',
          background: isHero
            ? 'radial-gradient(circle, rgba(37,151,241,0.10) 0%, rgba(37,151,241,0) 70%)'
            : 'radial-gradient(circle, rgba(56,189,248,0.22) 0%, transparent 65%)',
          animation: isHero ? undefined : 'ctaOrb2 13s ease-in-out infinite alternate',
        }} />
        {!isHero && (
          <>
            <div style={{
              position: 'absolute', top: '30%', right: '15%', width: 320, height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 65%)',
            }} />
            {/* Grid lines */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }} />
            {/* Shimmer line */}
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(108,59,255,0.4) 40%, rgba(56,189,248,0.4) 60%, transparent)',
            }} />
          </>
        )}
      </div>

      <style>{`
        @keyframes ctaOrb1 {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(50px,40px) scale(1.15); }
        }
        @keyframes ctaOrb2 {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(-40px,-30px) scale(1.1); }
        }
        @keyframes ctaDashFloat {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50%      { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes ctaPulse {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.08); }
        }
      `}</style>

      <div style={{
        maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        gap: isMobile ? 48 : 80,
      }}>

        {/* ── Left: Copy + CTAs ── */}
        <div style={{ flex: '0 0 50%', maxWidth: isMobile ? '100%' : 560 }}>

          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: isHero ? '#EEE8FF' : 'rgba(108,59,255,0.25)',
            border: isHero ? '1px solid #D8E0FA' : '1px solid rgba(108,59,255,0.45)',
            borderRadius: 999, padding: '6px 16px', marginBottom: 24,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: isHero ? '#6C3BFF' : '#818CF8',
              boxShadow: isHero ? 'none' : '0 0 10px #818CF8',
              display: 'inline-block',
              animation: isHero ? undefined : 'ctaPulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: isHero ? '#6C3BFF' : '#A5B4FC',
            }}>
              Trusted by 10,000+ Businesses
            </span>
          </div>

          {/* Headline */}
          <h2 style={{
            fontSize: isMobile ? 30 : 48,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: isHero ? '#0F172A' : '#FFFFFF',
            marginBottom: 18,
          }}>
            {title ?? (
              <>
                Transform Your HR &amp;{' '}
                <span style={{
                  background: isHero
                    ? 'linear-gradient(90deg, #1E2A78 0%, #6C3BFF 48%, #2BB673 100%)'
                    : 'linear-gradient(135deg, #818CF8 0%, #38BDF8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Finance Operations
                </span>{' '}
                Today
              </>
            )}
          </h2>

          {/* Subtitle */}
          <p style={{
            fontSize: isMobile ? 16 : 19,
            color: isHero ? '#64748B' : 'rgba(148,163,184,0.9)',
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 480,
          }}>
            {subtitle}
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <button
              onClick={() => navigate(primaryTo)}
              onMouseEnter={() => setHoveredBtn('primary')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                background: 'linear-gradient(135deg, #6C3BFF 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 999,
                padding: isMobile ? '13px 28px' : '15px 36px',
                fontSize: isMobile ? 14 : 16,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                boxShadow: hoveredBtn === 'primary'
                  ? isHero
                    ? '0 14px 32px rgba(108,59,255,0.32)'
                    : '0 0 60px rgba(108,59,255,0.7), 0 16px 40px rgba(0,0,0,0.5)'
                  : isHero
                    ? '0 10px 24px rgba(108,59,255,0.25)'
                    : '0 0 32px rgba(108,59,255,0.4), 0 8px 24px rgba(0,0,0,0.4)',
                transform: hoveredBtn === 'primary' ? 'translateY(-3px)' : 'none',
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {primaryLabel} →
            </button>
            <button
              onClick={() => navigate(secondaryTo)}
              onMouseEnter={() => setHoveredBtn('secondary')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                background: hoveredBtn === 'secondary'
                  ? isHero ? '#FFFFFF' : 'rgba(255,255,255,0.14)'
                  : isHero ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                color: isHero ? '#1E2A78' : '#E2E8F0',
                border: isHero ? '1.5px solid #D8E0FA' : '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 999,
                padding: isMobile ? '13px 28px' : '15px 36px',
                fontSize: isMobile ? 14 : 16,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transform: hoveredBtn === 'secondary' ? 'translateY(-3px)' : 'none',
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              ▶ {secondaryLabel}
            </button>
          </div>

          {/* Trust row */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 36,
            alignItems: 'center',
          }}>
            {[
              { icon: '⭐', text: '4.9/5 Rating' },
              { icon: '🔒', text: 'ISO 27001 Secure' },
              { icon: '🚀', text: 'Setup in < 1 day' },
            ].map((t) => (
              <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isHero ? '#64748B' : 'rgba(148,163,184,0.85)' }}>
                  {t.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Floating Dashboard Preview ── */}
        {!isMobile && (
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer ring glow */}
            <div style={{
              position: 'absolute', inset: -32,
              borderRadius: 32,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(108,59,255,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Floating dashboard card */}
            <div style={{
              width: '100%',
              maxWidth: 480,
              borderRadius: 24,
              background: isHero ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
              backdropFilter: isHero ? undefined : 'blur(24px)',
              WebkitBackdropFilter: isHero ? undefined : 'blur(24px)',
              border: isHero ? '1px solid #E8ECF4' : '1px solid rgba(255,255,255,0.14)',
              boxShadow: isHero
                ? '0 24px 60px rgba(30,42,120,0.10)'
                : '0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              overflow: 'hidden',
              animation: 'ctaDashFloat 6s ease-in-out infinite',
            }}>
              {/* Browser chrome */}
              <div style={{
                padding: '12px 16px',
                background: isHero ? '#F8FAFC' : 'rgba(255,255,255,0.05)',
                borderBottom: isHero ? '1px solid #E8ECF4' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,95,87,0.8)' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(254,188,46,0.8)' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(40,200,64,0.8)' }} />
                <div style={{
                  flex: 1, marginLeft: 8, background: isHero ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '4px 12px', fontSize: 11, color: isHero ? '#64748B' : 'rgba(148,163,184,0.7)',
                }}>
                  app.saptta.com/dashboard
                </div>
              </div>

              {/* Dashboard content */}
              <div style={{ padding: '16px 16px 20px' }}>
                {/* Top nav tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {['Overview', 'Payroll', 'HR', 'Finance'].map((tab, i) => (
                    <span key={tab} style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: i === 0 ? (isHero ? '#EEE8FF' : 'rgba(108,59,255,0.5)') : (isHero ? '#F8FAFC' : 'rgba(255,255,255,0.06)'),
                      color: i === 0 ? (isHero ? '#6C3BFF' : '#fff') : (isHero ? '#64748B' : 'rgba(148,163,184,0.7)'),
                      border: i === 0 ? (isHero ? '1px solid #D8E0FA' : '1px solid rgba(108,59,255,0.6)') : (isHero ? '1px solid #E8ECF4' : '1px solid rgba(255,255,255,0.06)'),
                    }}>{tab}</span>
                  ))}
                </div>

                {/* Stat cards row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Employees', value: '324', color: '#818CF8', up: '+12' },
                    { label: 'Payroll', value: '₹42L', color: '#34D399', up: '+8%' },
                    { label: 'Compliance', value: '94%', color: '#F59E0B', up: '+2%' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: isHero ? '#F8FAFC' : 'rgba(255,255,255,0.06)',
                      border: isHero ? '1px solid #E8ECF4' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '10px 10px 8px',
                    }}>
                      <div style={{ fontSize: 10, color: isHero ? '#64748B' : 'rgba(148,163,184,0.7)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: isHero ? '#0F172A' : '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginTop: 3 }}>{s.up} ↑</div>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div style={{
                  background: isHero ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                  border: isHero ? '1px solid #E8ECF4' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '12px 12px 8px',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isHero ? '#64748B' : 'rgba(148,163,184,0.8)', marginBottom: 10 }}>
                    Revenue Trend
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 50 }}>
                    {[30, 50, 40, 70, 60, 85, 75, 90, 80, 95, 88, 100].map((h, i) => (
                      <div key={i} style={{
                        flex: 1, borderRadius: '3px 3px 0 0',
                        height: `${h}%`,
                        background: i >= 10
                          ? 'linear-gradient(180deg, #818CF8, #6C3BFF)'
                          : `rgba(108,59,255,${0.2 + h * 0.004})`,
                      }} />
                    ))}
                  </div>
                </div>

                {/* Mini list */}
                {[
                  { name: 'Payroll processed', status: 'Complete', color: '#34D399' },
                  { name: 'GSTR-1 Filing', status: 'Due in 3d', color: '#F59E0B' },
                  { name: 'PF Submission', status: 'On track', color: '#34D399' },
                ].map((row) => (
                  <div key={row.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0',
                    borderTop: isHero ? '1px solid #EEF2F7' : '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ fontSize: 11, color: isHero ? '#475569' : 'rgba(203,213,225,0.85)' }}>{row.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: row.color,
                      background: `${row.color}18`, borderRadius: 999, padding: '2px 8px',
                    }}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating mini chips */}
            <div style={{
              position: 'absolute', top: 16, right: -16,
              background: isHero ? '#FFFFFF' : 'rgba(52,211,153,0.18)',
              border: isHero ? '1px solid #BBF7D0' : '1px solid rgba(52,211,153,0.4)',
              borderRadius: 10, padding: '8px 14px',
              boxShadow: isHero ? '0 8px 24px rgba(30,42,120,0.08)' : undefined,
              backdropFilter: isHero ? undefined : 'blur(12px)',
              animation: 'ctaDashFloat 4s ease-in-out infinite',
              animationDelay: '1s',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#34D399' }}>✓ Payroll Disbursed</div>
              <div style={{ fontSize: 12, fontWeight: 900, color: isHero ? '#0F172A' : '#fff' }}>₹42,80,000</div>
            </div>

            <div style={{
              position: 'absolute', bottom: 24, left: -24,
              background: isHero ? '#FFFFFF' : 'rgba(129,140,248,0.18)',
              border: isHero ? '1px solid #D8E0FA' : '1px solid rgba(129,140,248,0.4)',
              borderRadius: 10, padding: '8px 14px',
              boxShadow: isHero ? '0 8px 24px rgba(30,42,120,0.08)' : undefined,
              backdropFilter: isHero ? undefined : 'blur(12px)',
              animation: 'ctaDashFloat 5s ease-in-out infinite',
              animationDelay: '2s',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#818CF8' }}>🤖 AI Insight</div>
              <div style={{ fontSize: 11, color: isHero ? '#64748B' : 'rgba(203,213,225,0.85)' }}>3 compliance alerts</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
