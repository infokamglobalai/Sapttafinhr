import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, message, Card, Table, Alert, Spin, Modal, Form, Input, Divider, InputNumber } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CreditCardOutlined,
  LockOutlined,
  SafetyOutlined,
  StarFilled,
  ThunderboltOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS, planMonthly, INCLUDED_EMPLOYEES, EXTRA_EMPLOYEE_PRICE } from '../../types';
import { startCheckout } from '../../lib/billing';
import { useApiResource } from '../../hooks/useApiResource';
import { devActivateSubscription } from '../../lib/api';
import type { MySubscription, SaasInvoiceDTO } from '../../lib/api';

const INR = (v: string | number) => `₹${new Intl.NumberFormat('en-IN').format(Number(v ?? 0) || 0)}`;
const statusColor: Record<string, string> = { TRIAL: 'blue', ACTIVE: 'green', PAST_DUE: 'orange', CANCELLED: 'red' };

/**
 * Customer billing surface: current products + plan picker that opens checkout.
 */
export default function Billing() {
  const { user, refreshProducts } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [devModalPlan, setDevModalPlan] = useState<string>('');
  const [devPaying, setDevPaying] = useState(false);
  const [devStep, setDevStep] = useState<'form' | 'processing' | 'done'>('form');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [employees, setEmployees] = useState(INCLUDED_EMPLOYEES);

  // Live subscription for the current workspace (tenant-scoped endpoint).
  const subRes = useApiResource<MySubscription>('/saas/my-subscription/');
  const sub = subRes.data;
  
  // Prefer live entitlement products; fall back to the auth context.
  const products = sub
    ? sub.products.map(p => (p === 'HR' ? 'hrms' : 'finance'))
    : user?.products ?? [];

  const isPending = !sub || (sub.status as string) === 'PENDING';

  const subscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      if (import.meta.env.DEV) {
        try {
          await devActivateSubscription();
          await refreshProducts();
          message.success('Subscription activated! Opening your workspace…');
          navigate('/app', { replace: true });
          return;
        } catch {
          // Fall through to Razorpay or dev modal.
        }
      }

      const res = await startCheckout(planId, {
        cycle: billingCycle,
        employees,
        email: user?.email,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        onPaid: async () => {
          message.success('Payment received! Activating your subscription…');
          await refreshProducts();
          navigate('/app', { replace: true });
        },
      });
      if (res.status === 'unavailable') {
        setDevModalPlan(planId);
        setDevModalOpen(true);
      } else if (res.status === 'error') {
        message.error(res.message);
      }
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'Could not activate. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleDevPay = async () => {
    setDevPaying(true);
    setDevStep('processing');
    // Simulate network delay for realism.
    await new Promise(r => setTimeout(r, 1800));
    try {
      await devActivateSubscription();
      setDevStep('done');
      await new Promise(r => setTimeout(r, 1200));
      setDevModalOpen(false);
      message.success('Subscription activated! Opening your workspace…');
      navigate('/app', { replace: true });
    } catch {
      setDevStep('form');
      message.error('Activation failed. Check that your account has a workspace.');
    } finally {
      setDevPaying(false);
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('en-IN').format(n);

  const selectedPlan = PLANS.find(p => p.id === devModalPlan);

  return (
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
          onClick={() => navigate(-1)}
          style={{ padding: 0, fontWeight: 600, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Dev fake-payment modal */}
      <Modal
        open={devModalOpen}
        onCancel={() => { if (!devPaying) { setDevModalOpen(false); setDevStep('form'); } }}
        footer={null}
        width={440}
        closable={!devPaying}
        styles={{
          content: {
            borderRadius: 20,
            padding: '28px 24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,109,0,0.15)',
            overflow: 'hidden'
          }
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
            <CreditCardOutlined style={{ color: '#FF6D00', fontSize: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>Secure Checkout</span>
            <Tag color="orange" style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, borderRadius: 4 }}>DEV MODE</Tag>
          </div>
        }
      >
        {devStep === 'done' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              fontSize: 32,
              marginBottom: 16
            }}>
              ✓
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>Payment Successful!</div>
            <div style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>Activating your subscription…</div>
          </div>
        ) : devStep === 'processing' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 20, fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Processing payment…</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 6 }}>Please wait, do not close or refresh this window.</div>
          </div>
        ) : (
          <div>
            <Alert
              type="warning"
              showIcon
              message="Developer Sandbox"
              description="No real charges will be applied. Use this to test subscription flows."
              style={{ marginBottom: 20, borderRadius: 12, fontSize: 12, border: '1px solid rgba(255, 152, 0, 0.25)', background: 'rgba(255, 152, 0, 0.05)' }}
            />
            {selectedPlan && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,109,0,0.02) 0%, rgba(255,109,0,0.06) 100%)',
                borderRadius: 12,
                padding: '16px',
                marginBottom: 20,
                border: '1px solid rgba(255,109,0,0.12)'
              }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Selected Plan</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 2, color: 'var(--color-text-primary)' }}>{selectedPlan.name}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#FF6D00', marginTop: 6 }}>
                  ₹{new Intl.NumberFormat('en-IN').format(
                    billingCycle === 'monthly'
                      ? planMonthly(selectedPlan, employees)
                      : planMonthly(selectedPlan, employees) * 12,
                  )}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}> + GST /{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {selectedPlan.includedEmployees != null
                    ? `Up to ${selectedPlan.includedEmployees} employees · +₹${EXTRA_EMPLOYEE_PRICE} each after`
                    : 'Flat per company · unlimited users'}
                </div>
              </div>
            )}
            <Form layout="vertical" requiredMark={false}>
              <Form.Item label={<span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text-muted)' }}>CARD NUMBER</span>}>
                <Input prefix={<CreditCardOutlined style={{ color: '#aaa' }} />} value="4111 1111 1111 1111" readOnly style={{ fontFamily: 'monospace', background: '#f8fafc', borderRadius: 8 }} size="large" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item label={<span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text-muted)' }}>EXPIRY</span>} style={{ flex: 1 }}>
                  <Input value="12 / 28" readOnly style={{ background: '#f8fafc', borderRadius: 8, textAlign: 'center' }} size="large" />
                </Form.Item>
                <Form.Item label={<span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text-muted)' }}>CVV</span>} style={{ flex: 1 }}>
                  <Input prefix={<LockOutlined style={{ color: '#aaa' }} />} value="•••" readOnly style={{ background: '#f8fafc', borderRadius: 8, textAlign: 'center' }} size="large" />
                </Form.Item>
              </div>
              <Form.Item label={<span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text-muted)' }}>CARDHOLDER NAME</span>}>
                <Input value={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Demo User'} readOnly style={{ background: '#f8fafc', borderRadius: 8 }} size="large" />
              </Form.Item>
            </Form>
            <Divider style={{ margin: '16px 0' }} />
            <Button
              type="primary" block size="large"
              icon={<SafetyOutlined />}
              onClick={handleDevPay}
              style={{ height: 48, fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #FF9800, #FF6D00)', border: 'none', borderRadius: 10, boxShadow: '0 4px 12px rgba(255,109,0,0.2)' }}
            >
              Pay Now (Simulated)
            </Button>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12 }}>
              🔒 Secured Dev Checkout · Powered by Saptta
            </div>
          </div>
        )}
      </Modal>

      {/* Redesigned Premium Header */}
      <div style={{ marginBottom: 40, textAlign: 'center', zIndex: 1, position: 'relative' }} className="anim-fadeInUp">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 8, letterSpacing: '-0.03em' }}>
          Flexible Plans for <span className="gradient-text">Growing Businesses</span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>
          Select the optimal plan to scale your operations. Switch, upgrade, or cancel at any time.
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
        {!subRes.loading && sub && (
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
      {!subRes.loading && sub && sub.invoices && sub.invoices.length > 0 && (
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
              { title: 'Taxable Amount', key: 'taxable', render: (_: unknown, r: SaasInvoiceDTO) => INR(r.taxable_amount) },
              { title: 'Tax Breakup', key: 'gst', render: (_: unknown, r: SaasInvoiceDTO) => {
                const igst = Number(r.igst) || 0;
                return igst > 0 ? `IGST ${INR(r.igst)}` : `CGST+SGST ${INR((Number(r.cgst) || 0) + (Number(r.sgst) || 0))}`;
              } },
              { title: 'Total Paid', key: 'amount', render: (_: unknown, r: SaasInvoiceDTO) => <strong style={{ color: 'var(--color-text-primary)' }}>{INR(r.amount)}</strong> },
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
            }}>Billed yearly</span>
          </Button>
        </div>
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
          HRMS &amp; Complete include {INCLUDED_EMPLOYEES} employees · +₹{EXTRA_EMPLOYEE_PRICE} each after · all prices + GST
        </span>
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
          const annualTotal = displayPrice * 12;
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
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600 }}>/mo + GST</span>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 4 }}>
                  {unitLabel}
                </div>
                {billingCycle === 'annual' && (
                  <div style={{ fontSize: 11, color: '#FF6D00', fontWeight: 700, marginTop: 2 }}>
                    Billed annually (₹{formatPrice(annualTotal)}/yr + GST)
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
  );
}
