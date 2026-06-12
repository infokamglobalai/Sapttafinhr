import { useState } from 'react';
import { Button, Switch, Collapse } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckCircleFilled, CheckOutlined, CrownOutlined, PhoneOutlined, ToolOutlined } from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import MarketingStatsRow from '../components/marketing/MarketingStatsRow';
import useBreakpoint from '../hooks/useBreakpoint';
import { PLANS } from '../types';
import {
  enterpriseHighlights,
  enterpriseCustomizationAreas,
  enterpriseProcess,
} from '../data/enterprise-plan-data';

const pricingFaqs = [
  {
    key: '1',
    label: 'Is there a setup or onboarding fee?',
    children:
      'No. Every Saptta subscription includes free guided setup support, database migration assistance, and tenant initialization with zero upfront cost.',
  },
  {
    key: '2',
    label: 'Can I cancel or change my plan anytime?',
    children:
      'Yes. You can upgrade, downgrade, or cancel your subscription at any time. When upgrading or downgrading, the bill difference will be prorated on your next statement.',
  },
  {
    key: '3',
    label: 'How is data security handled for mid-size businesses?',
    children:
      'We deploy a schema-per-tenant architecture in AWS Mumbai, protecting records with customer-managed keys (KMS) and strict cryptographic isolation.',
  },
  {
    key: '4',
    label: 'Do you offer custom pricing for large workforces?',
    children:
      'Yes. For teams with 500+ employees or multi-entity organizations requiring API integrations, contact our sales team for customized volume pricing.',
  },
];

const planIncludes = [
  { title: 'Multi-tenant isolation', desc: 'Schema-per-tenant PostgreSQL. Your data stays fully isolated.' },
  { title: 'Indian compliance', desc: 'GST, TDS, PF, ESI, and professional tax built in.' },
  { title: 'Data encryption', desc: 'AES-256 at rest and TLS 1.3 in transit.' },
  { title: 'Automatic backups', desc: 'Daily backups with 30-day retention.' },
  { title: '99.9% uptime SLA', desc: 'Hosted on AWS Mumbai with auto-scaling.' },
  { title: 'Free onboarding', desc: 'Guided setup wizard plus dedicated support.' },
];

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN').format(amount);
}

export default function Pricing() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [annual, setAnnual] = useState(true);

  const hrmsPlans = PLANS.filter((p) => p.products.length === 1 && p.products[0] === 'hrms');
  const financePlans = PLANS.filter((p) => p.products.length === 1 && p.products[0] === 'finance');
  const completePlan = PLANS.find((p) => p.id === 'saptta-complete')!;
  const modularPlans = [...hrmsPlans, ...financePlans];

  const monthlyDisplay = (plan: (typeof PLANS)[number]) =>
    annual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;

  return (
    <div className="marketing-page marketing-page--pricing">
      <MarketingHero
        eyebrow="Pricing"
        title="Choose the right plan"
        titleHighlight="for your business"
        titleHighlightSameLine
        subtitle="HRMS and Finance are separate products — combine them on Saptta Complete for unified HR and finance workflows."
        stats={[
          { value: '14 days', label: 'Free trial' },
          { value: 'Modular', label: 'HRMS or Finance' },
          { value: 'India', label: 'PF · GST · ESI' },
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

      <section className="pricing-page__billing">
        <div className="pricing-page__billing-inner">
          <span className={`pricing-page__billing-label${!annual ? ' pricing-page__billing-label--active' : ''}`}>
            Monthly
          </span>
          <Switch checked={annual} onChange={setAnnual} className="pricing-page__billing-switch" />
          <span className={`pricing-page__billing-label${annual ? ' pricing-page__billing-label--active' : ''}`}>
            Annual
            <span className="pricing-page__billing-save">Save 17%</span>
          </span>
        </div>
      </section>

      <MarketingStatsRow
        stats={[
          { value: '14 days', label: 'Free trial', icon: '✦' },
          { value: 'Modular', label: 'HRMS or Finance', icon: '◫' },
          { value: 'India', label: 'PF · GST · ESI ready', icon: '🇮🇳' },
          { value: '99.9%', label: 'Uptime target', icon: '◎' },
        ]}
      />

      <section className="marketing-section marketing-section--white pricing-page__featured">
        <div className="marketing-section__inner pricing-page__featured-inner">
          <ScrollReveal animation="fade-in-up">
            <article className="pricing-complete-card">
              <div className="pricing-complete-card__main">
                <span className="pricing-complete-card__badge">{completePlan.badge}</span>
                <h2 className="pricing-complete-card__title">{completePlan.name}</h2>
                <p className="pricing-complete-card__desc">{completePlan.description}</p>
                <div className="pricing-complete-card__price">
                  <span className="pricing-complete-card__amount">
                    ₹{formatPrice(monthlyDisplay(completePlan))}
                  </span>
                  <span className="pricing-complete-card__period">/month</span>
                  {annual && (
                    <span className="pricing-complete-card__billed">
                      Billed ₹{formatPrice(completePlan.annualPrice)}/year
                    </span>
                  )}
                </div>
                <Button
                  type="primary"
                  size="large"
                  className="marketing-btn marketing-btn--primary"
                  onClick={() => navigate('/signup', { state: { planId: completePlan.id } })}
                >
                  Get started free
                </Button>
                <p className="pricing-complete-card__trial">14-day free trial · No credit card required</p>
              </div>
              <ul className="pricing-complete-card__features">
                {completePlan.features.map((f) => (
                  <li key={f}>
                    <CheckCircleFilled className="pricing-complete-card__check" />
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          </ScrollReveal>
        </div>
      </section>

      <section id="pricing-plans" className="marketing-section marketing-section--muted pricing-page__plans">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="By product"
              title="HRMS & Finance"
              titleHighlight="plan tiers"
              titleHighlightSameLine
              subtitle="Four standalone tiers for HR and accounting — scale each module independently, or bundle both on Saptta Complete."
              theme="navy"
              isMobile={isMobile}
              maxWidth={720}
            />
            <p className="pricing-page__enterprise-jump">
              <button type="button" onClick={() => document.getElementById('enterprise')?.scrollIntoView({ behavior: 'smooth' })}>
                Need custom workflows or integrations? See Enterprise →
              </button>
            </p>
          </ScrollReveal>

          <div className="home-pricing-grid pricing-page__grid">
            {modularPlans.map((plan, i) => {
              const productLabel = plan.products[0] === 'hrms' ? 'HRMS' : 'Finance';
              return (
                <ScrollReveal key={plan.id} animation="fade-in-up" delay={i * 80}>
                  <article
                    className={`home-pricing-card${plan.highlighted ? ' home-pricing-card--featured' : ''} pricing-page__plan-card`}
                  >
                    <span className={`pricing-page__plan-tag pricing-page__plan-tag--${plan.products[0]}`}>
                      {productLabel}
                    </span>
                    <div className="home-pricing-card__head">
                      <h3 className="home-pricing-card__title">{plan.name}</h3>
                      <p className="home-pricing-card__tagline">{plan.description}</p>
                    </div>
                    <div className="home-pricing-card__price">
                      <div className="home-pricing-card__price-row">
                        <span className="home-pricing-card__amount">₹{formatPrice(monthlyDisplay(plan))}</span>
                        <span className="home-pricing-card__period">/month</span>
                      </div>
                      {annual && (
                        <span className="home-pricing-card__annual">
                          Billed ₹{formatPrice(plan.annualPrice)}/year
                        </span>
                      )}
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
                        block
                        size="large"
                        className="home-pricing-card__cta"
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
        </div>
      </section>

      <section id="enterprise" className="marketing-section marketing-section--white pricing-enterprise">
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
                    Full platform plus custom configuration beyond Starter, Pro, and Complete. We scope, build, and
                    support it with you.
                  </p>
                  <div className="pricing-enterprise__price">
                    <span className="pricing-enterprise__price-label pricing-enterprise__price-label--dark">
                      Custom pricing
                    </span>
                    <span className="pricing-enterprise__price-note pricing-enterprise__price-note--dark">
                      Based on users, modules, integrations & scope
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

      <section className="marketing-section marketing-section--muted pricing-page__includes">
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

      <section className="marketing-section marketing-section--white pricing-page__faq">
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
