import { useEffect, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircleFilled } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { markPostCheckout, waitForActiveProducts } from '../../lib/entitlements';
import { PLANS } from '../../types';
import AuthFooter from '../../components/layout/AuthFooter';

const primaryBtn = {
  background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
  border: 'none',
  fontWeight: 700,
  height: 44,
  borderRadius: 10,
} as const;

interface LocationState {
  planId?: string;
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProducts } = useAuth();
  const state = (location.state || {}) as LocationState;
  const plan = PLANS.find((p) => p.id === state.planId);

  const [activating, setActivating] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      markPostCheckout();
      const slugs = await waitForActiveProducts({ timeoutMs: 25_000 });
      await refreshProducts();
      if (cancelled) return;
      setActivating(false);
      setReady(slugs.length > 0);
    })();
    return () => { cancelled = true; };
  }, [refreshProducts]);

  useEffect(() => {
    if (!ready || activating) return;
    const t = window.setTimeout(() => navigate('/app', { replace: true }), 4000);
    return () => window.clearTimeout(t);
  }, [ready, activating, navigate]);

  return (
    <>
      <div className="billing-scroll-shell">
        <div className="billing-page" style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
          {activating ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Spin size="large" />
              <h2 style={{ marginTop: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Payment successful
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
                Activating your subscription…
              </p>
            </div>
          ) : (
            <Result
              icon={<CheckCircleFilled style={{ color: '#00C853', fontSize: 72 }} />}
              title="Payment successful!"
              subTitle={
                ready
                  ? `Your ${plan?.name ?? 'subscription'} is active. Redirecting to your dashboard…`
                  : 'Payment received. Your workspace may take a few more seconds to activate — open the dashboard when ready.'
              }
              extra={[
                <Button
                  key="dashboard"
                  type="primary"
                  size="large"
                  style={primaryBtn}
                  onClick={() => navigate('/app', { replace: true })}
                >
                  Go to dashboard
                </Button>,
              ]}
            />
          )}
        </div>
      </div>
      <AuthFooter />
    </>
  );
}
