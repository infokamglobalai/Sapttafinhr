import { useState, useEffect } from 'react';
import { Form, Input, Button, Steps, Tag, Slider, message, Select } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  CheckCircleFilled,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  CrownOutlined,
  CheckOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import { useAuth } from '../contexts/AuthContext';
import { fetchProvisioningStatus } from '../lib/api';
import { PLANS, planMonthly, extraEmployees, EXTRA_EMPLOYEE_PRICE, GST_RATE } from '../types';

/**
 * Poll the backend until the new workspace's schema is built. Signup now returns
 * immediately (HTTP 202) while a worker provisions in the background, so we wait
 * here before routing the user into the app (which makes tenant-scoped calls).
 */
async function pollProvisioning(timeoutMs = 90_000): Promise<'ready' | 'failed' | 'timeout'> {
  const deadline = Date.now() + timeoutMs;
  let delay = 800;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 200, 2000);
    try {
      const s = await fetchProvisioningStatus();
      if (s.ready) return 'ready';
      if (s.failed) return 'failed';
    } catch {
      /* transient — keep polling */
    }
  }
  return 'timeout';
}

const SIGNUP_COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'OM', label: 'Oman' },
  { value: 'QA', label: 'Qatar' },
];

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isLoading, refreshProducts } = useAuth();
  const [form] = Form.useForm();

  const preselectedPlanId = (location.state as { planId?: string })?.planId || 'saptta-complete';
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(preselectedPlanId);
  const [step, setStep] = useState(1); // Default to Step 1 (Create Account) if they come from pricing, otherwise Step 0
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [headcount, setHeadcount] = useState<number>(30);
  const [passwordValue, setPasswordValue] = useState<string>('');

  // Sync with initial state
  useEffect(() => {
    if (location.state && (location.state as { planId?: string }).planId) {
      setSelectedPlanId((location.state as { planId?: string }).planId || 'saptta-complete');
      setStep(1);
    } else {
      setStep(0); // Choose plan first if no plan selected
    }
  }, [location.state]);

  // When the step changes (e.g. Choose Plan → Create Account) the SPA keeps the
  // previous scroll position. Coming off the tall plan grid that drops the user
  // onto the *bottom* of the shorter form, which looks cut off under the navbar.
  // Reset to the top on every step change so the form always starts in view.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const selectedPlan = PLANS.find(p => p.id === selectedPlanId);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setStep(1);
  };

  const handleSubmit = async (values: { email: string; password: string; firstName: string; lastName: string; companyName: string; country?: string }) => {
    if (!selectedPlanId) return;
    // Signup returns instantly; the tenant schema is then built in the
    // background. Show a persistent status while we poll for it so the form
    // doesn't look frozen.
    const hideLoading = message.loading('Creating your account…', 0);
    try {
      const { provisioning } = await signup({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        planId: selectedPlanId,
        companyName: values.companyName,
        country: values.country || 'IN',
      });

      hideLoading();
      message.success('Account created! Choose a plan to activate your workspace.');

      // Checkout only needs the tenant row (created instantly). Schema build runs
      // in the background — don't block the user on a 3-minute poll here.
      if (provisioning) {
        void pollProvisioning().then(async (result) => {
          if (result === 'ready') await refreshProducts().catch(() => {});
        });
      } else {
        await refreshProducts().catch(() => {});
      }

      navigate('/app/billing', { replace: true });
    } catch (err: unknown) {
      hideLoading();
      // A network-level "Failed to fetch" means the request was dropped before a
      // response came back. The account may still have been created, so steer
      // the user to sign in instead of showing a raw fetch error.
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message));
      if (isNetworkError) {
        message.warning({
          content:
            'Your workspace is taking a little longer to finish setting up. ' +
            'Give it a minute, then sign in with the email and password you just entered — ' +
            'no need to sign up again.',
          duration: 10,
        });
        return;
      }
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again.';
      message.error(msg);
    }
  };

  const formatPrice = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);

  // Price Calculation details
  const getPlanPriceExGst = (planId: string) => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return 0;
    const monthlyRate = planMonthly(plan, headcount);
    return billingCycle === 'annual' ? monthlyRate * 12 : monthlyRate;
  };

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^a-zA-Z\d]/.test(pass)) score += 1;
    return score;
  };

  const pwdStrength = getPasswordStrength(passwordValue);

  // Trial end date helper (14 days from now)
  const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#FAFAFC',
      position: 'relative',
      overflowX: 'clip',
    }} className="signup-container">
      {/* Styles Injection */}
      <style>{`
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 1;
        }
        .orb-1 {
          width: 600px;
          height: 600px;
          top: -200px;
          right: -200px;
          background: radial-gradient(circle, rgba(255, 109, 0, 0.08) 0%, rgba(255, 109, 0, 0.01) 70%);
          animation: orbPulse 8s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 500px;
          height: 500px;
          bottom: -200px;
          left: -200px;
          background: radial-gradient(circle, rgba(138, 43, 226, 0.06) 0%, rgba(138, 43, 226, 0.01) 70%);
          animation: orbPulse 12s ease-in-out infinite alternate-reverse;
        }
        @keyframes orbPulse {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -40px) scale(1.15); }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.75) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(10, 17, 40, 0.06) !important;
          border-radius: 20px !important;
          box-shadow: 0 10px 32px rgba(10, 17, 40, 0.02) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .glass-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 109, 0, 0.25) !important;
          box-shadow: 0 20px 48px rgba(255, 109, 0, 0.06), 0 4px 16px rgba(10, 17, 40, 0.02) !important;
        }
        .plan-card-selected {
          border: 2px solid #FF6D00 !important;
          box-shadow: 0 20px 48px rgba(255, 109, 0, 0.1) !important;
        }
        .plan-card-complete {
          background: linear-gradient(135deg, #0A1128 0%, #172242 100%) !important;
          border: 1px solid rgba(255, 109, 0, 0.25) !important;
        }
        .plan-card-complete:hover {
          border-color: rgba(255, 109, 0, 0.5) !important;
          box-shadow: 0 25px 60px rgba(255, 109, 0, 0.15) !important;
        }
        .plan-card-complete-selected {
          border: 2.5px solid #FF6D00 !important;
          box-shadow: 0 25px 60px rgba(255, 109, 0, 0.2) !important;
        }
        .custom-input input, .custom-input .ant-input-affix-wrapper {
          border-radius: 10px !important;
          border: 1.5px solid #EAECEF !important;
          padding: 10px 14px !important;
          font-size: 14px !important;
          transition: all 0.2s ease !important;
        }
        .custom-input .ant-input-affix-wrapper {
          padding: 4px 14px !important;
        }
        .custom-input input:focus, .custom-input .ant-input-affix-wrapper-focused {
          border-color: #FF6D00 !important;
          box-shadow: 0 0 0 3px rgba(255, 109, 0, 0.12) !important;
        }
        .headcount-slider .ant-slider-track {
          background-color: #FF6D00 !important;
        }
        .headcount-slider .ant-slider-handle {
          border-color: #FF6D00 !important;
          background-color: #ffffff !important;
          box-shadow: 0 2px 6px rgba(255, 109, 0, 0.3) !important;
        }
        .headcount-slider .ant-slider-handle:hover {
          transform: scale(1.2) !important;
        }
        .password-indicator-dot {
          height: 5px;
          flex: 1;
          border-radius: 99px;
          background-color: #EAECEF;
          transition: all 0.3s ease;
        }
        .password-indicator-dot.active-weak { background-color: #FF4D4F; }
        .password-indicator-dot.active-medium { background-color: #FFA940; }
        .password-indicator-dot.active-strong { background-color: #52C41A; }
        .cycle-toggle-btn {
          border-radius: 99px;
          padding: 6px 20px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
          background: transparent;
          color: rgba(10, 17, 40, 0.6);
        }
        .cycle-toggle-btn.active {
          background: #0A1128;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(10, 17, 40, 0.15);
        }
      `}</style>

      {/* Ambient backgrounds */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Page intro — quick sign-in card for returning users */}
      <div className="signup-page__intro">
        <div className="signup-page__intro-card">
          <span className="signup-page__intro-label">Already have an account?</span>
          <Link to="/login" className="signup-page__intro-cta">Sign in</Link>
        </div>
      </div>

      {/* Main Layout Area */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: 1250,
        margin: '0 auto',
        padding: '16px 24px 60px',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Steps display */}
        <div style={{ maxWidth: 460, width: '100%', margin: '0 auto 40px' }}>
          <Steps
            current={step}
            size="small"
            items={[
              { title: 'Choose Plan' },
              { title: 'Create Account' },
            ]}
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              padding: '12px 24px',
              borderRadius: 50,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(10, 17, 40, 0.03)',
            }}
          />
        </div>

        {/* Step 0: Plan Selection */}
        {step === 0 && (
          <ScrollReveal animation="fade-in-up">
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h1 style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                marginBottom: 12,
                letterSpacing: '-1px',
              }}>
                Choose your workspace foundation
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
                Scale up or down as your business evolves.
              </p>
            </div>

            {/* Interactive Settings Dashboard */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(10,17,40,0.05)',
              borderRadius: 24,
              padding: '24px 32px',
              maxWidth: 780,
              margin: '0 auto 40px',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              boxShadow: '0 8px 32px rgba(10,17,40,0.01)',
            }}>
              {/* Headcount Slider & Toggle row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                {/* Billing cycle toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(10,17,40,0.4)' }}>
                    Billing Frequency
                  </span>
                  <div style={{ background: '#F1F3F5', padding: 4, borderRadius: 99, display: 'flex', gap: 2, border: '1px solid rgba(0,0,0,0.02)' }}>
                    <button
                      className={`cycle-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                      onClick={() => setBillingCycle('monthly')}
                    >
                      Monthly
                    </button>
                    <button
                      className={`cycle-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                      onClick={() => setBillingCycle('annual')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      Annually
                      <span style={{ background: 'linear-gradient(135deg, #00C853, #00B0FF)', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>
                        Save 20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Team headcount display */}
                <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(10,17,40,0.4)' }}>
                      Estimated Team Size
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#FF6D00' }}>
                      {headcount} employees
                    </span>
                  </div>
                  <div className="headcount-slider" style={{ padding: '4px 0' }}>
                    <Slider
                      min={5}
                      max={250}
                      value={headcount}
                      onChange={(val) => setHeadcount(val)}
                      tooltip={{ formatter: (v) => `${v} Employees` }}
                    />
                  </div>
                </div>
              </div>

              {extraEmployees(PLANS[0], headcount) > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12.5,
                  color: 'rgba(10,17,40,0.5)',
                  background: 'rgba(255, 109, 0, 0.05)',
                  border: '1px solid rgba(255, 109, 0, 0.1)',
                  padding: '10px 16px',
                  borderRadius: 12,
                }}>
                  <InfoCircleOutlined style={{ color: '#FF6D00', fontSize: 14 }} />
                  <span>
                    Your team size exceeds the standard <strong>30 employee base limit</strong>. Additional seats are automatically calculated at <strong>₹{EXTRA_EMPLOYEE_PRICE}/mo</strong> per employee.
                  </span>
                </div>
              )}
            </div>

            {/* Grid of Plans */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 24,
              maxWidth: 1100,
              margin: '0 auto',
            }}>
              {PLANS.map(plan => {
                const isComplete = plan.id === 'saptta-complete';
                const isSelected = selectedPlanId === plan.id;
                const monthlyPriceCalc = planMonthly(plan, headcount);
                const displayPrice = billingCycle === 'annual' ? monthlyPriceCalc * 12 : monthlyPriceCalc;
                const extraCount = extraEmployees(plan, headcount);

                return (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan.id)}
                    className={`glass-card ${isComplete ? 'plan-card-complete' : ''} ${
                      isSelected ? (isComplete ? 'plan-card-complete-selected' : 'plan-card-selected') : ''
                    }`}
                    style={{
                      padding: '36px 28px',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 450,
                    }}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <span style={{
                        position: 'absolute',
                        top: -12,
                        right: 20,
                        background: 'linear-gradient(135deg, #FF6D00, #FFA000)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                        boxShadow: '0 4px 12px rgba(255,109,0,0.3)',
                        letterSpacing: '0.5px'
                      }}>
                        {plan.badge}
                      </span>
                    )}

                    <div>
                      {/* Plan Tag */}
                      <Tag
                        color={isComplete ? 'purple' : plan.products[0] === 'hrms' ? 'orange' : 'green'}
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          borderRadius: 6,
                          marginBottom: 16,
                          padding: '2px 8px',
                          border: 'none',
                          background: isComplete ? 'rgba(138,43,226,0.15)' : plan.products[0] === 'hrms' ? 'rgba(255,109,0,0.12)' : 'rgba(0,200,83,0.12)',
                          color: isComplete ? '#d8b4fe' : plan.products[0] === 'hrms' ? '#FF6D00' : '#00C853',
                        }}
                      >
                        {isComplete ? 'ALL-IN-ONE SYSTEM' : plan.products[0].toUpperCase()}
                      </Tag>

                      {/* Header */}
                      <h3 style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: isComplete ? '#FFFFFF' : '#0A1128',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        {isComplete && <CrownOutlined style={{ color: '#FFD700' }} />}
                        {plan.name}
                      </h3>

                      <p style={{
                        fontSize: 13,
                        color: isComplete ? 'rgba(255,255,255,0.6)' : 'var(--color-text-secondary)',
                        marginBottom: 24,
                        lineHeight: 1.5
                      }}>
                        {plan.description}
                      </p>

                      {/* Pricing block */}
                      <div style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{
                            fontSize: 32,
                            fontWeight: 900,
                            color: isComplete ? '#FF6D00' : '#0A1128',
                            letterSpacing: '-1.5px'
                          }}>
                            ₹{formatPrice(displayPrice)}
                          </span>
                          <span style={{
                            color: isComplete ? 'rgba(255,255,255,0.4)' : 'var(--color-text-muted)',
                            fontSize: 13,
                            fontWeight: 500
                          }}>
                            /{billingCycle === 'annual' ? 'yr' : 'mo'} + GST
                          </span>
                        </div>

                        {/* Calculations description */}
                        {extraCount > 0 && plan.includedEmployees != null ? (
                          <div style={{
                            fontSize: 11,
                            color: isComplete ? 'rgba(255,255,255,0.5)' : 'rgba(10,17,40,0.5)',
                            marginTop: 4
                          }}>
                            Base Price + ₹{formatPrice(extraCount * EXTRA_EMPLOYEE_PRICE)}/mo for {extraCount} extra employees
                          </div>
                        ) : plan.includedEmployees != null ? (
                          <div style={{
                            fontSize: 11,
                            color: isComplete ? 'rgba(255,255,255,0.5)' : 'rgba(10,17,40,0.5)',
                            marginTop: 4
                          }}>
                            Covers up to 30 employees
                          </div>
                        ) : (
                          <div style={{
                            fontSize: 11,
                            color: isComplete ? 'rgba(255,255,255,0.5)' : 'rgba(10,17,40,0.5)',
                            marginTop: 4
                          }}>
                            Flat price, unlimited dashboard users
                          </div>
                        )}

                        {billingCycle === 'annual' && (
                          <div style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isComplete ? '#00C853' : '#0091EA',
                            marginTop: 4
                          }}>
                            Equivalent to ₹{formatPrice(monthlyPriceCalc)}/mo billed annually
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div style={{
                        borderTop: isComplete ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(10,17,40,0.06)',
                        paddingTop: 20
                      }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isComplete ? 'rgba(255,255,255,0.5)' : 'rgba(10,17,40,0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          marginBottom: 12
                        }}>
                          Core Features
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {plan.features.slice(0, 6).map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <CheckOutlined style={{
                                color: isComplete ? '#FF6D00' : '#10B981',
                                fontSize: 12,
                                marginTop: 3
                              }} />
                              <span style={{
                                fontSize: 13,
                                color: isComplete ? 'rgba(255,255,255,0.75)' : 'rgba(10,17,40,0.7)',
                                lineHeight: 1.4
                              }}>
                                {f}
                              </span>
                            </div>
                          ))}
                          {plan.features.length > 6 && (
                            <span style={{
                              fontSize: 12,
                              color: '#FF6D00',
                              fontWeight: 600,
                              marginTop: 4,
                              display: 'inline-block'
                            }}>
                              +{plan.features.length - 6} additional enterprise features
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div style={{ marginTop: 32 }}>
                      <Button
                        type={isComplete ? 'primary' : 'default'}
                        block
                        size="large"
                        style={{
                          height: 48,
                          borderRadius: 10,
                          fontWeight: 700,
                          background: isComplete ? 'linear-gradient(135deg, #FF9800, #FF6D00)' : 'transparent',
                          border: isComplete ? 'none' : '1.5px solid rgba(10,17,40,0.15)',
                          color: isComplete ? 'white' : '#0A1128',
                          boxShadow: isComplete ? '0 6px 20px rgba(255,109,0,0.25)' : 'none',
                        }}
                      >
                        Choose Plan
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>
        )}

        {/* Step 1: Account Creation Form (Centered single-column layout) */}
        {step === 1 && selectedPlan && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
          }}>
            <ScrollReveal animation="fade-in-up" style={{ width: '100%', maxWidth: 540 }}>
              <div
                className="glass-card"
                style={{
                  width: '100%',
                  padding: '40px 36px',
                  position: 'relative',
                  background: '#FFFFFF !important',
                }}
              >
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    marginBottom: 6,
                    letterSpacing: '-0.5px'
                  }}>
                    Create your workspace
                  </h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                    Setup takes under a minute.
                  </p>
                </div>

                {/* Plan Summary Block inside the card */}
                <div style={{
                  background: '#F8F9FA',
                  borderRadius: 16,
                  padding: '16px 20px',
                  marginBottom: 24,
                  border: '1px solid rgba(10,17,40,0.03)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CrownOutlined style={{ color: '#FF6D00', fontSize: 14 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0A1128' }}>{selectedPlan.name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'rgba(10,17,40,0.55)', marginBottom: 5 }}>
                    <span>Billing cycle</span>
                    <span>{billingCycle === 'annual' ? 'Billed Annually' : 'Billed Monthly'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'rgba(10,17,40,0.55)', marginBottom: 5 }}>
                    <span>Estimated total (incl. 18% GST)</span>
                    <span style={{ fontWeight: 600, color: '#0A1128' }}>
                      ₹{formatPrice(Math.round(getPlanPriceExGst(selectedPlan.id) * (1 + GST_RATE)))}/{billingCycle === 'annual' ? 'yr' : 'mo'}
                    </span>
                  </div>
                </div>

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  requiredMark={false}
                  className="custom-input"
                >
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item
                      name="firstName"
                      label={<span style={{ fontWeight: 600, fontSize: 13, color: '#0A1128' }}>First Name</span>}
                      rules={[{ required: true, message: 'Required' }]}
                      style={{ flex: 1, marginBottom: 16 }}
                    >
                      <Input placeholder="John" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="lastName"
                      label={<span style={{ fontWeight: 600, fontSize: 13, color: '#0A1128' }}>Last Name</span>}
                      rules={[{ required: true, message: 'Required' }]}
                      style={{ flex: 1, marginBottom: 16 }}
                    >
                      <Input placeholder="Doe" size="large" />
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="companyName"
                    label={<span style={{ fontWeight: 600, fontSize: 13, color: '#0A1128' }}>Company Name</span>}
                    rules={[{ required: true, message: 'Enter your company name' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input placeholder="Acme Pvt Ltd" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="country"
                    label={<span style={{ fontWeight: 600, fontSize: 13, color: '#0A1128' }}>Country / region</span>}
                    initialValue="IN"
                    rules={[{ required: true, message: 'Select your country' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Select
                      size="large"
                      options={SIGNUP_COUNTRIES}
                      placeholder="Where is your company based?"
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label={<span style={{ fontWeight: 600, fontSize: 13, color: '#0A1128' }}>Work Email</span>}
                    rules={[
                      { required: true, message: 'Enter your email' },
                      { type: 'email', message: 'Enter a valid email' }
                    ]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input placeholder="you@company.com" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label={<span style={{ fontWeight: 600, fontSize: 13, color: '#0A1128' }}>Admin Password</span>}
                    rules={[
                      { required: true, message: 'Create a password' },
                      { min: 8, message: 'Minimum 8 characters' }
                    ]}
                    style={{ marginBottom: 8 }}
                  >
                    <Input.Password
                      placeholder="At least 8 characters"
                      size="large"
                      value={passwordValue}
                      onChange={(e) => setPasswordValue(e.target.value)}
                    />
                  </Form.Item>

                  {/* Password Strength Indicator */}
                  {passwordValue && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                        <div className={`password-indicator-dot ${pwdStrength >= 1 ? (pwdStrength === 1 ? 'active-weak' : pwdStrength === 2 || pwdStrength === 3 ? 'active-medium' : 'active-strong') : ''}`} />
                        <div className={`password-indicator-dot ${pwdStrength >= 2 ? (pwdStrength === 2 || pwdStrength === 3 ? 'active-medium' : 'active-strong') : ''}`} />
                        <div className={`password-indicator-dot ${pwdStrength >= 3 ? (pwdStrength === 3 ? 'active-medium' : 'active-strong') : ''}`} />
                        <div className={`password-indicator-dot ${pwdStrength >= 4 ? 'active-strong' : ''}`} />
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: pwdStrength === 1 ? '#FF4D4F' : pwdStrength === 2 || pwdStrength === 3 ? '#FFA940' : '#52C41A'
                      }}>
                        {pwdStrength === 1 && 'Weak password'}
                        {pwdStrength === 2 && 'Fair password'}
                        {pwdStrength === 3 && 'Good password'}
                        {pwdStrength === 4 && 'Strong password'}
                      </span>
                    </div>
                  )}

                  <Form.Item style={{ marginTop: 24, marginBottom: 16 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={isLoading}
                      style={{
                        fontWeight: 700,
                        height: 52,
                        borderRadius: 12,
                        fontSize: 15,
                        background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(255,109,0,0.25)',
                      }}
                    >
                      Create Workspace
                    </Button>
                  </Form.Item>
                </Form>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setStep(0)}
                    style={{ color: 'rgba(10,17,40,0.5)', padding: 0, fontSize: 13, display: 'flex', alignItems: 'center' }}
                  >
                    Change plan
                  </Button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SafetyCertificateOutlined style={{ color: '#00C853', fontSize: 14 }} />
                    <span style={{ fontSize: 12, color: 'rgba(10,17,40,0.4)', fontWeight: 500 }}>Secure registration</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}
      </div>
    </div>
  );
}
