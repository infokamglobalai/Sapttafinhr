import { useState } from 'react';
import { Button, Tag, message, Card } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { PLANS } from '../../types';
import { startCheckout } from '../../lib/billing';

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
  const products = user?.products ?? [];

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
