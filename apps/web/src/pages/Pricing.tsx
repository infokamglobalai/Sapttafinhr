import { useState } from 'react';
import { Button, Switch, Tag, Collapse } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckCircleFilled } from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import CTABanner from '../components/shared/CTABanner';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingStatsRow from '../components/marketing/MarketingStatsRow';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import useBreakpoint from '../hooks/useBreakpoint';
import { PLANS } from '../types';
import {
  enterpriseHighlights,
  enterpriseCustomizationAreas,
  enterpriseProcess,
} from '../data/enterprise-plan-data';
import { CrownOutlined, PhoneOutlined, ToolOutlined } from '@ant-design/icons';

export default function Pricing() {
  const pricingFaqs = [
    {
      key: '1',
      label: 'Is there a setup or onboarding fee?',
      children: 'No. Every Saptta subscription includes free guided setup support, database migration assistance, and tenant initialization with zero upfront cost.',
    },
    {
      key: '2',
      label: 'Can I cancel or change my plan anytime?',
      children: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time. When upgrading or downgrading, the bill difference will be prorated on your next statement.',
    },
    {
      key: '3',
      label: 'How is data security handled for mid-size businesses?',
      children: 'We deploy a schema-per-tenant architecture in AWS Mumbai, protecting records with customer-managed keys (KMS) and strict cryptographic isolation.',
    },
    {
      key: '4',
      label: 'Do you offer custom pricing for large workforces?',
      children: 'Yes. For teams with 500+ employees or multi-entity organizations requiring API integrations, contact our sales team for customized volume pricing.',
    },
  ];

  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [annual, setAnnual] = useState(true);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const hrmsPlans = PLANS.filter(p => p.products.length === 1 && p.products[0] === 'hrms');
  const financePlans = PLANS.filter(p => p.products.length === 1 && p.products[0] === 'finance');
  const completePlan = PLANS.find(p => p.id === 'saptta-complete')!;

  return (
    <div className="marketing-page">
      <section className={`marketing-hero${isMobile ? ' marketing-hero--stacked' : ''}`} style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FFFBF5 50%, #FFFFFF 100%)' }}>
        <div className="marketing-hero__orb marketing-hero__orb--1" />
        <div className="marketing-hero__inner marketing-hero__inner--split">
          <ScrollReveal animation="fade-in-left">
            <HomeSectionHeader
              eyebrow="Pricing"
              title="Choose the right plan"
              titleHighlight="for your business"
              subtitle="HRMS and Finance are separate products — combine them anytime on Saptta Complete for unified HR + finance workflows."
              theme="navy"
              align="left"
              isMobile={isMobile}
              maxWidth={520}
            />
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: !annual ? '#1E2A78' : '#64748b' }}>Monthly</span>
              <Switch checked={annual} onChange={setAnnual} style={{ background: annual ? '#1E2A78' : undefined }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: annual ? '#1E2A78' : '#64748b' }}>
                Annual
                <span className="home-section-badge" style={{ marginLeft: 8 }}>Save 17%</span>
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-in-right">
            <MarketingImageFrame imageKey="pricingMeeting" variant="float" aspect="4/3" />
          </ScrollReveal>
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

      {/* Complete Plan — Featured */}
      <section style={{ padding: '0 24px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-up" delay={100}>
            <div className="pricing-complete-featured" style={{
              background: 'linear-gradient(135deg, #1E2A78 0%, #2A3F8F 48%, #6C3BFF 100%)',
              borderRadius: 24,
              padding: '48px 40px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,109,0,0.3)',
              boxShadow: '0 24px 64px rgba(10,17,40,0.2)',
            }}>
              <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,109,0,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
              <div style={{ position: 'absolute', bottom: -80, left: -80, width: 250, height: 250, background: 'radial-gradient(circle, rgba(138,43,226,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', position: 'relative', zIndex: 2 }}>
                <div style={{ flex: '1 1 340px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ background: 'linear-gradient(135deg, #D69A2D, #E2AD4A)', color: 'white', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {completePlan.badge}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', marginBottom: 8, letterSpacing: '-1px' }}>
                    {completePlan.name}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                    {completePlan.description}
                  </p>
                  <div style={{ marginBottom: 24 }}>
                    <span style={{ fontSize: 48, fontWeight: 900, color: '#FF6D00', letterSpacing: '-2px' }}>
                      ₹{formatPrice(annual ? Math.round(completePlan.annualPrice / 12) : completePlan.monthlyPrice)}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginLeft: 4 }}>/month</span>
                    {annual && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                        Billed ₹{formatPrice(completePlan.annualPrice)}/year
                      </div>
                    )}
                  </div>
                  <Button
                    size="large"
                    onClick={() => navigate('/signup', { state: { planId: completePlan.id } })}
                    style={{
                      background: 'linear-gradient(135deg, #D69A2D, #E2AD4A)',
                      border: 'none', color: 'white', fontWeight: 700,
                      height: 52, padding: '0 40px', borderRadius: 999, fontSize: 16,
                      boxShadow: '0 12px 32px rgba(214,154,45,0.35)',
                    }}
                  >
                    Get Started Free
                  </Button>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 12 }}>14-day free trial. No credit card required.</p>
                </div>

                <div style={{ flex: '1 1 340px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                    {completePlan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <CheckCircleFilled style={{ color: '#FF6D00', fontSize: 14, marginTop: 3, flexShrink: 0 }} />
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Individual Product Plans */}
      <section style={{ padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-up">
            <h3 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              Or pick individual products
            </h3>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 16 }}>
              Start with HRMS or Finance separately and add the other anytime.
            </p>
            <p style={{ textAlign: 'center', marginBottom: 48 }}>
              <a href="#enterprise" className="pricing-enterprise__jump">
                Need custom workflows or integrations? See Enterprise →
              </a>
            </p>
          </ScrollReveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[...hrmsPlans, ...financePlans].map((plan, i) => (
              <ScrollReveal key={plan.id} animation="fade-in-up" delay={i * 100}>
                <div className={`marketing-pricing-card${plan.id === 'saptta-complete' ? '' : ''}`} style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '32px 28px',
                  border: plan.highlighted ? '2px solid #6C3BFF' : '1px solid var(--color-border)',
                  boxShadow: plan.highlighted ? '0 16px 40px rgba(108,59,255,0.12)' : '0 4px 24px rgba(10,17,40,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(10,17,40,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(10,17,40,0.04)'; }}
                >
                  <Tag
                    color={plan.products[0] === 'hrms' ? 'orange' : 'green'}
                    style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, borderRadius: 10, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    {plan.products[0] === 'hrms' ? 'HRMS' : 'Finance'}
                  </Tag>

                  <h4 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{plan.name}</h4>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>{plan.description}</p>

                  <div style={{ marginBottom: 24 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-1.5px' }}>
                      ₹{formatPrice(annual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice)}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>/mo</span>
                    {annual && (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>
                        Billed ₹{formatPrice(plan.annualPrice)}/year
                      </div>
                    )}
                  </div>

                  <Button
                    block
                    size="large"
                    onClick={() => navigate('/signup', { state: { planId: plan.id } })}
                    style={{
                      fontWeight: 600, height: 44, borderRadius: 10, marginBottom: 24, fontSize: 14,
                      background: 'transparent', color: '#FF6D00', border: '1.5px solid #FF6D00',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FF6D00'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF6D00'; }}
                  >
                    Start Free Trial
                  </Button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <CheckCircleFilled style={{ color: '#10B981', fontSize: 13, marginTop: 2, flexShrink: 0 }} />
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise — custom pricing & customization */}
      <section id="enterprise" className="marketing-section marketing-section--muted pricing-enterprise">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Enterprise"
              title="Need a plan built"
              titleHighlight="for your organisation?"
              subtitle="For larger teams or unique requirements — we customise Saptta to your workflows, integrations, and compliance needs. Pricing is tailored; standard plan prices above stay unchanged."
              theme="indigo"
              maxWidth={680}
            />
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={80}>
            <div className="pricing-enterprise__card">
              <div className="pricing-enterprise__glow" aria-hidden />
              <div className="pricing-enterprise__layout">
                <div className="pricing-enterprise__main">
                  <span className="pricing-enterprise__badge">
                    <CrownOutlined /> Enterprise
                  </span>
                  <h2 className="pricing-enterprise__title">Saptta Enterprise</h2>
                  <p className="pricing-enterprise__desc">
                    Full platform plus custom configuration — whatever your business needs beyond off-the-shelf
                    Starter, Pro, and Complete plans. We scope, build, and support it with you.
                  </p>
                  <div className="pricing-enterprise__price">
                    <span className="pricing-enterprise__price-label">Custom pricing</span>
                    <span className="pricing-enterprise__price-note">Based on users, modules, integrations & scope</span>
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
                  <p className="pricing-enterprise__footnote">
                    <ToolOutlined /> Typical for 200+ employees, multi-location, or custom statutory / integration needs.
                  </p>
                </div>
                <div className="pricing-enterprise__features">
                  {enterpriseHighlights.map((f) => (
                    <div key={f} className="pricing-enterprise__feature">
                      <CheckCircleFilled className="pricing-enterprise__check" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={120}>
            <h3 className="home-card-title home-card-title--sm" style={{ textAlign: 'center', margin: '48px 0 24px' }}>
              What we can customise
            </h3>
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
            <h3 className="home-card-title home-card-title--sm" style={{ textAlign: 'center', margin: '40px 0 24px' }}>
              How Enterprise onboarding works
            </h3>
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

      {/* FAQ-like trust strip */}
      <section style={{ padding: '60px 24px', borderTop: '1px solid var(--color-border)', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-up">
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 40, color: 'var(--color-text-primary)' }}>
              Every plan includes
            </h3>
          </ScrollReveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, textAlign: 'left' }}>
            {[
              { title: 'Multi-Tenant Isolation', desc: 'Schema-per-tenant PostgreSQL. Your data is completely isolated.' },
              { title: 'Indian Compliance', desc: 'GST, TDS, PF, ESI, PT — all statutory calculations built-in.' },
              { title: 'Data Encryption', desc: 'AES-256 encryption at rest, TLS 1.3 in transit.' },
              { title: 'Automatic Backups', desc: 'Daily automated backups with 30-day retention.' },
              { title: '99.9% Uptime SLA', desc: 'Hosted on AWS Mumbai region with auto-scaling.' },
              { title: 'Free Onboarding', desc: 'Guided setup wizard + dedicated onboarding support.' },
            ].map((item, i) => (
              <ScrollReveal key={i} animation="fade-in-up" delay={i * 80}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>{item.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="marketing-section marketing-section--muted" style={{ padding: '64px 24px', background: '#FAFAFC', borderTop: '1px solid var(--color-border)' }}>
        <div className="marketing-section__inner marketing-section__inner--narrow" style={{ maxWidth: 800, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="FAQ"
              title="Pricing & billing"
              titleHighlight="questions"
              theme="indigo"
              maxWidth={480}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-up" delay={80}>
            <Collapse
              className="marketing-faq-collapse"
              bordered={false}
              expandIconPosition="end"
              items={pricingFaqs}
              style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e8ecf4' }}
            />
          </ScrollReveal>
        </div>
      </section>

      <CTABanner />
    </div>
  );
}
