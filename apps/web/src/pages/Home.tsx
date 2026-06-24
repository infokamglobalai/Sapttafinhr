import { useEffect, useState, type ReactNode } from 'react';
import { Button, Row, Col, Collapse } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserOutlined,
  WalletOutlined,
  CalendarOutlined,
  TrophyOutlined,
  DollarCircleOutlined,
  LineChartOutlined,
  FundProjectionScreenOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  CloudServerOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  RightOutlined,
  TeamOutlined,
  BankOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CheckOutlined,
  BuildOutlined,
  ShopOutlined,
  CarOutlined,
  MedicineBoxOutlined,
  ToolOutlined,
  CodeOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { useInView, useInViewMulti } from '../hooks/useInView';
import ScrollReveal from '../components/shared/ScrollReveal';
import WhySapttaComparison from '../components/marketing/WhySapttaComparison';
import IntegrationPartnersSection from '../components/marketing/IntegrationPartnersSection';
import TrustedBySection from '../components/marketing/TrustedBySection';
import {
  HomePersonaSection,
  HomeBeforeAfterSection,
  HomeScreenshotsSection,
  HomeFinalCtaSection,
} from '../components/marketing/HomeEnhancementSections';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import type { MarketingImageKey } from '../data/marketing-images';
import { getMarketingImageSrc, getMarketingImageAlt, marketingImages } from '../data/marketing-images';
import { PLANS } from '../types';

const formatInr = (amount: number) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;

const HOME_PRICING_PLANS = (() => {
  const hrms = PLANS.find((p) => p.id === 'hrms')!;
  const finance = PLANS.find((p) => p.id === 'finance')!;
  const complete = PLANS.find((p) => p.id === 'saptta-complete')!;
  return [
    {
      title: 'HRMS',
      tagline: 'People ops & payroll',
      amount: formatInr(hrms.monthlyPrice),
      period: '/mo + GST',
      note: 'Up to 30 employees · +₹111 each after',
      annualNote: 'Attendance, payroll & compliance',
      features: ['Attendance & leave', 'Payroll, PF, ESI & TDS', 'Recruitment & performance'],
      path: '/hrms',
      featured: false,
      cta: 'View HRMS pricing',
    },
    {
      title: 'Saptta Complete',
      tagline: 'HR + Finance unified',
      amount: formatInr(complete.monthlyPrice),
      period: '/mo + GST',
      note: 'Both products · save ₹1,999/mo',
      annualNote: 'HRMS + Finance in one bundle',
      features: ['Everything in HRMS & Finance', 'Payroll-to-ledger sync', 'Unified reports & portal'],
      path: '/complete',
      featured: true,
      cta: 'Start free trial',
    },
    {
      title: 'Finance',
      tagline: 'Books & GST',
      amount: formatInr(finance.monthlyPrice),
      period: '/mo + GST',
      note: 'Per company · unlimited users',
      annualNote: 'Flat — like Zoho Books / Tally',
      features: ['GST invoicing & GSTR export', 'Ledger & reconciliation', 'Trial balance & P&L'],
      path: '/finance',
      featured: false,
      cta: 'View Finance pricing',
    },
  ] as const;
})();
const HERO_TRUST = [
  { icon: <BankOutlined />, text: 'Built for Indian SMBs' },
  { icon: <CloudServerOutlined />, text: 'Secure & Reliable Cloud' },
  { icon: <TeamOutlined />, text: '10–500+ Employees' },
];

const HERO_BENEFITS = ['14-Day Free Trial', 'No Credit Card Required', 'Quick Onboarding'];

const AUTOMATION_WORKFLOW: {
  label: string;
  desc: string;
  icon: ReactNode;
  color: string;
  imageKey: MarketingImageKey;
}[] = [
  {
    label: 'Candidate Hired',
    desc: 'Onboard in minutes — employee profile created',
    icon: <UserOutlined />,
    color: '#1E2A78',
    imageKey: 'automationHire',
  },
  {
    label: 'Attendance Recorded',
    desc: 'Punches and leave sync to payroll automatically',
    icon: <CalendarOutlined />,
    color: '#0EA5E9',
    imageKey: 'automationAttendance',
  },
  {
    label: 'Payroll Generated',
    desc: 'PF, ESI, TDS calculated and payslips issued',
    icon: <DollarCircleOutlined />,
    color: '#FF6D00',
    imageKey: 'automationPayroll',
  },
  {
    label: 'Accounting Updated',
    desc: 'Salary posts to ledger — books stay current',
    icon: <LineChartOutlined />,
    color: '#1E2A78',
    imageKey: 'automationAccounting',
  },
  {
    label: 'GST Ready',
    desc: 'Returns and compliance data export-ready',
    icon: <FundProjectionScreenOutlined />,
    color: '#059669',
    imageKey: 'automationGst',
  },
];

const MODULAR_PRODUCTS = [
  {
    title: 'HRMS: Payroll, Attendance & HR Lifecycle',
    tagline: 'Hire to payslip — people operations in one module.',
    accent: '#FF6D00',
    icon: <UserOutlined />,
    path: '/hrms',
    button: 'View HRMS',
    featured: false,
    modules: [
      { label: 'Attendance', icon: <CalendarOutlined /> },
      { label: 'Leave', icon: <TrophyOutlined /> },
      { label: 'Payroll', icon: <DollarCircleOutlined /> },
      { label: 'Employees', icon: <TeamOutlined /> },
    ],
    highlights: [
      { label: 'Employee self-service', icon: <UserOutlined /> },
      { label: 'Payslip & statutory reports', icon: <FileTextOutlined /> },
      { label: 'Shift & attendance rules', icon: <CalendarOutlined /> },
      { label: 'Onboarding workflows', icon: <TeamOutlined /> },
    ],
  },
  {
    title: 'Complete Bundle: HRMS + Finance on One Login',
    tagline: 'HR + Finance unified — one login, one source of truth.',
    accent: '#1E2A78',
    icon: <AppstoreOutlined />,
    path: '/complete',
    button: 'Explore Complete',
    featured: true,
    badge: 'Everything Included',
    moduleGroups: [
      {
        label: 'HRMS',
        modules: [
          { label: 'Attendance', icon: <CalendarOutlined /> },
          { label: 'Leave', icon: <TrophyOutlined /> },
          { label: 'Payroll', icon: <DollarCircleOutlined /> },
          { label: 'Employees', icon: <TeamOutlined /> },
        ],
      },
      {
        label: 'Finance',
        modules: [
          { label: 'Accounting', icon: <LineChartOutlined /> },
          { label: 'GST', icon: <FundProjectionScreenOutlined /> },
          { label: 'Expenses', icon: <CreditCardOutlined /> },
          { label: 'Invoicing', icon: <FileTextOutlined /> },
        ],
      },
    ],
  },
  {
    title: 'Finance: GST Invoicing, Ledger & Bank Reconciliation',
    tagline: 'Books, GST, and billing — built for Indian businesses.',
    accent: '#1E2A78',
    icon: <WalletOutlined />,
    path: '/finance',
    button: 'View Finance',
    featured: false,
    modules: [
      { label: 'Accounting', icon: <LineChartOutlined /> },
      { label: 'GST', icon: <FundProjectionScreenOutlined /> },
      { label: 'Expenses', icon: <CreditCardOutlined /> },
      { label: 'Invoicing', icon: <FileTextOutlined /> },
    ],
    highlights: [
      { label: 'GSTR-ready compliance', icon: <FundProjectionScreenOutlined /> },
      { label: 'Bank reconciliation', icon: <BankOutlined /> },
      { label: 'Multi-branch books', icon: <GlobalOutlined /> },
      { label: 'Vendor & customer ledger', icon: <WalletOutlined /> },
    ],
  },
  {
    title: 'Mobile Add-on',
    tagline: 'Geofenced attendance & expense claims on the go.',
    accent: '#7C3AED',
    icon: <MobileOutlined />,
    path: '/mobile-app',
    button: 'Explore Mobile',
    featured: false,
    modules: [
      { label: 'GPS Geofencing', icon: <GlobalOutlined /> },
      { label: 'Mobile Punches', icon: <CalendarOutlined /> },
      { label: 'Expense Uploads', icon: <CreditCardOutlined /> },
      { label: 'Team Directory', icon: <TeamOutlined /> },
    ],
    highlights: [
      { label: 'Android & iOS support', icon: <CheckOutlined /> },
      { label: 'Real-time location sync', icon: <GlobalOutlined /> },
      { label: 'Receipt photo capture', icon: <FileTextOutlined /> },
      { label: 'Offline punch buffering', icon: <CheckOutlined /> },
    ],
  },
] as const;

/* ── Hero reference visual (composite image) ── */
function HeroReferenceVisual() {
  const src = getMarketingImageSrc('homeHeroVisual');
  const alt = getMarketingImageAlt('homeHeroVisual');

  return (
    <div className="home-hero-ref">
      <img src={src} alt={alt} className="home-hero-ref__image" loading="eager" decoding="async" />
    </div>
  );
}

function HeroCarousel() {
  const navigate = useNavigate();
  const { area } = useParams<{ area?: string }>();
  const formattedArea = area ? area.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
  const areaSuffix = formattedArea ? ` ${formattedArea}` : '';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="responsive-padding home-hero home-hero--v2 home-hero--reference">
      <div className="home-hero__inner">
        <ScrollReveal animation="fade-in-left" className="home-hero__copy-col">
        <div className={`home-hero__copy${isMobile ? ' home-hero__copy--center' : ''}`}>
          <div className="home-hero__copy-main">
            <h1 className="home-hero-title home-hero-title--v2">
              <span className="home-hero-title__line">HRMS &amp; Finance Software</span>
              <span className="home-hero-title__line home-hero-title__line--accent">
                Built for <span className="home-hero-title__mark" style={{textDecoration:'none'}}>Bangalore{areaSuffix} SMBs</span>
              </span>
            </h1>
            <p className="home-hero-subtitle">
              Saptta - HRMS &amp; Finance Software is a cloud-based HRMS and Finance SaaS platform designed for Indian SMBs of 10–500 employees. Manage payroll, attendance, GST invoicing, and bank reconciliation in one platform. Built for Bangalore{areaSuffix} SMBs. Start free.
            </p>
          </div>

          <div className={`home-hero__copy-actions${isMobile ? ' home-hero__copy-actions--center' : ''}`}>
            <div className={`home-hero__ctas${isMobile ? ' home-hero__ctas--center' : ''}`}>
              <button type="button" className="home-hero__cta home-hero__cta--primary" onClick={() => navigate('/signup')}>
                Start Free <RightOutlined />
              </button>
              <button type="button" className="home-hero__cta home-hero__cta--demo" onClick={() => navigate('/contact')}>
                <CalendarOutlined /> Book Demo
              </button>
            </div>
            <div className={`home-hero__benefits${isMobile ? ' home-hero__benefits--center' : ''}`}>
              {HERO_BENEFITS.map((text) => (
                <span key={text} className="home-hero__benefit">
                  <CheckCircleOutlined className="home-hero__benefit-icon" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
        </ScrollReveal>
        <div className="home-hero__visual">
          <ScrollReveal animation="fade-in-right" delay={120} className="home-hero__visual-reveal">
            <HeroReferenceVisual />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   METRICS SECTION — Animated SaaS stats, dark navy + glass
   ───────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);
  return count;
}

const metricsData = [
  {
    icon: '👥',
    value: 50000,
    suffix: '+',
    label: 'Employees Managed',
    sublabel: 'Active employees across all platforms',
    color: '#818CF8',
    glow: 'rgba(99,102,241,0.45)',
    accent: 'rgba(99,102,241,0.15)',
  },
  {
    icon: '⚡',
    value: 99.9,
    suffix: '%',
    label: 'Platform Uptime',
    sublabel: 'Enterprise-grade reliability SLA',
    color: '#34D399',
    glow: 'rgba(16,185,129,0.45)',
    accent: 'rgba(16,185,129,0.12)',
    isDecimal: true,
  },
  {
    icon: '💰',
    value: 10,
    suffix: 'M+',
    label: 'Payroll Processed',
    sublabel: 'Total transactions handled',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.45)',
    accent: 'rgba(245,158,11,0.12)',
  },
  {
    icon: '🚀',
    value: 95,
    suffix: '%',
    label: 'Faster Recruitment',
    sublabel: 'Reduced time-to-hire vs manual',
    color: '#F472B6',
    glow: 'rgba(236,72,153,0.45)',
    accent: 'rgba(236,72,153,0.12)',
  },
  {
    icon: '🏢',
    value: 5000,
    suffix: '+',
    label: 'Companies',
    sublabel: 'SMBs to enterprise clients',
    color: '#38BDF8',
    glow: 'rgba(56,189,248,0.45)',
    accent: 'rgba(56,189,248,0.12)',
  },
];

function MetricCard({
  metric,
  isMobile,
  started,
}: {
  metric: typeof metricsData[0];
  isMobile: boolean;
  started: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const count = useCountUp(
    metric.isDecimal ? 999 : metric.value,
    2200,
    started
  );

  const displayValue = metric.isDecimal
    ? (count / 10).toFixed(1)
    : count >= 1000
    ? count >= 10000
      ? `${Math.floor(count / 1000)}K`
      : count.toLocaleString('en-IN')
    : count;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 24,
        padding: isMobile ? '28px 20px' : '36px 28px',
        background: hovered ? '#FFFFFF' : '#FFFFFF',
        border: hovered
          ? `1px solid ${metric.color}55`
          : '1px solid #E8ECF4',
        boxShadow: hovered
          ? `0 0 0 1px ${metric.color}22, 0 20px 44px rgba(30,42,120,0.10), 0 0 40px ${metric.glow}`
          : '0 8px 24px rgba(30,42,120,0.06)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMobile ? 'center' : 'flex-start',
        textAlign: isMobile ? 'center' : 'left',
      }}
    >
      {/* Background glow blob */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: metric.accent,
        filter: 'blur(50px)',
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.35s ease',
      }} />

      {/* Icon badge */}
      <div style={{
        width: isMobile ? 48 : 56,
        height: isMobile ? 48 : 56,
        borderRadius: 16,
        background: metric.accent,
        border: `1px solid ${metric.color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? 22 : 26,
        marginBottom: 20,
        boxShadow: hovered ? `0 0 24px ${metric.glow}` : 'none',
        transition: 'box-shadow 0.35s ease',
        flexShrink: 0,
      }}>
        {metric.icon}
      </div>

      {/* Animated number */}
      <div style={{
        fontSize: isMobile ? 38 : 52,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-0.035em',
        color: '#0F172A',
        marginBottom: 4,
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        textShadow: 'none',
        transition: 'text-shadow 0.35s ease',
      }}>
        {displayValue}
        <span style={{ color: metric.color, marginLeft: 2 }}>{metric.suffix}</span>
      </div>

      {/* Label */}
      <div style={{
        fontSize: isMobile ? 15 : 17,
        fontWeight: 700,
        color: '#1E293B',
        marginBottom: 6,
        letterSpacing: '-0.01em',
      }}>
        {metric.label}
      </div>

      {/* Sublabel */}
      <div style={{
        fontSize: 13,
        fontWeight: 400,
        color: '#64748B',
        lineHeight: 1.5,
      }}>
        {metric.sublabel}
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '10%',
        width: '80%',
        height: 2,
        borderRadius: 99,
        background: `linear-gradient(90deg, transparent, ${metric.color}88, transparent)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }} />
    </div>
  );
}

function MetricsSection({ isMobile }: { isMobile: boolean }) {
  const { ref: sectionRef, inView } = useInView(0.2);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (inView && !started) setStarted(true);
  }, [inView, started]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: isMobile ? '0px 20px 80px' : '0px 40px 120px',
      }}
    >
      {/* ── Floating ambient orbs (hero-style) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -120, right: -80,
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, rgba(79,70,229,0) 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -60,
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,151,241,0.10) 0%, rgba(37,151,241,0) 70%)',
        }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 48 : 72 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,109,0,0.10)',
            border: '1px solid rgba(255,109,0,0.22)',
            borderRadius: 999,
            padding: '6px 16px',
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6D00', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1E2A78' }}>
              Platform Impact
            </span>
          </div>
          <h2 style={{
            fontSize: isMobile ? 28 : 44,
            fontWeight: 900,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Numbers That Speak for Themselves
          </h2>
          <p style={{
            fontSize: isMobile ? 15 : 18,
            color: '#64748B',
            maxWidth: 520,
            margin: '0 auto',
            lineHeight: 1.65,
          }}>
            Join thousands of businesses that trust Saptta to run their HR, payroll and finance operations.
          </p>
        </div>

        {/* Metrics grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr 1fr'
            : 'repeat(5, 1fr)',
          gap: isMobile ? 14 : 20,
        }}>
          {metricsData.map((metric) => (
            <MetricCard
              key={metric.label}
              metric={metric}
              isMobile={isMobile}
              started={started}
            />
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div style={{
          marginTop: isMobile ? 48 : 72,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 16 : 24,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>
            Ready to add your company to these numbers?
          </p>
          <button
            onClick={() => {}}
            style={{
              background: 'linear-gradient(135deg, #FF6D00 0%, #FF9800 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 999,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(255,109,0,0.26)',
              letterSpacing: '0.02em',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 14px 32px rgba(255,109,0,0.30)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.transform = '';
              (e.target as HTMLButtonElement).style.boxShadow = '0 10px 24px rgba(255,109,0,0.26)';
            }}
          >
            Start Free Trial →
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {

  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeAutomationStep, setActiveAutomationStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAutomationStep((prev) => (prev + 1) % AUTOMATION_WORKFLOW.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const [hoveredComplianceCard, setHoveredComplianceCard] = useState<string | null>(null);

  return (
    <div className="home-page" style={{ overflow: 'hidden' }}>
      {/* ── 1. Centered Hero Carousel ── */}
      <HeroCarousel />

      <HomePersonaSection isMobile={isMobile} />

      <section className="home-automation responsive-padding home-section">
        <div className="home-automation__inner">
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="End-to-end automation"
              title="How Saptta Automates Your"
              titleHighlight="Business"
              titleHighlightSameLine
              subtitle="One hire triggers the full chain — HR, payroll, accounting, and GST stay in sync without manual handoffs."
              theme="navy"
              isMobile={isMobile}
              maxWidth={900}
              className="home-automation__header"
            />

            <div className="home-automation__layout">
              <div className="home-automation__workflow">
                <p className="home-automation__workflow-label">
                  <ThunderboltOutlined aria-hidden />
                  Automated workflow
                </p>
                <ol className="home-automation__steps" aria-label="Business automation workflow">
                  {AUTOMATION_WORKFLOW.map((step, index) => {
                    const isActive = activeAutomationStep === index;
                    const isPast = index < activeAutomationStep;
                    return (
                      <li key={step.label} className="home-automation__step-item">
                        <button
                          type="button"
                          className={`home-automation-step${isActive ? ' is-active' : ''}${isPast ? ' is-complete' : ''}`}
                          onClick={() => setActiveAutomationStep(index)}
                          aria-current={isActive ? 'step' : undefined}
                        >
                          <span className="home-automation-step__index" aria-hidden>
                            {isPast && !isActive ? <CheckOutlined /> : index + 1}
                          </span>
                          <span className="home-automation-step__icon" aria-hidden>
                            {step.icon}
                          </span>
                          <span className="home-automation-step__text">
                            <span className="home-automation-step__label">{step.label}</span>
                            <span className="home-automation-step__desc">{step.desc}</span>
                          </span>
                        </button>
                        {index < AUTOMATION_WORKFLOW.length - 1 ? (
                          <span
                            className={`home-automation-step__connector${isPast ? ' is-complete' : ''}`}
                            aria-hidden
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <p className="home-automation__footnote">
                  No re-entry. No spreadsheet exports. Each step flows into the next automatically.
                </p>
              </div>

              <aside className="home-automation__aside">
                <div className="home-automation-panel">
                  <div className="home-automation-panel__bar">
                    <span className="home-automation-panel__step">
                      Step {activeAutomationStep + 1} of {AUTOMATION_WORKFLOW.length}
                    </span>
                    <span className="home-automation-panel__badge">Live sync</span>
                  </div>
                  <div className="home-automation-panel__body">
                    <div className="home-automation-panel__content">
                      <h3 className="home-automation-panel__title">
                        {AUTOMATION_WORKFLOW[activeAutomationStep].label}
                      </h3>
                      <p className="home-automation-panel__desc">
                        {AUTOMATION_WORKFLOW[activeAutomationStep].desc}
                      </p>
                      <ul className="home-automation-panel__points">
                        <li>
                          <CheckOutlined aria-hidden />
                          Triggers the next step automatically
                        </li>
                        <li>
                          <CheckOutlined aria-hidden />
                          Audit trail on every action
                        </li>
                        <li>
                          <CheckOutlined aria-hidden />
                          HR &amp; finance share one data layer
                        </li>
                      </ul>
                    </div>
                    <div
                      className="home-automation-panel__visual"
                      key={AUTOMATION_WORKFLOW[activeAutomationStep].imageKey}
                    >
                      <MarketingImageFrame
                        imageKey={AUTOMATION_WORKFLOW[activeAutomationStep].imageKey}
                        variant="card"
                        aspect="16/10"
                        overlaySubtitle={AUTOMATION_WORKFLOW[activeAutomationStep].label}
                        className="home-automation-panel__img"
                      />
                    </div>
                    <div className="home-automation-panel__progress" aria-hidden>
                      {AUTOMATION_WORKFLOW.map((step, index) => (
                        <span
                          key={step.label}
                          className={`home-automation-panel__dot${index === activeAutomationStep ? ' is-active' : ''}${index < activeAutomationStep ? ' is-done' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="home-automation__stats" role="list">
                  {[
                    { value: '80%', label: 'Faster payroll runs' },
                    { value: '60%', label: 'Less manual work' },
                    { value: '100%', label: 'Audit-ready trail' },
                  ].map((m) => (
                    <div key={m.label} className="home-automation__stat" role="listitem">
                      <span className="home-automation__stat-value">{m.value}</span>
                      <span className="home-automation__stat-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-modular responsive-padding" aria-labelledby="home-modular-heading">
        <div className="home-modular__inner">
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="Product suite"
              title="Choose the Modules That Fit Your"
              titleHighlight="Business"
              titleHighlightSameLine
              subtitle="Start with HRMS or Finance, then scale to the complete suite. Every module shares the same compliance, security, and reporting layer."
              theme="navy"
              isMobile={isMobile}
              maxWidth={900}
              headingId="home-modular-heading"
              className="home-modular__header"
            />
          </ScrollReveal>

          <div className="home-modular-grid">
            {MODULAR_PRODUCTS.map((item, index) => (
              <ScrollReveal key={item.title} animation="fade-in-up" delay={index * 80}>
                <article
                  className={`home-modular-card${item.featured ? ' home-modular-card--featured' : ''}`}
                  style={{ ['--modular-accent' as string]: item.accent }}
                >
                  <div className="home-modular-card__top">
                    <div className="home-modular-card__head">
                      <div className="home-modular-card__icon" aria-hidden>
                        {item.icon}
                      </div>
                      <div className="home-modular-card__head-text">
                        <h3 className="home-modular-card__title">
                          {item.title}
                        </h3>
                        <p className="home-modular-card__tagline">{item.tagline}</p>
                      </div>
                    </div>
                    {'badge' in item && item.badge ? (
                      <span className="home-modular-card__badge">{item.badge}</span>
                    ) : null}
                  </div>

                  <div className="home-modular-card__body">
                    {'moduleGroups' in item && item.moduleGroups ? (
                      <div className="home-modular-card__groups" aria-label={`${item.title} modules`}>
                        {item.moduleGroups.map((group) => (
                          <div key={group.label} className="home-modular-card__group">
                            <span className="home-modular-card__group-label">{group.label}</span>
                            <ul className="home-modular-module-list">
                              {group.modules.map((mod) => (
                                <li key={mod.label} className="home-modular-module">
                                  <span className="home-modular-module__icon" aria-hidden>
                                    {mod.icon}
                                  </span>
                                  <span className="home-modular-module__label">{mod.label}</span>
                                  <CheckOutlined className="home-modular-module__check" aria-hidden />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : 'modules' in item ? (
                      <div className="home-modular-card__stack" aria-label={`${item.title} modules`}>
                        <div className="home-modular-card__block">
                          <span className="home-modular-card__includes">Included modules</span>
                          <ul className="home-modular-module-list">
                            {item.modules.map((mod) => (
                              <li key={mod.label} className="home-modular-module">
                                <span className="home-modular-module__icon" aria-hidden>
                                  {mod.icon}
                                </span>
                                <span className="home-modular-module__label">{mod.label}</span>
                                <CheckOutlined className="home-modular-module__check" aria-hidden />
                              </li>
                            ))}
                          </ul>
                        </div>
                        {'highlights' in item && item.highlights ? (
                          <div className="home-modular-card__block">
                            <span className="home-modular-card__includes">Key capabilities</span>
                            <ul className="home-modular-module-list">
                              {item.highlights.map((cap) => (
                                <li key={cap.label} className="home-modular-module">
                                  <span className="home-modular-module__icon" aria-hidden>
                                    {cap.icon}
                                  </span>
                                  <span className="home-modular-module__label">{cap.label}</span>
                                  <CheckOutlined className="home-modular-module__check" aria-hidden />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="home-modular-card__footer">
                    <Button
                      type={item.featured ? 'primary' : 'default'}
                      className={`home-modular-card__cta${item.featured ? ' home-modular-card__cta--primary' : ''}`}
                      onClick={() => navigate(item.path)}
                    >
                      {item.button}
                      <RightOutlined />
                    </Button>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <HomeScreenshotsSection isMobile={isMobile} />

      <WhySapttaComparison />

      {/* ── Industries We Serve ── */}
      <IndustriesSection isMobile={isMobile} />

      {/* ── 7. Compliance — tiered priority ── */}
      <section className="responsive-padding home-section home-compliance">
        <div className="home-section-inner home-compliance__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Compliance built-in"
              title="Compliance & Safety"
              titleHighlight="Standard"
              titleHighlightSameLine
              subtitle="Enterprise-grade controls built into every workflow for data safety, legal readiness, and operational trust."
              theme="navy"
              isMobile={isMobile}
              maxWidth={720}
            />
            <div className="home-section-pills home-compliance__badges">
              {['PF', 'ESI', 'TDS', 'GST', 'Encrypted', 'Audit-ready'].map((badge) => (
                <span key={badge} className="home-section-badge">
                  {badge}
                </span>
              ))}
            </div>
          </ScrollReveal>

          <div className="home-compliance__tier home-compliance__tier--primary">
            <p className="home-compliance__tier-label">High priority</p>
            <Row gutter={[20, 20]}>
              {[
                {
                  title: 'GST Compliance',
                  desc: 'GSTR-ready workflows, return tracking, and validated tax calculations aligned with Indian GST rules.',
                  accent: '#FF6D00',
                  iconBg: '#FFF4E8',
                  icon: <FundProjectionScreenOutlined />,
                },
                {
                  title: 'Payroll Compliance',
                  desc: 'PF, ESI, TDS, and salary statutory rules applied automatically before every payroll run.',
                  accent: '#1E2A78',
                  iconBg: '#EEF2FF',
                  icon: <DollarCircleOutlined />,
                },
                {
                  title: 'Data Security',
                  desc: 'Encryption at rest and in transit, secure access policies, and enterprise-grade data protection.',
                  accent: '#1E2A78',
                  iconBg: '#F0F4FF',
                  icon: <LockOutlined />,
                },
              ].map((f, i) => (
                <Col key={f.title} xs={24} md={8}>
                  <ScrollReveal animation="fade-in-up" delay={i * 70}>
                    <div
                      className={`home-compliance-card home-compliance-card--primary${hoveredComplianceCard === f.title ? ' is-hovered' : ''}`}
                      style={{ ['--compliance-accent' as string]: f.accent }}
                      onMouseEnter={() => setHoveredComplianceCard(f.title)}
                      onMouseLeave={() => setHoveredComplianceCard(null)}
                    >
                      <div className="home-compliance-card__icon" style={{ background: f.iconBg, color: f.accent }}>
                        {f.icon}
                      </div>
                      <h4 className="home-compliance-card__title">{f.title}</h4>
                      <p className="home-compliance-card__desc">{f.desc}</p>
                    </div>
                  </ScrollReveal>
                </Col>
              ))}
            </Row>
          </div>

          <div className="home-compliance__tier home-compliance__tier--secondary">
            <p className="home-compliance__tier-label">Secondary</p>
            <Row gutter={[16, 16]}>
              {[
                {
                  title: 'Audit Logs',
                  desc: 'Immutable trail of approvals, edits, and critical actions for internal and statutory audits.',
                  icon: <AuditOutlined />,
                },
                {
                  title: 'Backups',
                  desc: 'Scheduled backups and monitored restore points for business continuity.',
                  icon: <CloudServerOutlined />,
                },
                {
                  title: 'Access Control',
                  desc: 'Role-based permissions for HR, Finance, auditors, and admins.',
                  icon: <UserOutlined />,
                },
              ].map((f, i) => (
                <Col key={f.title} xs={24} sm={8}>
                  <ScrollReveal animation="fade-in-up" delay={220 + i * 60}>
                    <div
                      className={`home-compliance-card home-compliance-card--secondary${hoveredComplianceCard === f.title ? ' is-hovered' : ''}`}
                      onMouseEnter={() => setHoveredComplianceCard(f.title)}
                      onMouseLeave={() => setHoveredComplianceCard(null)}
                    >
                      <div className="home-compliance-card__icon home-compliance-card__icon--sm">
                        {f.icon}
                      </div>
                      <h4 className="home-compliance-card__title home-compliance-card__title--sm">{f.title}</h4>
                      <p className="home-compliance-card__desc home-compliance-card__desc--sm">{f.desc}</p>
                    </div>
                  </ScrollReveal>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </section>

      <section className="home-pricing responsive-padding" aria-labelledby="home-pricing-heading">
        <div className="home-pricing__inner">
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="Pricing"
              title="Transparent plans."
              titleHighlight="Scale as you grow."
              titleHighlightSameLine
              subtitle="Simple flat pricing — ₹4,999 for HRMS, ₹4,999 for Finance, or both on Saptta Complete for ₹7,999 and save ₹1,999/mo."
              theme="navy"
              isMobile={isMobile}
              maxWidth={720}
              className="home-pricing__header"
            />
          </ScrollReveal>

          <div className="home-pricing__trust" role="list" aria-label="Pricing guarantees">
            <span className="home-pricing__trust-item" role="listitem">14-day free trial</span>
            <span className="home-pricing__trust-item" role="listitem">No setup fees</span>
            <span className="home-pricing__trust-item" role="listitem">Cancel anytime</span>
          </div>

          <div className="home-pricing-grid">
            {HOME_PRICING_PLANS.map((plan, i) => (
              <ScrollReveal key={plan.title} animation="fade-in-up" delay={i * 80}>
                <article
                  className={`home-pricing-card${plan.featured ? ' home-pricing-card--featured' : ''}`}
                >
                  {plan.featured ? (
                    <span className="home-pricing-card__badge">Best value</span>
                  ) : null}
                  <div className="home-pricing-card__head">
                    <h3
                      id={plan.featured ? 'home-pricing-heading' : undefined}
                      className="home-pricing-card__title"
                    >
                      {plan.title}
                    </h3>
                    <p className="home-pricing-card__tagline">{plan.tagline}</p>
                  </div>
                  <div className="home-pricing-card__price">
                    <div className="home-pricing-card__price-row">
                      <span className="home-pricing-card__amount">{plan.amount}</span>
                      <span className="home-pricing-card__period">{plan.period}</span>
                    </div>
                    <span className="home-pricing-card__note">{plan.note}</span>
                    <span className="home-pricing-card__annual">{plan.annualNote}</span>
                  </div>
                  <ul className="home-pricing-card__features">
                    {plan.features.map((f) => (
                      <li key={f}>
                        <CheckOutlined className="home-pricing-card__check" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="home-pricing-card__footer">
                    <Button
                      type={plan.featured ? 'primary' : 'default'}
                      className={`home-pricing-card__cta${plan.featured ? ' home-pricing-card__cta--primary' : ''}`}
                      onClick={() => navigate(plan.path)}
                    >
                      {plan.cta}
                      <RightOutlined />
                    </Button>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>

          <p className="home-pricing__footnote">
            All prices exclude 18% GST. HRMS &amp; Complete include 30 employees; add more at just ₹111 each.{' '}
            <button type="button" className="home-pricing__link" onClick={() => navigate('/pricing')}>
              See full pricing
            </button>
          </p>
        </div>
      </section>

      <IntegrationPartnersSection />

      <section className="home-security responsive-padding" aria-labelledby="home-security-heading">
        <div className="home-security__inner">
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="Enterprise security"
              title="Client Confidentiality Is"
              titleHighlight="Our Priority"
              titleHighlightSameLine
              subtitle="Your sensitive HR, payroll, and financial data is protected by strict privacy controls. We never compromise on your data's safety."
              theme="navy"
              isMobile={isMobile}
              maxWidth={900}
              headingId="home-security-heading"
              className="home-security__header"
            />
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={40}>
            <div className="home-security__metrics" role="list" aria-label="Security guarantees">
              <div className="home-security__metric home-security__metric--primary" role="listitem">
                <span className="home-security__metric-value">99.9%</span>
                <div className="home-security__metric-text">
                  <span className="home-security__metric-label">Platform uptime</span>
                  <span className="home-security__metric-note">SLA-backed cloud availability</span>
                </div>
              </div>
              <div className="home-security__metric" role="listitem">
                <span className="home-security__metric-icon" aria-hidden>
                  <LockOutlined />
                </span>
                <div className="home-security__metric-text">
                  <span className="home-security__metric-label">Bank-grade security</span>
                  <span className="home-security__metric-note">AES-256 · encrypted in transit and at rest</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <div className="home-security__grid">
            {[
              {
                title: 'End-to-End Encryption',
                desc: 'All data is encrypted in transit and at rest using AES-256 standards.',
                icon: <LockOutlined />,
                accent: '#1E2A78',
              },
              {
                title: 'Strict Role-Based Access',
                desc: 'Granular permissions so only authorized users see payroll and ledger data.',
                icon: <AuditOutlined />,
                accent: '#1E2A78',
              },
              {
                title: 'Zero Data Selling Policy',
                desc: 'Your data stays yours — we never share or sell client information.',
                icon: <SafetyCertificateOutlined />,
                accent: '#FF6D00',
              },
            ].map((item, i) => (
              <ScrollReveal key={item.title} animation="fade-in-up" delay={80 + i * 60}>
                <article
                  className="home-security-card"
                  style={{ ['--security-accent' as string]: item.accent }}
                >
                  <div className="home-security-card__icon" aria-hidden>
                    {item.icon}
                  </div>
                  <h4 className="home-security-card__title">{item.title}</h4>
                  <p className="home-security-card__desc">{item.desc}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <HomeFinalCtaSection isMobile={isMobile} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   INDUSTRIES SECTION — Which sectors use Saptta
   ───────────────────────────────────────────────────────── */
const INDUSTRIES: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  accent: string;
  tags: string[];
  imageKey: MarketingImageKey;
}[] = [
  {
    icon: <BuildOutlined />,
    name: 'Construction & Real Estate',
    desc: 'Manage geofenced attendance for site workers, contractor payroll, and project-wise cost tracking.',
    accent: '#FF6D00',
    tags: ['Site attendance', 'Contractor payroll', 'Cost centers'],
    imageKey: 'industryConstruction',
  },
  {
    icon: <ShopOutlined />,
    name: 'Retail & Distribution',
    desc: 'Multi-branch employee records, shift management, GST invoicing, and vendor reconciliation in one place.',
    accent: '#1E2A78',
    tags: ['Multi-branch', 'Shift scheduling', 'GST invoicing'],
    imageKey: 'industryRetail',
  },
  {
    icon: <ToolOutlined />,
    name: 'Manufacturing',
    desc: 'Factory floor attendance, PF/ESI compliance for large workforces, and inventory-linked accounting.',
    accent: '#059669',
    tags: ['Factory workforce', 'PF & ESI', 'Inventory accounting'],
    imageKey: 'industryManufacturing',
  },
  {
    icon: <CodeOutlined />,
    name: 'IT Services & Startups',
    desc: 'Remote attendance, expense reimbursements, TDS filings, and clean financial reports for investors.',
    accent: '#7C3AED',
    tags: ['Remote work', 'Expense claims', 'Investor reports'],
    imageKey: 'industryIt',
  },
  {
    icon: <MedicineBoxOutlined />,
    name: 'Healthcare & Clinics',
    desc: 'Shift rosters for nurses and doctors, payslips, and GST-ready billing for medical supplies.',
    accent: '#DC2626',
    tags: ['Shift rosters', 'Payslips', 'Medical billing'],
    imageKey: 'industryHealthcare',
  },
  {
    icon: <CarOutlined />,
    name: 'Logistics & Transport',
    desc: 'Driver attendance via mobile app, route-wise cost tracking, and PF compliance for large fleets.',
    accent: '#0EA5E9',
    tags: ['Mobile punch', 'Fleet costs', 'PF compliance'],
    imageKey: 'industryLogistics' as const,
  },
];

function IndustriesSection({ isMobile }: { isMobile: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = INDUSTRIES[activeIdx];

  const goPrev = () => setActiveIdx((activeIdx - 1 + INDUSTRIES.length) % INDUSTRIES.length);
  const goNext = () => setActiveIdx((activeIdx + 1) % INDUSTRIES.length);

  return (
    <section className="home-industries" aria-labelledby="home-industries-heading">
      <div className="home-industries__inner responsive-padding">
        <ScrollReveal animation="fade-in-up">
          <HomeSectionHeader
            eyebrow="Industry solutions"
            title="Built for Every"
            titleHighlight="Indian Business"
            titleHighlightSameLine
            subtitle="Whether you run a factory, a clinic, or a startup — Saptta adapts to your workforce structure, compliance requirements, and accounting needs."
            theme="navy"
            isMobile={isMobile}
            maxWidth={820}
            headingId="home-industries-heading"
            className="home-industries__header"
          />
        </ScrollReveal>

        <ScrollReveal animation="fade-in-up" delay={60}>
          <div className="home-ind-panel">
            <div className="home-ind-panel__tabs" role="tablist" aria-label="Industry solutions">
              {INDUSTRIES.map((ind, i) => (
                <button
                  key={ind.name}
                  type="button"
                  role="tab"
                  aria-selected={activeIdx === i}
                  className={`home-ind-panel__tab${activeIdx === i ? ' home-ind-panel__tab--active' : ''}`}
                  onClick={() => setActiveIdx(i)}
                >
                  <span className="home-ind-panel__tab-icon" aria-hidden>{ind.icon}</span>
                  <span className="home-ind-panel__tab-label">{ind.name}</span>
                </button>
              ))}
            </div>

            <div className="home-ind-panel__content" key={activeIdx} role="tabpanel">
              <div className="home-ind-panel__visual">
                <MarketingImageFrame
                  imageKey={active.imageKey}
                  variant="plain"
                  aspect="4/3"
                  className="home-ind-panel__image"
                />
              </div>

              <div className="home-ind-panel__copy">
                <p className="home-ind-panel__eyebrow">Industry</p>
                <h3 className="home-ind-panel__title">{active.name}</h3>
                <p className="home-ind-panel__desc">{active.desc}</p>

                <ul className="home-ind-panel__tags">
                  {active.tags.map((tag) => (
                    <li key={tag}>
                      <CheckCircleOutlined aria-hidden />
                      <span>{tag}</span>
                    </li>
                  ))}
                </ul>

                <div className="home-ind-panel__footer">
                  <span className="home-ind-panel__counter">
                    {String(activeIdx + 1).padStart(2, '0')} / {String(INDUSTRIES.length).padStart(2, '0')}
                  </span>
                  <div className="home-ind-panel__nav">
                    <button type="button" className="home-ind-panel__nav-btn" onClick={goPrev} aria-label="Previous industry">
                      ←
                    </button>
                    <button type="button" className="home-ind-panel__nav-btn" onClick={goNext} aria-label="Next industry">
                      →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
