import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { PLANS, type Plan } from '../types';

const TRUST_POINTS = [
  '14-day free trial on every plan',
  'No credit card required to start',
  'India-compliant HR & finance stack',
  'Setup wizard included after signup',
];

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN').format(amount);
}

function planProductLabel(plan: Plan) {
  if (plan.products.length > 1) return 'HRMS + Finance';
  return plan.products[0] === 'hrms' ? 'HRMS' : 'Finance';
}

function planProductModifier(plan: Plan) {
  if (plan.products.length > 1) return 'signup-page__plan-badge--complete';
  return plan.products[0] === 'hrms' ? 'signup-page__plan-badge--hrms' : 'signup-page__plan-badge--finance';
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isLoading } = useAuth();
  const [form] = Form.useForm();

  const preselectedPlanId = (location.state as { planId?: string })?.planId || null;
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(preselectedPlanId);
  const [step, setStep] = useState(preselectedPlanId ? 1 : 0);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setStep(1);
  };

  const handleSubmit = async (values: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName: string;
  }) => {
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
      message.success('Account created! Welcome to Saptta.');
      navigate(import.meta.env.DEV ? '/app' : '/app/billing');
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again.';
      message.error(msg);
    }
  };

  return (
    <div className="signup-page">
      <aside className="signup-page__brand">
        <div className="signup-page__brand-inner">
          <Link to="/" className="signup-page__logo-link" aria-label="Saptta home">
            <img src="/logo.jpeg" alt="Saptta" className="signup-page__logo" />
          </Link>

          <div className="signup-page__brand-copy">
            <p className="signup-page__eyebrow">Start your free trial</p>
            <h1 className="signup-page__headline">
              HR &amp; finance, ready in minutes.
            </h1>
            <p className="signup-page__subline">
              Pick a plan, create your workspace, and onboard your team with guided setup for payroll, GST, and compliance.
            </p>

            <ul className="signup-page__trust">
              {TRUST_POINTS.map((item) => (
                <li key={item}>
                  <CheckCircleOutlined className="signup-page__trust-icon" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="signup-page__copyright">
            © {new Date().getFullYear()} Saptta Tech Solutions Pvt. Ltd.
          </p>
        </div>
      </aside>

      <main className="signup-page__main">
        <div className="signup-page__shell">
          <Link to="/" className="signup-page__logo-link signup-page__logo-link--mobile" aria-label="Saptta home">
            <img src="/logo.jpeg" alt="Saptta" className="signup-page__logo" />
          </Link>

          <header className="signup-page__topbar">
            <div className="signup-page__steps" aria-label="Signup progress">
              <div className={`signup-page__step${step >= 0 ? ' signup-page__step--active' : ''}${step > 0 ? ' signup-page__step--done' : ''}`}>
                <span className="signup-page__step-num">1</span>
                <span className="signup-page__step-label">Choose plan</span>
              </div>
              <div className="signup-page__step-line" aria-hidden />
              <div className={`signup-page__step${step >= 1 ? ' signup-page__step--active' : ''}`}>
                <span className="signup-page__step-num">2</span>
                <span className="signup-page__step-label">Create account</span>
              </div>
            </div>
            <p className="signup-page__signin">
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </header>

          {step === 0 && (
            <section className="signup-page__section" aria-labelledby="signup-plans-heading">
              <header className="signup-page__section-header signup-page__section-header--center">
                <h2 id="signup-plans-heading" className="signup-page__title">
                  Choose your plan
                </h2>
                <p className="signup-page__subtitle">
                  Billed annually · prices shown per month · switch plans anytime
                </p>
              </header>

              <div className="signup-page__plans">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className={`signup-page__plan-card${plan.highlighted ? ' signup-page__plan-card--featured' : ''}${selectedPlanId === plan.id ? ' signup-page__plan-card--selected' : ''}`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {plan.badge && (
                      <span className="signup-page__plan-ribbon">{plan.badge}</span>
                    )}
                    <span className={`signup-page__plan-badge ${planProductModifier(plan)}`}>
                      {planProductLabel(plan)}
                    </span>
                    <h3 className="signup-page__plan-name">{plan.name}</h3>
                    <p className="signup-page__plan-desc">{plan.description}</p>
                    <div className="signup-page__plan-price">
                      <span className="signup-page__plan-amount">₹{formatPrice(Math.round(plan.annualPrice / 12))}</span>
                      <span className="signup-page__plan-period">/mo</span>
                    </div>
                    <ul className="signup-page__plan-features">
                      {plan.features.slice(0, 4).map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <span className="signup-page__plan-cta">Select plan</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && selectedPlan && (
            <section className="signup-page__section signup-page__section--account" aria-labelledby="signup-account-heading">
              <div className="signup-page__account-grid">
                <div className="signup-page__form-card">
                  <header className="signup-page__section-header">
                    <h2 id="signup-account-heading" className="signup-page__title">
                      Create your account
                    </h2>
                    <p className="signup-page__subtitle">
                      You&apos;re signing up for <strong>{selectedPlan.name}</strong>
                    </p>
                  </header>

                  <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false} className="signup-page__form">
                    <div className="signup-page__name-row">
                      <Form.Item
                        name="firstName"
                        label="First name"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Input placeholder="John" size="large" />
                      </Form.Item>
                      <Form.Item
                        name="lastName"
                        label="Last name"
                        rules={[{ required: true, message: 'Required' }]}
                      >
                        <Input placeholder="Doe" size="large" />
                      </Form.Item>
                    </div>

                    <Form.Item
                      name="companyName"
                      label="Company name"
                      rules={[{ required: true, message: 'Enter your company name' }]}
                    >
                      <Input placeholder="Acme Pvt Ltd" size="large" />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      label="Work email"
                      rules={[
                        { required: true, message: 'Enter your email' },
                        { type: 'email', message: 'Enter a valid email' },
                      ]}
                    >
                      <Input placeholder="you@company.com" size="large" />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label="Password"
                      rules={[
                        { required: true, message: 'Create a password' },
                        { min: 8, message: 'Minimum 8 characters' },
                      ]}
                    >
                      <Input.Password placeholder="Minimum 8 characters" size="large" />
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={isLoading}
                      className="signup-page__submit"
                    >
                      Create account &amp; continue
                    </Button>
                  </Form>

                  <button type="button" className="signup-page__back" onClick={() => setStep(0)}>
                    ← Change plan
                  </button>

                  <p className="signup-page__legal">
                    By creating an account you agree to our{' '}
                    <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
                  </p>
                </div>

                <aside className="signup-page__summary" aria-label="Selected plan summary">
                  <span className={`signup-page__plan-badge ${planProductModifier(selectedPlan)}`}>
                    {planProductLabel(selectedPlan)}
                  </span>
                  <h3 className="signup-page__summary-name">{selectedPlan.name}</h3>
                  <p className="signup-page__summary-desc">{selectedPlan.description}</p>

                  <div className="signup-page__summary-price">
                    <span className="signup-page__plan-amount">₹{formatPrice(Math.round(selectedPlan.annualPrice / 12))}</span>
                    <span className="signup-page__plan-period">/mo billed annually</span>
                  </div>

                  <div className="signup-page__summary-trial">
                    <strong>14-day free trial</strong>
                    <span>No credit card required</span>
                  </div>

                  <div className="signup-page__summary-features">
                    <p className="signup-page__summary-label">What&apos;s included</p>
                    <ul>
                      {selectedPlan.features.slice(0, 8).map((f) => (
                        <li key={f}>
                          <CheckCircleOutlined aria-hidden />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {selectedPlan.features.length > 8 && (
                      <p className="signup-page__summary-more">
                        +{selectedPlan.features.length - 8} more features
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
