import { useState } from 'react';
import { Row, Col } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import MarketingHero from '../components/marketing/MarketingHero';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import useBreakpoint from '../hooks/useBreakpoint';

const HERO_GRADIENT = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 70%, #eef2ff 100%)';

const flowNotes = {
  hrms: {
    title: 'HRMS & attendance sync',
    desc: 'Geofence punch and roster data flow into payroll without manual timesheets.',
    steps: ['Geofence boundary verified', 'Shift hours captured', 'Leave balances updated'],
  },
  payroll: {
    title: 'Payroll & statutory engine',
    desc: 'PF, ESI, and TDS calculated from verified attendance — ready for payslips and filings.',
    steps: ['PF deductions applied', 'ESI contributions computed', 'TDS validated for salary'],
  },
  accounts: {
    title: 'Finance & GST ledger',
    desc: 'Payroll and invoicing post to the ledger with GST-ready records for reconciliation.',
    steps: ['Payroll journals posted', 'GST lines matched', 'Bank reconciliation updated'],
  },
} as const;

type FlowKey = keyof typeof flowNotes;

const convictions = [
  {
    title: 'Factual accuracy',
    desc: 'No dummy dashboards — metrics, geofence rules, and statutory runs use real formulas your team can audit.',
  },
  {
    title: 'Indian statutory core',
    desc: 'PF, ESI, TDS, CGST/SGST/IGST, and professional tax workflows built for how Indian teams operate.',
  },
  {
    title: 'Secure by design',
    desc: 'Encryption, RBAC, audit logs, and controlled access for HR and finance data at scale.',
  },
  {
    title: 'Mobile-first operations',
    desc: 'Field teams punch, claim expenses, and view payslips — managers approve from the same platform.',
  },
];

const milestones = [
  {
    year: '2024',
    title: 'Saptta founded',
    desc: 'Launched to replace fragmented payroll and bookkeeping tools used by growing Indian businesses.',
  },
  {
    year: '2025',
    title: 'Compliance automation',
    desc: 'Statutory discrepancy checks across PF, ESI, and salary TDS to cut manual reconciliation time.',
  },
  {
    year: '2026',
    title: 'Unified ledger sync',
    desc: 'Payroll runs post to finance with GSTR-ready records — one flow from people to books.',
  },
];

const techStack = [
  { code: 'UI', title: 'React & Vite', desc: 'Fast, responsive interfaces for HR and finance teams.' },
  { code: 'CL', title: 'Cloud hosting', desc: 'Encrypted storage with reliable backups and uptime.' },
  { code: 'KM', title: 'Key management', desc: 'Protected credentials and sensitive payroll data.' },
  { code: 'RP', title: 'Payment integrations', desc: 'Razorpay and bank feeds aligned with your ledger.' },
];

export default function About() {
  const { isMobile } = useBreakpoint();
  const [activeFlow, setActiveFlow] = useState<FlowKey>('hrms');
  const [visualizerKey, setVisualizerKey] = useState(0);

  const handleTabChange = (flow: FlowKey) => {
    setActiveFlow(flow);
    setVisualizerKey((prev) => prev + 1);
  };

  const active = flowNotes[activeFlow];

  return (
    <div className="marketing-page marketing-page--about">
      <MarketingHero
        eyebrow="About Saptta"
        title="HR & Finance"
        titleHighlight="built for India"
        titleHighlightSameLine
        subtitle="Unified workforce operations and statutory bookkeeping — honest data, one platform from attendance to ledger."
        stats={[
          { value: 'HRMS', label: 'People ops' },
          { value: 'GST', label: 'Finance ready' },
          { value: 'India', label: 'Compliance native' },
        ]}
        theme="navy"
        gradient={HERO_GRADIENT}
        primaryLabel="Book a demo"
        primaryTo="/contact"
        secondaryLabel="View products"
        secondaryTo="/products"
        heroImageKey="aboutOffice"
        heroImageVariant="plain"
      />

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <Row gutter={[48, 40]} align="middle">
            <Col xs={24} lg={11}>
              <ScrollReveal animation="fade-in-left">
                <span className="about-section__eyebrow">The problem we solve</span>
                <h2 className="about-section__title">
                  Legacy tools make HR and finance fractured
                </h2>
                <p className="about-section__body">
                  Siloed HR databases, manual registers, spreadsheets, and disconnected invoices create
                  errors and compliance risk.
                </p>
                <p className="about-section__body">
                  <strong>Saptta</strong> connects attendance, Indian statutory payroll, and double-entry
                  accounting so operations flow straight into your books.
                </p>
                <ul className="about-section__checks">
                  <li>
                    <CheckOutlined aria-hidden />
                    Honest, auditable data
                  </li>
                  <li>
                    <CheckOutlined aria-hidden />
                    Indian statutory native
                  </li>
                </ul>
              </ScrollReveal>
            </Col>
            <Col xs={24} lg={13}>
              <ScrollReveal animation="fade-in-right">
                <MarketingImageFrame imageKey="aboutUnified" variant="plain" aspect="16/10" />
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="How it connects"
              title="One workflow"
              titleHighlight="across modules"
              titleHighlightSameLine
              subtitle="See how personnel data moves from HRMS into payroll and your finance ledger."
              theme="navy"
              maxWidth={560}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-up" delay={80}>
            <div className="about-flow-card">
              <div className="about-flow-card__tabs" role="tablist" aria-label="Module workflow">
                {(
                  [
                    { key: 'hrms' as const, label: 'HRMS' },
                    { key: 'payroll' as const, label: 'Payroll' },
                    { key: 'accounts' as const, label: 'Finance' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeFlow === tab.key}
                    className={`about-flow-card__tab${activeFlow === tab.key ? ' about-flow-card__tab--active' : ''}`}
                    onClick={() => handleTabChange(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div key={visualizerKey} className="about-flow-card__panel">
                <h3 className="about-flow-card__panel-title">{active.title}</h3>
                <p className="about-flow-card__panel-desc">{active.desc}</p>
                <ul className="about-flow-card__steps">
                  {active.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Principles"
              title="Core operational"
              titleHighlight="convictions"
              titleHighlightSameLine
              subtitle="What guides every module we ship for Indian businesses."
              theme="navy"
              maxWidth={520}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <Row gutter={[20, 20]} className="about-convictions-grid">
            {convictions.map((conv, i) => (
              <Col key={conv.title} xs={24} md={12}>
                <ScrollReveal animation="fade-in-up" delay={i * 60}>
                  <article className="about-conviction-card">
                    <h4 className="about-conviction-card__title">{conv.title}</h4>
                    <p className="about-conviction-card__desc">{conv.desc}</p>
                  </article>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Timeline"
              title="Our journey"
              titleHighlight="& milestones"
              titleHighlightSameLine
              theme="navy"
              maxWidth={480}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <div className="about-timeline">
            {milestones.map((milestone) => (
              <div key={milestone.year} className="about-timeline-item">
                <div className="about-timeline-badge">{milestone.year}</div>
                <div className="about-timeline-card">
                  <h4 className="about-timeline-card__title">{milestone.title}</h4>
                  <p className="about-timeline-card__desc">{milestone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Platform"
              title="Technology"
              titleHighlight="architecture"
              titleHighlightSameLine
              subtitle="Built for fast UI, secure data, and integrations your finance team expects."
              theme="navy"
              maxWidth={560}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <Row gutter={[16, 16]}>
            {techStack.map((tech, idx) => (
              <Col key={tech.title} xs={24} sm={12}>
                <ScrollReveal animation="fade-in-up" delay={idx * 50}>
                  <div className="about-tech-card">
                    <span className="about-tech-card__code">{tech.code}</span>
                    <div>
                      <h5 className="about-tech-card__title">{tech.title}</h5>
                      <p className="about-tech-card__desc">{tech.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>
    </div>
  );
}
