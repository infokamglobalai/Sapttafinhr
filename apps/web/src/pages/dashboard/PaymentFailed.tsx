import { Button, Result } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { CloseCircleFilled } from '@ant-design/icons';
import AuthFooter from '../../components/layout/AuthFooter';

const primaryBtn = {
  background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
  border: 'none',
  fontWeight: 700,
  height: 44,
  borderRadius: 10,
} as const;

interface LocationState {
  message?: string;
  cancelled?: boolean;
}

export default function PaymentFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const title = state.cancelled ? 'Payment cancelled' : 'Payment failed';
  const subTitle =
    state.message ||
    (state.cancelled
      ? 'You closed the payment window. No amount was charged.'
      : 'Something went wrong while processing your payment. Please try again.');

  return (
    <>
      <div className="billing-scroll-shell">
        <div className="billing-page" style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
          <Result
            icon={<CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 72 }} />}
            title={title}
            subTitle={subTitle}
            extra={[
              <Button
                key="plans"
                type="primary"
                size="large"
                style={primaryBtn}
                onClick={() => navigate('/app/billing', { replace: true })}
              >
                Return to plans
              </Button>,
            ]}
          />
        </div>
      </div>
      <AuthFooter />
    </>
  );
}
