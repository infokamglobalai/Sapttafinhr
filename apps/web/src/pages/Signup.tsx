import { useState } from 'react';
import { Form, Input, Button, Steps, Tag, message } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircleFilled } from '@ant-design/icons';
import { SapttaLogo } from '../components/layout/Navbar';
import ScrollReveal from '../components/shared/ScrollReveal';
import { useAuth } from '../contexts/AuthContext';
import { PLANS } from '../types';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isLoading } = useAuth();
  const [form] = Form.useForm();

  const preselectedPlanId = (location.state as { planId?: string })?.planId || null;
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(preselectedPlanId);
  const [step, setStep] = useState(preselectedPlanId ? 1 : 0);

  const selectedPlan = PLANS.find(p => p.id === selectedPlanId);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setStep(1);
  };

  const handleSubmit = async (values: { email: string; password: string; firstName: string; lastName: string; companyName: string }) => {
    if (!selectedPlanId) return;
    try {
      await signup({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        planId: selectedPlanId,
        companyName: values.companyName,
      });
      // Pay-first: the workspace exists but has no access yet. Send the admin to
      // checkout, not into the product (which would 403 until payment).
      message.success('Account created! Choose a plan to activate your workspace.');
      navigate('/app/billing');
    } catch {
      message.error('Something went wrong. Please try again.');
    }
  };

  const formatPrice = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#FAFAFC',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ width: 600, height: 600, position: 'absolute', top: -200, right: -200, background: 'radial-gradient(circle, rgba(255,109,0,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ width: 500, height: 500, position: 'absolute', bottom: -200, left: -200, background: 'radial-gradient(circle, rgba(138,43,226,0.04) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '40px 24px', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <SapttaLogo />
          </Link>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#FF6D00', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ maxWidth: 500, margin: '0 auto 40px' }}>
          <Steps
            current={step}
            size="small"
            items={[
              { title: 'Choose Plan' },
              { title: 'Create Account' },
            ]}
          />
        </div>

        {/* Step 0: Plan Selection */}
        {step === 0 && (
          <ScrollReveal animation="fade-in-up">
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8, letterSpacing: '-1px' }}>
                Choose your plan
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>
                14-day free trial on all plans. No credit card required.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  style={{
                    background: plan.highlighted ? 'linear-gradient(135deg, #1A1A2E, #0F3460)' : '#FFFFFF',
                    borderRadius: 16,
                    padding: '24px 20px',
                    border: selectedPlanId === plan.id ? '2px solid #FF6D00' : plan.highlighted ? '1px solid rgba(255,109,0,0.3)' : '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(10,17,40,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {plan.badge && (
                    <span style={{ position: 'absolute', top: -10, right: 16, background: 'linear-gradient(135deg, #FF6D00, #FFA000)', color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 10, textTransform: 'uppercase' }}>
                      {plan.badge}
                    </span>
                  )}
                  <Tag
                    color={plan.products.includes('hrms') && plan.products.includes('finance') ? 'purple' : plan.products[0] === 'hrms' ? 'orange' : 'green'}
                    style={{ fontSize: 10, fontWeight: 700, borderRadius: 8, marginBottom: 12 }}
                  >
                    {plan.products.length > 1 ? 'HRMS + Finance' : plan.products[0].toUpperCase()}
                  </Tag>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: plan.highlighted ? '#FFFFFF' : 'var(--color-text-primary)', marginBottom: 4 }}>
                    {plan.name}
                  </h4>
                  <p style={{ fontSize: 12, color: plan.highlighted ? 'rgba(255,255,255,0.5)' : 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                    {plan.description}
                  </p>
                  <div>
                    <span style={{ fontSize: 28, fontWeight: 900, color: plan.highlighted ? '#FF6D00' : 'var(--color-text-primary)', letterSpacing: '-1px' }}>
                      ₹{formatPrice(Math.round(plan.annualPrice / 12))}
                    </span>
                    <span style={{ color: plan.highlighted ? 'rgba(255,255,255,0.4)' : 'var(--color-text-muted)', fontSize: 13 }}>/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Step 1: Account Creation Form */}
        {step === 1 && (
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            <ScrollReveal animation="fade-in-left">
              <div style={{
                width: '100%',
                maxWidth: 480,
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '40px 36px',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 48px rgba(10,17,40,0.04)',
              }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>
                  Create your account
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 28 }}>
                  Set up your admin account to get started.
                </p>

                <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Form.Item
                      name="firstName"
                      label={<span style={{ fontWeight: 600, fontSize: 13 }}>First Name</span>}
                      rules={[{ required: true, message: 'Required' }]}
                      style={{ flex: 1 }}
                    >
                      <Input placeholder="John" size="large" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item
                      name="lastName"
                      label={<span style={{ fontWeight: 600, fontSize: 13 }}>Last Name</span>}
                      rules={[{ required: true, message: 'Required' }]}
                      style={{ flex: 1 }}
                    >
                      <Input placeholder="Doe" size="large" style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="companyName"
                    label={<span style={{ fontWeight: 600, fontSize: 13 }}>Company Name</span>}
                    rules={[{ required: true, message: 'Enter your company name' }]}
                  >
                    <Input placeholder="Acme Pvt Ltd" size="large" style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label={<span style={{ fontWeight: 600, fontSize: 13 }}>Work Email</span>}
                    rules={[{ required: true, message: 'Enter your email' }, { type: 'email', message: 'Enter a valid email' }]}
                  >
                    <Input placeholder="you@company.com" size="large" style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label={<span style={{ fontWeight: 600, fontSize: 13 }}>Password</span>}
                    rules={[{ required: true, message: 'Create a password' }, { min: 8, message: 'Minimum 8 characters' }]}
                  >
                    <Input.Password placeholder="Min 8 characters" size="large" style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary" htmlType="submit" size="large" block loading={isLoading}
                      style={{
                        fontWeight: 700, height: 50, borderRadius: 10, fontSize: 15,
                        background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(255,109,0,0.25)',
                      }}
                    >
                      Create Account & Set Up Company
                    </Button>
                  </Form.Item>
                </Form>

                <Button type="link" onClick={() => setStep(0)} style={{ color: 'var(--color-text-secondary)', padding: 0, fontSize: 13 }}>
                  ← Change plan
                </Button>
              </div>
            </ScrollReveal>

            {/* Selected plan summary sidebar */}
            {selectedPlan && (
              <ScrollReveal animation="fade-in-right">
                <div style={{
                  width: 280,
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: '28px 24px',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 4px 24px rgba(10,17,40,0.04)',
                  alignSelf: 'flex-start',
                  position: 'sticky',
                  top: 100,
                }}>
                  <Tag
                    color={selectedPlan.highlighted ? 'purple' : selectedPlan.products[0] === 'hrms' ? 'orange' : 'green'}
                    style={{ fontSize: 10, fontWeight: 700, borderRadius: 8, marginBottom: 12 }}
                  >
                    {selectedPlan.products.length > 1 ? 'HRMS + Finance' : selectedPlan.products[0].toUpperCase()}
                  </Tag>
                  <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedPlan.name}</h4>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#FF6D00' }}>
                      ₹{formatPrice(Math.round(selectedPlan.annualPrice / 12))}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>/mo</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Included
                    </div>
                    {selectedPlan.features.slice(0, 6).map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                        <CheckCircleFilled style={{ color: '#10B981', fontSize: 12, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                    {selectedPlan.features.length > 6 && (
                      <div style={{ fontSize: 12, color: '#FF6D00', fontWeight: 600, marginTop: 8 }}>
                        +{selectedPlan.features.length - 6} more features
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(0,200,83,0.06)', borderRadius: 10, border: '1px solid rgba(0,200,83,0.12)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#00C853' }}>14-day free trial</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>No credit card required</div>
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
