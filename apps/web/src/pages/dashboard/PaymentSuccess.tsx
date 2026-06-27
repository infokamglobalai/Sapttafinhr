import { useEffect, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircleFilled, DownloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { markPostCheckout, waitForActiveProducts } from '../../lib/entitlements';
import { downloadSaasInvoicePdf, fetchMySubscription } from '../../lib/api';
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
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      markPostCheckout();
      const slugs = await waitForActiveProducts({ timeoutMs: 25_000 });
      await refreshProducts();
      if (cancelled) return;
      try {
        const sub = await fetchMySubscription();
        const latest = sub.invoices?.[0];
        if (latest) {
          setInvoiceId(latest.id);
          setInvoiceNumber(latest.number);
        }
      } catch {
        /* invoice may not be ready yet */
      }
      setActivating(false);
      setReady(slugs.length > 0);
    })();
    return () => { cancelled = true; };
  }, [refreshProducts]);

  useEffect(() => {
    if (!ready || activating) return;
    const t = window.setTimeout(() => navigate('/app', { replace: true }), 6000);
    return () => window.clearTimeout(t);
  }, [ready, activating, navigate]);

  const handleDownload = async () => {
    if (!invoiceId) return;
    setDownloading(true);
    try {
      await downloadSaasInvoicePdf(invoiceId);
    } finally {
      setDownloading(false);
    }
  };

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
                  ? `Your ${plan?.name ?? 'subscription'} is active.${invoiceNumber ? ` Invoice ${invoiceNumber} has been emailed to your billing contact.` : ''} Redirecting to your dashboard…`
                  : 'Payment received. Your workspace may take a few more seconds to activate — open the dashboard when ready.'
              }
              extra={[
                invoiceId ? (
                  <Button
                    key="invoice"
                    size="large"
                    icon={<DownloadOutlined />}
                    loading={downloading}
                    onClick={handleDownload}
                    style={{ height: 44, borderRadius: 10 }}
                  >
                    Download tax invoice
                  </Button>
                ) : null,
                <Button
                  key="dashboard"
                  type="primary"
                  size="large"
                  style={primaryBtn}
                  onClick={() => navigate('/app', { replace: true })}
                >
                  Go to dashboard
                </Button>,
              ].filter(Boolean)}
            />
          )}
        </div>
      </div>
      <AuthFooter />
    </>
  );
}
