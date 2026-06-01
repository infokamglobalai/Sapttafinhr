import { useState } from 'react';
import { Button, Tag, message, Card, Table, Alert, Spin } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS } from '../../types';
import { startCheckout } from '../../lib/billing';
import { useApiResource } from '../../hooks/useApiResource';
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
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Live subscription for the current workspace (tenant-scoped endpoint).
  const subRes = useApiResource<MySubscription>('/saas/my-subscription/');
  const sub = subRes.data;
  // Prefer live entitlement products; fall back to the auth context.
  const products = sub
    ? sub.products.map(p => (p === 'HR' ? 'hrms' : 'finance'))
    : user?.products ?? [];

  const subscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await startCheckout(planId, {
        email: user?.email,
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
        onPaid: () => message.success('Payment received! Your subscription will activate shortly.'),
      });
      if (res.status === 'unavailable') message.warning(res.message);
      else if (res.status === 'error') message.error(res.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('en-IN').format(n);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>Billing & Subscription</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Manage your Saptta plan and payments.</p>
      </div>

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
