import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Tag, message, Card, Table, Divider, InputNumber, Input, Checkbox } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  StarFilled,
  ThunderboltOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS, planMonthly, annualFromMonthly, withGst, GST_RATE, INCLUDED_EMPLOYEES, EXTRA_EMPLOYEE_PRICE } from '../../types';
import { startCheckout } from '../../lib/billing';
import { validateBillingCoupon, fetchMySubscription, type MySubscription } from '../../lib/api';
import type { SaasInvoiceDTO } from '../../lib/api';
import AuthFooter from '../../components/layout/AuthFooter';

const INR = (v: string | number) => `₹${new Intl.NumberFormat('en-IN').format(Number(v ?? 0) || 0)}`;
const statusColor: Record<string, string> = { TRIAL: 'blue', ACTIVE: 'green', PAST_DUE: 'orange', CANCELLED: 'red' };

/**
 * Customer billing surface: current products + plan picker that opens checkout.
 */
export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [employees, setEmployees] = useState(INCLUDED_EMPLOYEES);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState('');
  const [couponPreview, setCouponPreview] = useState<{
    discount_amount?: string;
    taxable_amount?: string;
    gst_amount?: string;
    total_amount?: string;
    free_checkout?: boolean;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  // Live subscription via platform API (works on localhost:8080 without tenant subdomain).
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    const fromUrl = Number(searchParams.get('employees'));
    if (Number.isFinite(fromUrl) && fromUrl >= INCLUDED_EMPLOYEES) {
      setEmployees(Math.floor(fromUrl));
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setSubLoading(true);
    fetchMySubscription()
      .then((data) => { if (!cancelled) setSub(data); })
      .catch(() => { if (!cancelled) setSub(null); })
      .finally(() => { if (!cancelled) setSubLoading(false); });
    return () => { cancelled = true; };
  }, []);
  
  // Prefer live entitlement products; fall back to the auth context.
  const products = sub
    ? sub.products.map(p => (p === 'HR' ? 'hrms' : 'finance'))
    : user?.products ?? [];

  const isPending = !subLoading && sub && (sub.status as string) === 'PENDING';

  const subscribe = async (planId: string) => {
    if (!legalAccepted) {
      message.warning('Please accept the Terms of Service and Privacy Policy before checkout.');
      return;
    }
    setLoadingPlan(planId);
    try {
      const res = await startCheckout(planId, {
        cycle: billingCycle,
        employees,
        couponCode: couponApplied || undefined,
        email: user?.email,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
      });

      if (res.status === 'success' || res.status === 'activated') {
        navigate('/app/billing/success', { replace: true, state: { planId } });
      } else if (res.status === 'failed') {
        navigate('/app/billing/failed', { replace: true, state: { message: res.message } });
      } else if (res.status === 'cancelled') {
        navigate('/app/billing/failed', { replace: true, state: { message: res.message, cancelled: true } });
      } else if (res.status === 'unavailable' || res.status === 'error') {
        message.error(res.message);
      }
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'Could not start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const applyCoupon = async (planId: string) => {
    const code = couponCode.trim();
    if (!code) {
      setCouponApplied('');
      setCouponPreview(null);
      return;
    }
    setCouponBusy(true);
    try {
      const preview = await validateBillingCoupon(planId, code, billingCycle, employees);
      if (preview.valid) {
        setCouponApplied(code.toUpperCase());
        setCouponPreview({
          discount_amount: preview.discount_amount,
          taxable_amount: preview.taxable_amount,
          gst_amount: preview.gst_amount,
          total_amount: preview.total_amount,
          free_checkout: preview.free_checkout,
        });
        message.success(
          `Coupon applied — pay ₹${Number(preview.total_amount || 0).toLocaleString('en-IN')} incl. ${Math.round(GST_RATE * 100)}% GST`,
        );
      }
    } catch (e: unknown) {
      setCouponApplied('');
      setCouponPreview(null);
      message.error(e instanceof Error ? e.message : 'Invalid coupon.');
    } finally {
      setCouponBusy(false);
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('en-IN').format(n);

  return (
    <>
    <div className="billing-scroll-shell">
    <div className="billing-page">
      <div className="billing-page__topbar">
        <span className="billing-page__step">Step 2 of 2 · Activate your workspace</span>
        {products.length > 0 && (
          <Button type="link" onClick={() => navigate('/app', { replace: true })} style={{ fontWeight: 600 }}>
            Open product switcher →
          </Button>
        )}
      </div>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px', position: 'relative' }}>
      
      {/* Background Orbs for Premium Aesthetics */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '20%',
        width: 350,
        height: 350,
        background: 'radial-gradient(circle, rgba(255, 109, 0, 0.08) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: 200,
        right: '10%',
        width: 450,
        height: 450,
        background: 'radial-gradient(circle, rgba(30, 42, 120, 0.05) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Back Button */}
      <div style={{ padding: '20px 0 12px', zIndex: 1, position: 'relative' }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (products.length > 0) navigate('/app', { replace: true });
            else navigate(-1);
          }}
          style={{ padding: 0, fontWeight: 600, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Redesigned Premium Header */}
      <div style={{ marginBottom: 40, textAlign: 'center', zIndex: 1, position: 'relative' }} className="anim-fadeInUp">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8, letterSpacing: '-0.03em' }}>
          Flexible Plans for <span className="gradient-text">Growing Businesses</span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>
          Select a plan below to unlock HR &amp; Finance. Scroll to compare all options — Saptta Complete is at the bottom.
        </p>
      </div>

      {/* Workspace Status Alerts */}
      {isPending && (
        <div style={{ marginBottom: 32, zIndex: 1, position: 'relative' }} className="anim-fadeInUp delay-1">
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,109,0,0.03) 0%, rgba(255,109,0,0.07) 100%)',
            border: '1px solid rgba(255, 109, 0, 0.25)',
            borderRadius: 16,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            boxShadow: '0 4px 20px rgba(255,109,0,0.03)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 109, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF6D00',
              fontSize: 18,
              fontWeight: 800,
              flexShrink: 0
            }}>
              !
            </div>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text-primary)', margin: 0 }}>Workspace Activation Required</h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '2px 0 0' }}>Your account is active, but your workspace is pending. Pick a plan below to complete setup.</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Products & Live Subscription Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }} className="anim-fadeInUp delay-1">
        
        {/* Active Products */}
        <Card style={{
          borderRadius: 16,
          boxShadow: 'var(--shadow-secondary)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-container)'
        }} styles={{ body: { padding: 20 } }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Active Workspace Products
          </div>
          {products.length ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {products.includes('hrms') && (
                <Tag color="orange" style={{ fontWeight: 700, borderRadius: 8, padding: '6px 14px', fontSize: 12, border: 'none', background: 'rgba(255, 109, 0, 0.08)', color: '#FF6D00' }}>
                  Saptta HRMS
                </Tag>
              )}
              {products.includes('finance') && (
                <Tag color="green" style={{ fontWeight: 700, borderRadius: 8, padding: '6px 14px', fontSize: 12, border: 'none', background: 'rgba(0, 200, 83, 0.08)', color: '#00C853' }}>
                  fin-saptta
                </Tag>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No active products — select a subscription plan below.</span>
          )}
        </Card>

        {/* Live Subscription Status */}
        {!subLoading && sub && (
          <Card style={{
            borderRadius: 16,
            boxShadow: 'var(--shadow-secondary)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-container)'
          }} styles={{ body: { padding: 20 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Plan</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>{sub.plan.name}</div>
              </div>
              <Tag color={statusColor[sub.status] ?? 'default'} style={{ fontWeight: 700, borderRadius: 6, padding: '4px 10px', fontSize: 11 }}>
                {sub.status}
              </Tag>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
              {sub.status === 'TRIAL' && sub.trial_ends_at && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Trial Ends</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{new Date(sub.trial_ends_at).toLocaleDateString('en-IN')}</div>
                </div>
              )}
              {sub.current_period_end && (
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Renews On</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{new Date(sub.current_period_end).toLocaleDateString('en-IN')}</div>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Workspace Domain</span>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{sub.workspace}.localhost</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Invoice History Details if present */}
      {!subLoading && sub && sub.invoices && sub.invoices.length > 0 && (
        <Card style={{ borderRadius: 16, marginBottom: 40, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-secondary)' }}
          title={<span style={{ fontWeight: 800, fontSize: 15 }}>Billing History & Invoices</span>}
          styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={sub.invoices}
            rowKey="id"
            size="middle"
            pagination={false}
            columns={[
              { title: 'Invoice #', dataIndex: 'number', key: 'number', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{v || '—'}</span> },
              { title: 'Billing Period', key: 'period', render: (_: unknown, r: SaasInvoiceDTO) => `${new Date(r.period_start).toLocaleDateString('en-IN')} – ${new Date(r.period_end).toLocaleDateString('en-IN')}` },
              { title: 'Taxable (ex-GST)', key: 'taxable', render: (_: unknown, r: SaasInvoiceDTO) => INR(r.taxable_amount) },
              { title: 'GST @ 18%', key: 'gst_total', render: (_: unknown, r: SaasInvoiceDTO) => {
                const igst = Number(r.igst) || 0;
                const gstTotal = igst > 0 ? igst : (Number(r.cgst) || 0) + (Number(r.sgst) || 0);
                return INR(gstTotal);
              } },
              { title: 'Tax Breakup', key: 'gst', render: (_: unknown, r: SaasInvoiceDTO) => {
                const igst = Number(r.igst) || 0;
                return igst > 0 ? `IGST ${INR(r.igst)}` : `CGST ${INR(r.cgst)} + SGST ${INR(r.sgst)}`;
              } },
              { title: 'Total (incl. GST)', key: 'amount', render: (_: unknown, r: SaasInvoiceDTO) => <strong style={{ color: 'var(--color-text-primary)' }}>{INR(r.amount)}</strong> },
              { title: 'Status', key: 'status', render: (_: unknown, r: SaasInvoiceDTO) => <Tag color={r.status === 'PAID' ? 'green' : r.status === 'OPEN' ? 'orange' : 'default'} style={{ borderRadius: 6, fontWeight: 700 }}>{r.status}</Tag> },
            ]}
          />
        </Card>
      )}

      {/* Interactive Billing Cycle Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }} className="anim-fadeInUp delay-2">
        <div style={{
          background: 'rgba(30, 42, 120, 0.04)',
          padding: '4px',
          borderRadius: '30px',
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid rgba(30, 42, 120, 0.06)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <Button
            shape="round"
            onClick={() => setBillingCycle('monthly')}
            style={{
              height: '36px',
              fontWeight: 700,
              padding: '0 20px',
              fontSize: 13,
              boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(255,109,0,0.15)' : 'none',
              background: billingCycle === 'monthly' ? 'linear-gradient(135deg, #FF9800, #FF6D00)' : 'transparent',
              border: 'none',
              color: billingCycle === 'monthly' ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.3s ease'
            }}
          >
            Monthly
          </Button>
          <Button
            shape="round"
            onClick={() => setBillingCycle('annual')}
            style={{
              height: '36px',
              fontWeight: 700,
              padding: '0 20px',
              fontSize: 13,
              boxShadow: billingCycle === 'annual' ? '0 2px 8px rgba(255,109,0,0.15)' : 'none',
              background: billingCycle === 'annual' ? 'linear-gradient(135deg, #FF9800, #FF6D00)' : 'transparent',
              border: 'none',
              color: billingCycle === 'annual' ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.3s ease'
            }}
          >
            Annually <span style={{
              fontSize: '10px',
              background: billingCycle === 'annual' ? 'rgba(255,255,255,0.2)' : 'rgba(255,109,0,0.1)',
              color: billingCycle === 'annual' ? '#fff' : '#FF6D00',
              padding: '2px 8px',
              borderRadius: '10px',
              marginLeft: '6px',
              fontWeight: 800
            }}>Save 20%</span>
          </Button>
        </div>
      </div>

      {/* Coupon code — use DEMO100 for demo without Razorpay */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }} className="anim-fadeInUp delay-2">
        <Input
          placeholder="Coupon code (e.g. DEMO100)"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          style={{ width: 200, textTransform: 'uppercase' }}
          onPressEnter={() => applyCoupon(PLANS[0]?.id ?? 'saptta-complete')}
        />
        <Button loading={couponBusy} onClick={() => applyCoupon(PLANS[0]?.id ?? 'saptta-complete')}>
          Apply coupon
        </Button>
        {couponApplied && couponPreview && (
          <Tag color="green" style={{ fontWeight: 700, padding: '4px 10px' }}>
            {couponApplied} — {couponPreview.free_checkout
              ? 'Free checkout'
              : `₹${Number(couponPreview.taxable_amount || 0).toLocaleString('en-IN')} + GST ₹${Number(couponPreview.gst_amount || 0).toLocaleString('en-IN')} = ₹${Number(couponPreview.total_amount || 0).toLocaleString('en-IN')}`}
          </Tag>
        )}
      </div>

      {/* Headcount selector — HRMS & Complete include 30 employees, +₹111 each after */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 40, flexWrap: 'wrap' }} className="anim-fadeInUp delay-2">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Number of employees</span>
        <InputNumber
          min={1}
          max={5000}
          value={employees}
          onChange={(v) => setEmployees(Number(v) || 1)}
          style={{ width: 110 }}
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          HRMS &amp; Complete include {INCLUDED_EMPLOYEES} employees · +₹{EXTRA_EMPLOYEE_PRICE} each after · prices ex-GST, {Math.round(GST_RATE * 100)}% GST added at checkout
        </span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto 32px', textAlign: 'left' }} className="anim-fadeInUp delay-2">
        <Checkbox checked={legalAccepted} onChange={(e) => setLegalAccepted(e.target.checked)}>
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          {' '}(subscription fees are non-refundable except as required by law).
        </Checkbox>
      </div>

      {/* Pricing Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 24,
        zIndex: 1,
        position: 'relative'
      }} className="anim-fadeInUp delay-2">
        {PLANS.map((plan) => {
          const isComplete = plan.id === 'saptta-complete';
          const isHrms = plan.id.startsWith('hrms');
          const isFinance = plan.id.startsWith('finance');
          
          // Card specific branding colors
          let themeColor = 'var(--color-primary)';
          let bgGradient = 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)';
          let borderStyle = '1px solid var(--color-border)';

          if (isComplete) {
            themeColor = '#FF6D00';
            bgGradient = 'linear-gradient(135deg, #ffffff 0%, rgba(255, 109, 0, 0.02) 100%)';
            borderStyle = '2px solid #FF6D00';
          } else if (isHrms) {
            themeColor = 'var(--color-secondary)';
            bgGradient = 'linear-gradient(135deg, #ffffff 0%, rgba(30, 42, 120, 0.01) 100%)';
          } else if (isFinance) {
            themeColor = '#00C853';
            bgGradient = 'linear-gradient(135deg, #ffffff 0%, rgba(0, 200, 83, 0.01) 100%)';
          }

          const displayPrice = planMonthly(plan, employees);
          const monthlyPayable = withGst(displayPrice);
          const annualEx = annualFromMonthly(displayPrice);
          const annualPayable = withGst(annualEx);
          const unitLabel =
            plan.includedEmployees != null
              ? `Up to ${plan.includedEmployees} employees · +₹${EXTRA_EMPLOYEE_PRICE} each`
              : 'Flat · unlimited users';

          return (
            <div
              key={plan.id}
              className="card-hover"
              style={{
                background: bgGradient,
                borderRadius: 20,
                padding: '32px 24px',
                border: borderStyle,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isComplete ? '0 12px 32px rgba(255,109,0,0.08)' : 'var(--shadow-secondary)',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <span style={{
                  position: 'absolute',
                  top: -12,
                  right: 20,
                  background: 'linear-gradient(135deg, #FF6D00, #FFA000)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '4px 12px',
                  borderRadius: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 10px rgba(255,109,0,0.2)'
                }}>
                  {plan.badge}
                </span>
              )}

              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {isComplete && <StarFilled style={{ color: '#FF6D00', fontSize: 16 }} />}
                  {isHrms && <ThunderboltOutlined style={{ color: 'var(--color-secondary)', fontSize: 16 }} />}
                  {isFinance && <ThunderboltOutlined style={{ color: '#00C853', fontSize: 16 }} />}
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text-primary)', margin: 0 }}>
                    {plan.name}
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, minHeight: 36, margin: 0 }}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: themeColor, letterSpacing: '-0.02em' }}>
                  ₹{formatPrice(displayPrice)}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600 }}>/mo ex-GST</span>
                <div style={{ fontSize: 12, color: themeColor, fontWeight: 700, marginTop: 6 }}>
                  + {Math.round(GST_RATE * 100)}% GST = ₹{formatPrice(monthlyPayable)}/mo payable
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 4 }}>
                  {unitLabel}
                </div>
                {billingCycle === 'annual' && (
                  <div style={{ fontSize: 11, color: '#FF6D00', fontWeight: 700, marginTop: 4 }}>
                    Billed annually: ₹{formatPrice(annualEx)} + GST = ₹{formatPrice(annualPayable)}/yr payable
                  </div>
                )}
              </div>

              <Divider style={{ margin: '0 0 20px', borderColor: 'rgba(0,0,0,0.04)' }} />

              {/* Features */}
              <div style={{ flex: 1, marginBottom: 28 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                  Key Features Included:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.slice(0, 6).map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckOutlined style={{ color: themeColor, fontSize: 12, marginTop: 3, strokeWidth: 3, fontWeight: 'bold' }} />
                      <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                  {plan.features.length > 6 && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', paddingLeft: 20, fontWeight: 600 }}>
                      + {plan.features.length - 6} more features
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <Button
                type="primary"
                block
                loading={loadingPlan === plan.id}
                onClick={() => subscribe(plan.id)}
                style={{
                  background: isComplete
                    ? 'linear-gradient(135deg, #FF9800, #FF6D00)'
                    : 'var(--color-text-primary)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  height: 46,
                  borderRadius: 10,
                  boxShadow: isComplete ? '0 6px 16px rgba(255,109,0,0.18)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                Get Started
              </Button>
            </div>
          );
        })}
      </div>

      {/* Trust Badge / Footer */}
      <div style={{
        marginTop: 48,
        textAlign: 'center',
        background: 'rgba(30, 42, 120, 0.02)',
        borderRadius: 14,
        padding: '16px 20px',
        border: '1px solid rgba(30, 42, 120, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }} className="anim-fadeInUp delay-3">
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          🔒 Payments are processed securely via <strong>Razorpay</strong>. GST-compliant invoice will be emailed instantly.
        </span>
      </div>
    </div>
    </div>
    </div>
    <AuthFooter />
    </>
  );
}
