import { useState } from 'react';
import { Button, Switch, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckCircleFilled } from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import CTABanner from '../components/shared/CTABanner';
import { PLANS } from '../types';

export default function Pricing() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const hrmsPlans = PLANS.filter(p => p.products.length === 1 && p.products[0] === 'hrms');
  const financePlans = PLANS.filter(p => p.products.length === 1 && p.products[0] === 'finance');
  const completePlan = PLANS.find(p => p.id === 'saptta-complete')!;

  return (
    <div style={{ overflow: 'hidden', background: 'var(--color-bg-base)' }}>
      {/* Hero */}
      <section style={{
        padding: '120px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ width: 800, height: 800, position: 'absolute', top: -400, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(255,109,0,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <ScrollReveal animation="fade-in-up">
            <Tag color="orange" style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, padding: '4px 16px', borderRadius: 20 }}>
              Simple, Transparent Pricing
            </Tag>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 16, letterSpacing: '-1.5px', lineHeight: 1.15 }}>
              Choose the Right Plan for Your Business
            </h1>
            <p style={{ fontSize: 17, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
              Choose HRMS, Finance, or both. Each product is sold separately so you only pay for what you use, with the option to bundle into Saptta Complete for a fully unified platform.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={200}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: !annual ? '#FF6D00' : 'var(--color-text-secondary)' }}>Monthly</span>
              <Switch checked={annual} onChange={setAnnual} style={{ background: annual ? '#FF6D00' : undefined }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: annual ? '#FF6D00' : 'var(--color-text-secondary)' }}>
                Annual
                <span style={{ background: 'rgba(0,200,83,0.1)', color: '#00C853', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 8 }}>Save 17%</span>
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Complete Plan — Featured */}
      <section style={{ padding: '0 24px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-up" delay={100}>
            <div style={{
              background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
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
                    <span style={{ background: 'linear-gradient(135deg, #FF6D00, #FFA000)', color: 'white', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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
                      background: 'linear-gradient(135deg, #FF6D00, #FFA000)',
                      border: 'none', color: 'white', fontWeight: 700,
                      height: 52, padding: '0 40px', borderRadius: 12, fontSize: 16,
                      boxShadow: '0 12px 32px rgba(255,109,0,0.3)',
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
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 48 }}>
              Start with HRMS or Finance separately and add the other anytime.
            </p>
          </ScrollReveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[...hrmsPlans, ...financePlans].map((plan, i) => (
              <ScrollReveal key={plan.id} animation="fade-in-up" delay={i * 100}>
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '32px 28px',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 4px 24px rgba(10,17,40,0.04)',
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

      <CTABanner />
    </div>
  );
}
