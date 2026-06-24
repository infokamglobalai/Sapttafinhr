import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import useBreakpoint from '../../hooks/useBreakpoint';
import { IntegrationBrandLogo, type IntegrationLogoId } from './IntegrationLogos';

type Partner = {
  id: IntegrationLogoId;
  name: string;
  category: string;
  x: number;
  y: number;
};

const PARTNER_ORDER: Omit<Partner, 'x' | 'y'>[] = [
  { id: 'gmail', name: 'Gmail', category: 'Email' },
  { id: 'outlook', name: 'Outlook', category: 'Email' },
  { id: 'teams', name: 'Teams', category: 'Collaboration' },
  { id: 'slack', name: 'Slack', category: 'Communication' },
  { id: 'razorpay', name: 'Razorpay', category: 'Payments' },
  { id: 'tally', name: 'Tally', category: 'Accounting' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Notifications' },
];

const ORBIT_CENTER = 50;
const ORBIT_RADIUS = 41;

function orbitPoint(index: number, total: number) {
  const angleDeg = -90 + (360 / total) * index;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: ORBIT_CENTER + ORBIT_RADIUS * Math.cos(angleRad),
    y: ORBIT_CENTER + ORBIT_RADIUS * Math.sin(angleRad),
  };
}

const PARTNERS: Partner[] = PARTNER_ORDER.map((partner, index) => ({
  ...partner,
  ...orbitPoint(index, PARTNER_ORDER.length),
}));

const TRUST_POINTS = ['OAuth 2.0 secure connect', 'Real-time data sync', 'Enterprise-ready APIs'];

function HubLines() {
  const cx = ORBIT_CENTER;
  const cy = ORBIT_CENTER;
  return (
    <svg className="home-integrations-hub__lines" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id="int-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e2a78" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff6d00" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {PARTNERS.map((p) => (
        <line
          key={p.id}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="url(#int-line-grad)"
          strokeWidth="0.35"
          strokeDasharray="1.2 0.8"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle cx={cx} cy={cy} r="8" fill="rgba(255, 109, 0, 0.08)" stroke="rgba(255, 109, 0, 0.25)" strokeWidth="0.4" />
    </svg>
  );
}

export default function IntegrationPartnersSection() {
  const { isMobile } = useBreakpoint();

  return (
    <section className="home-integrations" aria-label="Works with the tools you already use">
      <div className="home-integrations__glow home-integrations__glow--left" aria-hidden />
      <div className="home-integrations__glow home-integrations__glow--right" aria-hidden />
      <div className="home-integrations__inner">
        <ScrollReveal animation="fade-in-down">
          <HomeSectionHeader
            eyebrow="Integrations"
            title="Works With The Tools"
            titleHighlight="You Already Use"
            titleHighlightSameLine
            subtitle="Connect email, collaboration, payments, and accounting — Saptta syncs with the stack your team already runs on."
            theme="navy"
            isMobile={isMobile}
            maxWidth={720}
            className="home-integrations__header"
          />
        </ScrollReveal>

        <ScrollReveal animation="fade-in-down" delay={40}>
          <h5 style={{
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#FF6D00',
            marginTop: -20,
            marginBottom: 30,
          }}>
            Razorpay Reconciliation &amp; Tally Payroll Export
          </h5>
        </ScrollReveal>

        <ScrollReveal animation="fade-in-up" delay={60}>
          <div className="home-integrations-hub" role="list" aria-label="Integration partners">
            {!isMobile && <HubLines />}

            <div className="home-integrations-hub__center" aria-hidden>
              <div className="home-integrations-hub__center-ring" />
              <img className="home-integrations-hub__logo" src="/logo.jpeg" alt="SAPTTA" />
              <span className="home-integrations-hub__label">Integration hub</span>
            </div>

            {PARTNERS.map((partner, index) => (
              <div
                key={partner.id}
                role="listitem"
                className="home-integrations-chip"
                style={
                  isMobile
                    ? { animationDelay: `${index * 40}ms` }
                    : {
                        ['--chip-x' as string]: `${partner.x}%`,
                        ['--chip-y' as string]: `${partner.y}%`,
                        animationDelay: `${index * 40}ms`,
                      }
                }
              >
                <div className="home-integrations-chip__card">
                  <div className="home-integrations-chip__logo">
                    <IntegrationBrandLogo
                      id={partner.id}
                      className={`home-integrations-chip__logo-svg home-integrations-chip__logo-svg--${partner.id}`}
                    />
                  </div>
                  <div className="home-integrations-chip__meta">
                    <span className="home-integrations-chip__name">{partner.name}</span>
                    <span className="home-integrations-chip__status">Connected</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-in-up" delay={120}>
          <div className="home-integrations-trust" aria-label="Integration capabilities">
            {TRUST_POINTS.map((point) => (
              <span key={point} className="home-integrations-trust__item">
                <CheckIcon />
                {point}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="7" fill="#FFF4E8" />
      <path d="M4 7l2 2 4-4" stroke="#FF6D00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
