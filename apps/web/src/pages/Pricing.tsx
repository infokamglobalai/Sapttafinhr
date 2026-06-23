import { useState } from 'react';
import { Button, InputNumber, Collapse } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleFilled,
  CheckOutlined,
  CrownOutlined,
  PhoneOutlined,
  ToolOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import MarketingStatsRow from '../components/marketing/MarketingStatsRow';
import useBreakpoint from '../hooks/useBreakpoint';
import {
  PLANS,
  GST_RATE,
  INCLUDED_EMPLOYEES,
  EXTRA_EMPLOYEE_PRICE,
  SEPARATE_MONTHLY,
  COMPLETE_SAVINGS,
  planMonthly,
  extraEmployees,
  type Plan,
} from '../types';
import {
  enterpriseHighlights,
  enterpriseCustomizationAreas,
  enterpriseProcess,
} from '../data/enterprise-plan-data';

const pricingFaqs = [
  {
    key: '1',
    label: 'What does “up to 30 employees” mean?',
    children:
      'Saptta HRMS and Saptta Complete include up to 30 employees in the ₹4,999 / ₹7,999 base price. Add as many as you like beyond that — each extra employee is just ₹111 / month. Saptta Finance has no employee limit (unlimited finance users).',
  },
  {
    key: '2',
    label: 'Are these prices inclusive of GST?',
    children:
      'No — all prices shown are exclusive of GST. 18% GST is added on top at checkout, and you receive a GST-compliant tax invoice instantly. For example, HRMS is ₹4,999 + 18% GST = ₹5,899 / month.',
  },
  {
    key: '3',
    label: 'Why bundle HRMS and Finance on Complete?',
    children:
      'Bought separately, HRMS (₹4,999) + Finance (₹4,999) = ₹9,998 / month. Saptta Complete gives you both for ₹7,999 — you save ₹1,999 every month, plus Tally XML export and payroll→ledger auto-sync when you run both products.',
  },
  {
    key: '4',
    label: 'Is there a setup or onboarding fee?',
    children:
      'No. Every Saptta subscription includes free guided setup, database migration assistance, and tenant initialization at zero upfront cost.',
  },
  {
    key: '5',
    label: 'Can I change or cancel my plan anytime?',
    children:
      'Yes. Upgrade, add employees, switch to Complete, or cancel at any time. Any difference is prorated on your next statement.',
  },
  {
    key: '6',
    label: 'Is Saptta available in Kuwait and the GCC?',
    children:
      'Yes — core HRMS (people, attendance, leave, performance, recruitment) is live for Kuwait and GCC workspaces, billed in USD. India statutory payroll (PF, ESI, TDS, Form 16, Tally) applies to India workspaces. GCC statutory payroll (PIFSS, indemnity, WPS) is on our product roadmap.',
  },
];

const planIncludes = [
  { title: 'Multi-tenant isolation', desc: 'Schema-per-tenant PostgreSQL. Your data stays fully isolated.' },
  { title: 'Region-aware HR', desc: 'India: PF, ESI, TDS & Form 16. GCC: core HR today — local payroll on roadmap.' },
  { title: 'Data encryption', desc: 'AES-256 at rest and TLS 1.3 in transit.' },
  { title: 'Automatic backups', desc: 'Daily backups with 30-day retention.' },
  { title: '99.9% uptime SLA', desc: 'Hosted on AWS Mumbai with auto-scaling.' },
  { title: 'Free onboarding', desc: 'Guided setup wizard plus dedicated support.' },
];

function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN').format(amount);
}

const ACCENTS: Record<string, string> = {
  hrms: '#1E2A78',
  finance: '#00A862',
  complete: '#FF6D00',
};

export default function Pricing() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [employees, setEmployees] = useState(INCLUDED_EMPLOYEES);

  // Order the cards HRMS · Complete (featured, centre) · Finance.
  const ordered: Plan[] = [
    PLANS.find((p) => p.id === 'hrms')!,
    PLANS.find((p) => p.id === 'saptta-complete')!,
    PLANS.find((p) => p.id === 'finance')!,
  ];

  return (
    <div className="marketing-page marketing-page--pricing">
      <MarketingHero
        eyebrow="Pricing"
        title="Simple, honest pricing"
        titleHighlight="that grows with you"
        titleHighlightSameLine
        subtitle="₹4,999 for HRMS, ₹4,999 for Finance, or get both on Saptta Complete for ₹7,999 — and save ₹1,999 every month."
        stats={[
          { value: '₹4,999', label: 'HRMS / mo' },
          { value: '₹4,999', label: 'Finance / mo' },
          { value: '₹7,999', label: 'Both — save ₹1,999' },
        ]}
        theme="navy"
        gradient="linear-gradient(135deg, #ffffff 0%, #f8fafc 70%, #eef2ff 100%)"
        primaryLabel="Start free trial"
        primaryTo="/signup"
        secondaryLabel="Talk to sales"
        secondaryTo="/contact"
        heroImageKey="pricingHero"
        heroImageVariant="plain"
      />

      <MarketingStatsRow
        stats={[
          { value: '30 included', label: 'Employees in base price', icon: '👥' },
          { value: '+₹111', label: 'Per extra employee', icon: '➕' },
          { value: 'Unlimited', label: 'Finance users', icon: '◫' },
          { value: '14 days', label: 'Free trial', icon: '✦' },
        ]}
      />

      {/* ── Plan cards ── */}
      <section className="marketing-section marketing-section--white pricing-page__featured">
        <div className="marketing-section__inner pricing-page__featured-inner">
          {/* GST + included-employees banner */}
          <ScrollReveal animation="fade-in-up">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'center',
                marginBottom: 28,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(30,42,120,0.05)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: 13,
                  padding: '7px 16px',
                  borderRadius: 999,
                }}
              >
                💼 All prices exclude {Math.round(GST_RATE * 100)}% GST
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,109,0,0.08)',
                  color: '#FF6D00',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '7px 16px',
                  borderRadius: 999,
                }}
              >
                👥 Up to {INCLUDED_EMPLOYEES} employees included · +₹{EXTRA_EMPLOYEE_PRICE} each after
              </span>
            </div>
          </ScrollReveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 22,
              alignItems: 'stretch',
              maxWidth: 1080,
              margin: '0 auto',
            }}
          >
            {ordered.map((plan, i) => {
              const accent = ACCENTS[plan.tier];
              const base = plan.monthlyPrice;
              const extra = extraEmployees(plan, employees);
              const total = planMonthly(plan, employees);
              const featured = !!plan.highlighted;
              return (
                <ScrollReveal key={plan.id} animation="fade-in-up" delay={i * 80}>
                  <article
                    className={`home-pricing-card${featured ? ' home-pricing-card--featured' : ''} pricing-page__plan-card`}
                    style={{
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: featured ? `2px solid ${accent}` : '1px solid var(--color-border)',
                      boxShadow: featured ? '0 16px 40px rgba(255,109,0,0.12)' : 'var(--shadow-secondary)',
                      transform: featured && !isMobile ? 'scale(1.03)' : 'none',
                      background: featured
                        ? 'linear-gradient(160deg, #ffffff 0%, rgba(255,109,0,0.03) 100%)'
                        : '#ffffff',
                    }}
                  >
                    {plan.badge && <span className="home-pricing-card__badge">{plan.badge}</span>}

                    <div className="home-pricing-card__head">
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          color: accent,
                          background: `${accent}14`,
                          padding: '4px 10px',
                          borderRadius: 8,
                          marginBottom: 10,
                        }}
                      >
                        {plan.products.length > 1 ? 'HRMS + Finance' : plan.products[0]}
                      </span>
                      <h3 className="home-pricing-card__title">{plan.name}</h3>
                      <p className="home-pricing-card__tagline">{plan.description}</p>
                    </div>

                    <div className="home-pricing-card__price" style={{ marginBottom: 6 }}>
                      <div className="home-pricing-card__price-row">
                        <span className="home-pricing-card__amount" style={{ color: featured ? accent : undefined }}>
                          ₹{fmt(base)}
                        </span>
                        <span className="home-pricing-card__period">/month</span>
                      </div>
                      <span className="home-pricing-card__note">+ {Math.round(GST_RATE * 100)}% GST</span>
                      <span className="home-pricing-card__annual">
                        {plan.includedEmployees != null
                          ? `Up to ${plan.includedEmployees} employees · +₹${EXTRA_EMPLOYEE_PRICE}/extra`
                          : 'Unlimited finance users'}
                      </span>
                    </div>

                    {/* Live total for the chosen headcount */}
                    {plan.includedEmployees != null && extra > 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--color-text-secondary)',
                          background: 'rgba(30,42,120,0.04)',
                          borderRadius: 10,
                          padding: '8px 12px',
                          marginBottom: 14,
                        }}
                      >
                        {employees} employees: ₹{fmt(base)} + {extra} × ₹{EXTRA_EMPLOYEE_PRICE} ={' '}
                        <strong style={{ color: accent }}>₹{fmt(total)}/mo</strong>
                      </div>
                    )}

                    <ul className="home-pricing-card__features" style={{ flex: 1 }}>
                      {plan.features.slice(0, 7).map((f) => (
                        <li key={f}>
                          <CheckOutlined className="home-pricing-card__check" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="home-pricing-card__footer">
                      <Button
                        block
                        size="large"
                        type={featured ? 'primary' : 'default'}
                        className={`home-pricing-card__cta${featured ? ' home-pricing-card__cta--primary' : ''}`}
                        style={featured ? { background: 'linear-gradient(135deg, #FF9800, #FF6D00)', border: 'none', color: '#fff' } : undefined}
                        onClick={() => navigate('/signup', { state: { planId: plan.id } })}
                      >
                        Start free trial
                      </Button>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>

          {/* ── Headcount calculator ── */}
          <ScrollReveal animation="fade-in-up" delay={120}>
            <div
              style={{
                maxWidth: 720,
                margin: '32px auto 0',
                background: '#ffffff',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                padding: isMobile ? '18px 16px' : '22px 28px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 16,
                justifyContent: 'center',
                boxShadow: 'var(--shadow-secondary)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                <TeamOutlined style={{ color: '#FF6D00' }} /> How many employees?
              </span>
              <InputNumber
                min={1}
                max={5000}
                value={employees}
                onChange={(v) => setEmployees(Number(v) || 1)}
                style={{ width: 110 }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                HRMS{' '}
                <strong style={{ color: ACCENTS.hrms }}>₹{fmt(planMonthly(ordered[0], employees))}/mo</strong> · Complete{' '}
                <strong style={{ color: ACCENTS.complete }}>₹{fmt(planMonthly(ordered[1], employees))}/mo</strong>
                <span style={{ color: 'var(--color-text-muted)' }}> (ex-GST)</span>
              </span>
            </div>
          </ScrollReveal>

          {/* ── Savings callout ── */}
          <ScrollReveal animation="fade-in-up" delay={160}>
            <div
              style={{
                maxWidth: 720,
                margin: '20px auto 0',
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(0,168,98,0.06), rgba(0,168,98,0.02))',
                border: '1px solid rgba(0,168,98,0.18)',
                borderRadius: 16,
                padding: '18px 22px',
                fontSize: 15,
                color: 'var(--color-text-secondary)',
              }}
            >
              HRMS ₹{fmt(PLANS[0].monthlyPrice)} + Finance ₹{fmt(PLANS[1].monthlyPrice)} ={' '}
              <strong>₹{fmt(SEPARATE_MONTHLY)}</strong> separately. Get both on{' '}
              <strong>Saptta Complete for ₹{fmt(7999)}</strong> and{' '}
              <strong style={{ color: '#00A862' }}>save ₹{fmt(COMPLETE_SAVINGS)} every month</strong>.
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section id="enterprise" className="marketing-section marketing-section--muted pricing-enterprise">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Enterprise"
              title="Need a plan built"
              titleHighlight="for your organisation?"
              titleHighlightSameLine
              subtitle="For larger teams or unique requirements — we customise Saptta to your workflows, integrations, and compliance needs."
              theme="navy"
              maxWidth={720}
              isMobile={isMobile}
            />
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={80}>
            <article className="pricing-enterprise__card pricing-enterprise__card--light">
              <div className="pricing-enterprise__layout">
                <div className="pricing-enterprise__main">
                  <span className="pricing-enterprise__badge">
                    <CrownOutlined /> Enterprise
                  </span>
                  <h2 className="pricing-enterprise__title pricing-enterprise__title--dark">Saptta Enterprise</h2>
                  <p className="pricing-enterprise__desc pricing-enterprise__desc--dark">
                    Full platform plus custom configuration for large, multi-entity teams. We scope, build, and
                    support it with you.
                  </p>
                  <div className="pricing-enterprise__price">
                    <span className="pricing-enterprise__price-label pricing-enterprise__price-label--dark">
                      Custom pricing
                    </span>
                    <span className="pricing-enterprise__price-note pricing-enterprise__price-note--dark">
                      Based on headcount, modules, integrations &amp; scope
                    </span>
                  </div>
                  <div className="pricing-enterprise__actions">
                    <Button
                      type="primary"
                      size="large"
                      className="marketing-btn marketing-btn--primary"
                      icon={<PhoneOutlined />}
                      onClick={() => navigate('/contact', { state: { interest: 'enterprise' } })}
                    >
                      Talk to Enterprise sales
                    </Button>
                    <Button
                      size="large"
                      className="marketing-btn marketing-btn--ghost"
                      onClick={() => navigate('/contact', { state: { interest: 'enterprise' } })}
                    >
                      Request a proposal
                    </Button>
                  </div>
                  <p className="pricing-enterprise__footnote pricing-enterprise__footnote--dark">
                    <ToolOutlined /> Typical for 200+ employees, multi-location, or custom statutory needs.
                  </p>
                </div>
                <div className="pricing-enterprise__features pricing-enterprise__features--dark">
                  {enterpriseHighlights.map((f) => (
                    <div key={f} className="pricing-enterprise__feature pricing-enterprise__feature--dark">
                      <CheckCircleFilled className="pricing-enterprise__check pricing-enterprise__check--brand" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={120}>
            <h3 className="pricing-page__subheading">What we can customise</h3>
            <div className="pricing-enterprise__areas">
              {enterpriseCustomizationAreas.map((area) => (
                <div key={area.title} className="pricing-enterprise__area">
                  <h4 className="home-card-h4">{area.title}</h4>
                  <ul>
                    {area.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={160}>
            <h3 className="pricing-page__subheading">How Enterprise onboarding works</h3>
            <div className="pricing-enterprise__process">
              {enterpriseProcess.map((step) => (
                <div key={step.step} className="pricing-enterprise__step">
                  <span className="pricing-enterprise__step-num">{step.step}</span>
                  <h4 className="home-card-h4">{step.title}</h4>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white pricing-page__includes">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="All plans"
              title="Every plan"
              titleHighlight="includes"
              titleHighlightSameLine
              theme="navy"
              maxWidth={480}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <div className="pricing-page__includes-grid">
            {planIncludes.map((item, i) => (
              <ScrollReveal key={item.title} animation="fade-in-up" delay={i * 60}>
                <div className="pricing-page__includes-card">
                  <h4 className="home-card-h4">{item.title}</h4>
                  <p className="home-card-body">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted pricing-page__faq">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="FAQ"
              title="Pricing & billing"
              titleHighlight="questions"
              titleHighlightSameLine
              theme="navy"
              maxWidth={520}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-up" delay={80}>
            <Collapse
              className="marketing-faq-collapse"
              bordered={false}
              expandIconPosition="end"
              items={pricingFaqs}
            />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
