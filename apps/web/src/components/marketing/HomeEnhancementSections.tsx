import { useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  WalletOutlined,
  CrownOutlined,
  CloseOutlined,
  CheckOutlined,
  RightOutlined,
  CalendarOutlined,
  TeamOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import MarketingImageFrame from './MarketingImageFrame';
import type { MarketingImageKey } from '../../data/marketing-images';

type SectionProps = { isMobile: boolean };

const PERSONAS = [
  {
    role: 'HR Manager',
    pain: 'Chasing attendance sheets, leave emails, and payslip requests',
    outcome: 'Attendance, leave, payroll, and payslips — all in one HR system',
    imageKey: 'modularHrms' as MarketingImageKey,
    path: '/hrms',
    accent: '#FF6D00',
    icon: <UserOutlined />,
    cta: 'Explore HRMS',
  },
  {
    role: 'Finance Head / CA',
    pain: 'GST books, GSTR exports, and reconciliation eating your month-end',
    outcome: 'Invoicing, ledger, bank rec, and GSTR-ready exports',
    imageKey: 'modularAccounts' as MarketingImageKey,
    path: '/accounts',
    accent: '#1E2A78',
    icon: <WalletOutlined />,
    cta: 'Explore Finance',
  },
  {
    role: 'Business Owner',
    pain: 'HR and accounts run on different tools that never match',
    outcome: 'One login — people, payroll, and books stay in sync',
    imageKey: 'modularComplete' as MarketingImageKey,
    path: '/pricing',
    accent: '#059669',
    icon: <CrownOutlined />,
    cta: 'See Complete plan',
  },
] as const;

const BEFORE_ITEMS = [
  'Excel attendance & leave trackers',
  'WhatsApp for approvals & payslips',
  'Manual PF, ESI & TDS calculations',
  'Tally + spreadsheets for GST books',
  'No audit trail across HR & finance',
];

const AFTER_ITEMS = [
  'Digital attendance & leave workflows',
  'Automated payroll with statutory compliance',
  'Salary posts to ledger automatically',
  'GSTR-1 & GSTR-3B export-ready',
  'Full audit trail on every action',
];

const SCREENSHOTS: { label: string; desc: string; imageKey: MarketingImageKey }[] = [
  { label: 'HR Dashboard', desc: 'Workforce overview at a glance', imageKey: 'hrmsDashboard' },
  { label: 'Payroll', desc: 'PF, ESI, TDS & payslips', imageKey: 'payrollDashboard' },
  { label: 'Attendance', desc: 'Punches, shifts & leave calendar', imageKey: 'homeScreenshotAttendance' },
  { label: 'GST & Invoicing', desc: 'CGST/SGST/IGST & GSTR export', imageKey: 'gstDashboard' },
];

const START_STEPS = [
  { step: '1', label: 'Sign up free', desc: 'Create your workspace in minutes', icon: <TeamOutlined /> },
  { step: '2', label: 'Add your company', desc: 'Employees, chart of accounts, GST details', icon: <FileTextOutlined /> },
  { step: '3', label: 'Go live', desc: 'Run payroll or raise your first invoice', icon: <CalendarOutlined /> },
];

export function HomePersonaSection({ isMobile }: SectionProps) {
  const navigate = useNavigate();

  return (
    <section className="home-personas responsive-padding" aria-labelledby="home-personas-heading">
      <div className="home-personas__inner">
        <ScrollReveal animation="fade-in-up">
          <HomeSectionHeader
            eyebrow="Who it's for"
            title="Built for the People Who"
            titleHighlight="Run Your Business"
            titleHighlightSameLine
            subtitle="Whether you manage people, books, or both — Saptta fits how Indian teams actually work."
            theme="navy"
            isMobile={isMobile}
            maxWidth={760}
            headingId="home-personas-heading"
            className="home-personas__header"
          />
        </ScrollReveal>

        <div className="home-personas__grid">
          {PERSONAS.map((persona, index) => (
            <ScrollReveal key={persona.role} animation="fade-in-up" delay={index * 60}>
              <article
                className="home-persona-card"
                style={{ ['--persona-accent' as string]: persona.accent }}
              >
                <div className="home-persona-card__visual">
                  <MarketingImageFrame
                    imageKey={persona.imageKey}
                    variant="card"
                    aspect="16/10"
                    className="home-persona-card__img"
                  />
                </div>
                <div className="home-persona-card__body">
                  <div className="home-persona-card__head">
                    <div className="home-persona-card__icon" aria-hidden>
                      {persona.icon}
                    </div>
                    <h3 className="home-persona-card__role">{persona.role}</h3>
                  </div>
                  <p className="home-persona-card__pain">{persona.pain}</p>
                  <div className="home-persona-card__outcome">
                    <CheckOutlined aria-hidden />
                    <span>{persona.outcome}</span>
                  </div>
                  <button
                    type="button"
                    className="home-persona-card__cta"
                    onClick={() => navigate(persona.path)}
                    aria-label={`${persona.cta} for ${persona.role}`}
                  >
                    {persona.cta}
                    <RightOutlined aria-hidden />
                  </button>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeBeforeAfterSection({ isMobile }: SectionProps) {
  return (
    <section className="home-before-after responsive-padding" aria-labelledby="home-before-after-heading">
      <div className="home-before-after__inner">
        <ScrollReveal animation="fade-in-up">
          <HomeSectionHeader
            eyebrow="The difference"
            title="From Scattered Tools to"
            titleHighlight="One Platform"
            titleHighlightSameLine
            subtitle="See what changes when HR, payroll, and finance share the same data — no re-entry, no spreadsheet exports."
            theme="navy"
            isMobile={isMobile}
            maxWidth={800}
            headingId="home-before-after-heading"
            className="home-before-after__header"
          />
        </ScrollReveal>

        <div className="home-before-after__compare">
          <ScrollReveal animation="fade-in-left" delay={40}>
            <div className="home-before-after__panel home-before-after__panel--before">
              <span className="home-before-after__label home-before-after__label--before">
                <CloseOutlined aria-hidden />
                Before Saptta
              </span>
              <MarketingImageFrame
                imageKey="beforeLegacy"
                variant="card"
                aspect="16/10"
                className="home-before-after__img"
              />
              <ul className="home-before-after__list">
                {BEFORE_ITEMS.map((item) => (
                  <li key={item}>
                    <CloseOutlined className="home-before-after__icon--bad" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-in-right" delay={80}>
            <div className="home-before-after__panel home-before-after__panel--after">
              <span className="home-before-after__label home-before-after__label--after">
                <CheckOutlined aria-hidden />
                With Saptta
              </span>
              <MarketingImageFrame
                imageKey="afterSaptta"
                variant="card"
                aspect="16/10"
                className="home-before-after__img"
              />
              <ul className="home-before-after__list">
                {AFTER_ITEMS.map((item) => (
                  <li key={item}>
                    <CheckOutlined className="home-before-after__icon--good" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export function HomeScreenshotsSection({ isMobile }: SectionProps) {
  return (
    <section className="home-screenshots responsive-padding" aria-labelledby="home-screenshots-heading">
      <div className="home-screenshots__inner">
        <ScrollReveal animation="fade-in-up">
          <HomeSectionHeader
            eyebrow="Inside the product"
            title="See Saptta"
            titleHighlight="In Action"
            titleHighlightSameLine
            subtitle="Real workflows for HR, payroll, attendance, and GST — built for Indian compliance."
            theme="navy"
            isMobile={isMobile}
            maxWidth={640}
            headingId="home-screenshots-heading"
            className="home-screenshots__header"
          />
        </ScrollReveal>

        <div className="home-screenshots__grid">
          {SCREENSHOTS.map((shot, index) => (
            <ScrollReveal key={shot.label} animation="fade-in-up" delay={index * 50}>
              <figure className="home-screenshot-card">
                <div className="home-screenshot-card__visual">
                  <MarketingImageFrame
                    imageKey={shot.imageKey}
                    variant="plain"
                    aspect="16/10"
                    className="home-screenshot-card__frame"
                  />
                </div>
                <figcaption className="home-screenshot-card__caption">
                  <strong>{shot.label}</strong>
                  <span>{shot.desc}</span>
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeFinalCtaSection({ isMobile }: SectionProps) {
  const navigate = useNavigate();

  return (
    <section className="home-final-cta responsive-padding" aria-labelledby="home-final-cta-heading">
      <div className="home-final-cta__inner">
        <ScrollReveal animation="fade-in-up">
          <div className="home-final-cta__banner">
            <div className="home-final-cta__copy">
              <p className="home-final-cta__eyebrow">Get started today</p>
              <h2 id="home-final-cta-heading" className="home-final-cta__title">
                Ready to run HR &amp; finance on one platform?
              </h2>
              <p className="home-final-cta__subtitle">
                14-day free trial · No credit card · Indian compliance built in
              </p>

              <div className="home-final-cta__steps" role="list" aria-label="How to get started">
                {START_STEPS.map((item) => (
                  <div key={item.step} className="home-final-cta__step" role="listitem">
                    <span className="home-final-cta__step-icon" aria-hidden>
                      {item.icon}
                    </span>
                    <div>
                      <span className="home-final-cta__step-num">Step {item.step}</span>
                      <strong className="home-final-cta__step-label">{item.label}</strong>
                      <span className="home-final-cta__step-desc">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="home-final-cta__actions">
                <button
                  type="button"
                  className="home-final-cta__btn home-final-cta__btn--primary"
                  onClick={() => navigate('/signup')}
                >
                  Start free trial
                  <RightOutlined />
                </button>
                <button
                  type="button"
                  className="home-final-cta__btn home-final-cta__btn--secondary"
                  onClick={() => navigate('/contact')}
                >
                  Book a demo
                </button>
              </div>
            </div>

            {!isMobile && (
              <div className="home-final-cta__visual" aria-hidden>
                <MarketingImageFrame
                  imageKey="ctaBanner"
                  variant="plain"
                  aspect="4/3"
                  className="home-final-cta__img"
                />
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
