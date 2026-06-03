import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, message, Card, Table, Alert, Spin, Modal, Form, Input, Divider } from 'antd';
import { CheckCircleFilled, CreditCardOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS } from '../../types';
import { startCheckout } from '../../lib/billing';
import { useApiResource } from '../../hooks/useApiResource';
import { devActivateSubscription } from '../../lib/api';
import type { MySubscription, SaasInvoiceDTO } from '../../lib/api';

const INR = (v: string | number) => `₹${new Intl.NumberFormat('en-IN').format(Number(v ?? 0) || 0)}`;
const statusColor: Record<string, string> = { TRIAL: 'blue', ACTIVE: 'green', PAST_DUE: 'orange', CANCELLED: 'red' };

/**
 * Customer billing surface: current products + plan picker that opens checkout.
 *
 * Subscription activation is confirmed server-side by the gateway webhook, so
 * after the widget closes we just nudge the user to refresh — we can't know the
 * payment outcome from the browser alone.
 */
export default function Billing() {
  const { user, refreshProducts } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [devModalPlan, setDevModalPlan] = useState<string>('');
  const [devPaying, setDevPaying] = useState(false);
  const [devStep, setDevStep] = useState<'form' | 'processing' | 'done'>('form');

  // Live subscription for the current workspace (tenant-scoped endpoint).
  const subRes = useApiResource<MySubscription>('/saas/my-subscription/');
  const sub = subRes.data;
  // Prefer live entitlement products; fall back to the auth context.
  const products = sub
    ? sub.products.map(p => (p === 'HR' ? 'hrms' : 'finance'))
    : user?.products ?? [];

  const isPending = !sub || sub.status === 'PENDING';

  const subscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      // Try free activation first (works when Razorpay isn't configured).
      await devActivateSubscription();
      await refreshProducts();
      message.success('Subscription activated! Opening your workspace…');
      navigate('/app', { replace: true });
    } catch {
      // No workspace yet or server error — fall back to Razorpay checkout.
      try {
        const res = await startCheckout(planId, {
          email: user?.email,
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
          onPaid: () => { message.success('Payment received!'); navigate('/app', { replace: true }); },
        });
        if (res.status === 'unavailable') message.warning('Payments not configured on this server.');
        else if (res.status === 'error') message.error(res.message);
      } catch (e: unknown) {
        message.error(e instanceof Error ? e.message : 'Could not activate. Please try again.');
      }
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
    <div>
      {/* Dev fake-payment modal */}
      <Modal
        open={devModalOpen}
        onCancel={() => { if (!devPaying) { setDevModalOpen(false); setDevStep('form'); } }}
        footer={null}
        width={420}
        closable={!devPaying}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCardOutlined style={{ color: '#FF6D00' }} />
            <span>Complete Payment</span>
            <Tag color="orange" style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>DEV MODE</Tag>
          </div>
        }
      >
        {devStep === 'done' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>Payment Successful!</div>
            <div style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>Activating your subscription…</div>
          </div>
        ) : devStep === 'processing' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, fontWeight: 600 }}>Processing payment…</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>Please wait, do not close this window.</div>
          </div>
        ) : (
          <div>
            <Alert
              type="warning"
              showIcon
              message="Dev environment — no real payment will be charged"
              style={{ marginBottom: 20, borderRadius: 8, fontSize: 12 }}
            />
            {selectedPlan && (
              <div style={{ background: 'rgba(255,109,0,0.04)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid rgba(255,109,0,0.15)' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Plan</div>
                <div style={{ fontWeight: 700 }}>{selectedPlan.name}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#FF6D00', marginTop: 4 }}>
                  ₹{new Intl.NumberFormat('en-IN').format(selectedPlan.monthlyPrice)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)' }}>/mo</span>
                </div>
              </div>
            )}
            <Form layout="vertical">
              <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Card Number</span>}>
                <Input prefix={<CreditCardOutlined style={{ color: '#aaa' }} />} value="4111 1111 1111 1111" readOnly style={{ fontFamily: 'monospace', background: '#f9f9f9' }} size="large" />
              </Form.Item>
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Expiry</span>} style={{ flex: 1 }}>
                  <Input value="12 / 28" readOnly style={{ background: '#f9f9f9' }} size="large" />
                </Form.Item>
                <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>CVV</span>} style={{ flex: 1 }}>
                  <Input prefix={<LockOutlined style={{ color: '#aaa' }} />} value="•••" readOnly style={{ background: '#f9f9f9' }} size="large" />
                </Form.Item>
              </div>
              <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>Name on card</span>}>
                <Input value={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Test User'} readOnly style={{ background: '#f9f9f9' }} size="large" />
              </Form.Item>
            </Form>
            <Divider style={{ margin: '12px 0' }} />
            <Button
              type="primary" block size="large"
              icon={<SafetyOutlined />}
              onClick={handleDevPay}
              style={{ height: 50, fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #FF9800, #FF6D00)', border: 'none', borderRadius: 10 }}
            >
              Pay Now (Dev)
            </Button>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10 }}>
              🔒 Secured by Saptta · No real charge in dev mode
            </div>
          </div>
        )}
      </Modal>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>Billing & Subscription</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Manage your Saptta plan and payments.</p>
      </div>

      {isPending && (
        <Alert
          type="info" showIcon
          message="Your account is pending activation"
          description="Choose a plan below and complete payment to activate your workspace."
          style={{ marginBottom: 24, borderRadius: 10 }}
        />
      )}

      <Card style={{ borderRadius: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Active products
        </div>
        {products.length ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {products.includes('hrms') && <Tag color="orange" style={{ fontWeight: 700, borderRadius: 6, padding: '4px 12px' }}>Saptta HR</Tag>}
            {products.includes('finance') && <Tag color="green" style={{ fontWeight: 700, borderRadius: 6, padding: '4px 12px' }}>fin-saptta</Tag>}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No active products — subscribe to a plan below.</span>
        )}
      </Card>

      {/* Current subscription + invoices (live) */}
      {subRes.loading ? (
        <Card style={{ borderRadius: 14, marginBottom: 24, textAlign: 'center' }}><Spin /></Card>
      ) : sub ? (
        <Card style={{ borderRadius: 14, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Current plan</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{sub.plan.name}</div>
            </div>
            <Tag color={statusColor[sub.status] ?? 'default'} style={{ fontWeight: 700, borderRadius: 6, padding: '4px 12px', fontSize: 12 }}>{sub.status}</Tag>
          </div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 13 }}>
            {sub.status === 'TRIAL' && sub.trial_ends_at && (
              <div><span style={{ color: 'var(--color-text-muted)' }}>Trial ends</span><div style={{ fontWeight: 700 }}>{new Date(sub.trial_ends_at).toLocaleDateString('en-IN')}</div></div>
            )}
            {sub.current_period_end && (
              <div><span style={{ color: 'var(--color-text-muted)' }}>Renews / ends</span><div style={{ fontWeight: 700 }}>{new Date(sub.current_period_end).toLocaleDateString('en-IN')}</div></div>
            )}
            <div><span style={{ color: 'var(--color-text-muted)' }}>Workspace</span><div style={{ fontWeight: 700 }}>{sub.company} ({sub.workspace})</div></div>
          </div>
          {sub.status === 'PAST_DUE' && (
            <Alert type="warning" showIcon style={{ marginTop: 16, borderRadius: 8 }}
              message="Payment needed — subscribe below to restore full access." />
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0 10px' }}>Invoices</div>
          {sub.invoices.length ? (
            <Table
              dataSource={sub.invoices} rowKey="id" size="small" pagination={false}
              columns={[
                { title: 'Invoice #', dataIndex: 'number', key: 'number', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span> },
                { title: 'Period', key: 'period', render: (_: unknown, r: SaasInvoiceDTO) => `${new Date(r.period_start).toLocaleDateString('en-IN')} – ${new Date(r.period_end).toLocaleDateString('en-IN')}` },
                { title: 'Taxable', key: 'taxable', render: (_: unknown, r: SaasInvoiceDTO) => INR(r.taxable_amount) },
                { title: 'GST', key: 'gst', render: (_: unknown, r: SaasInvoiceDTO) => {
                  const igst = Number(r.igst) || 0;
                  return igst > 0 ? `IGST ${INR(r.igst)}` : `C+S ${INR((Number(r.cgst) || 0) + (Number(r.sgst) || 0))}`;
                } },
                { title: 'Total', key: 'amount', render: (_: unknown, r: SaasInvoiceDTO) => <strong>{INR(r.amount)}</strong> },
                { title: 'Status', key: 'status', render: (_: unknown, r: SaasInvoiceDTO) => <Tag color={r.status === 'PAID' ? 'green' : r.status === 'OPEN' ? 'orange' : 'default'} style={{ borderRadius: 6 }}>{r.status}</Tag> },
              ]}
            />
          ) : (
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No invoices yet.</span>
          )}
        </Card>
      ) : null}

      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Plans</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {PLANS.map((plan) => (
          <div key={plan.id} style={{
            background: '#FFF', borderRadius: 16, padding: '24px 20px',
            border: plan.highlighted ? '2px solid #FF6D00' : '1px solid var(--color-border)',
            position: 'relative',
          }}>
            {plan.badge && (
              <span style={{ position: 'absolute', top: -10, right: 16, background: 'linear-gradient(135deg, #FF6D00, #FFA000)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 10, textTransform: 'uppercase' }}>{plan.badge}</span>
            )}
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h4>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.4, minHeight: 34 }}>{plan.description}</p>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#FF6D00' }}>₹{formatPrice(plan.monthlyPrice)}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>/mo</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              {plan.features.slice(0, 4).map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                  <CheckCircleFilled style={{ color: '#10B981', fontSize: 12, marginTop: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <Button type="primary" block loading={loadingPlan === plan.id} onClick={() => subscribe(plan.id)}
              style={{ background: 'linear-gradient(135deg, #FF9800, #FF6D00)', border: 'none', fontWeight: 700, height: 42, borderRadius: 8 }}>
              Subscribe
            </Button>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 20 }}>
        Payments are processed securely by Razorpay. GST-compliant invoices are issued for each payment.
      </p>
    </div>
  );
}
