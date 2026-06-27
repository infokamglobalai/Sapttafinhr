import { useEffect, useState } from 'react';
import { Button, Input, message, Result } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SapttaLogo } from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { confirmEmailVerification, fetchProvisioningStatus, requestEmailVerification, ApiError } from '../lib/api';

type LocationState = {
  email?: string;
  workspace?: string;
  provisioning?: boolean;
};

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
      /* keep polling */
    }
  }
  return 'timeout';
}

export default function SignupVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hydrateSession, refreshProducts, updateUser } = useAuth();
  const state = (location.state as LocationState) || {};
  const email = state.email || user?.email || '';
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user?.emailVerified) {
      navigate('/app/billing', { replace: true });
    }
  }, [user?.emailVerified, navigate]);

  useEffect(() => {
    if (!state.provisioning) return;
    void pollProvisioning().then(async (result) => {
      if (result === 'ready') await refreshProducts().catch(() => {});
    });
  }, [state.provisioning, refreshProducts]);

  const handleVerify = async () => {
    if (!email || !code.trim()) {
      message.error('Enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmEmailVerification(email, code.trim());
      await hydrateSession(state.workspace);
      updateUser({ emailVerified: true });
      setDone(true);
      message.success('Email verified!');
      navigate('/app/billing', { replace: true });
    } catch (err: unknown) {
      const detail =
        err instanceof ApiError
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: string }).message)
            : 'Invalid or expired code.';
      message.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await requestEmailVerification(email);
      message.success('If your account is unverified, a new code has been sent.');
    } catch {
      message.error('Could not resend code. Try again in a minute.');
    } finally {
      setResending(false);
    }
  };

  if (done) {
    return (
      <div className="login-page login-page--centered login-page--chrome">
        <Result status="success" title="Email verified" subTitle="Redirecting to your workspace…" />
      </div>
    );
  }

  return (
    <div className="login-page login-page--centered login-page--chrome">
      <div className="login-page__shell">
        <div className="login-page__form-wrap login-page__form-wrap--wide">
          <div className="login-page__card">
            <div className="login-page__card-top">
              <Link to="/" className="login-page__logo-link" aria-label="Saptta home">
                <SapttaLogo />
              </Link>
              <h1 className="login-page__title">Verify your email</h1>
              <p className="login-page__subtitle">
                We sent a 6-digit code to <strong>{email || 'your email'}</strong>.
                Enter it below to activate your workspace. Your workspace is being set up in the background.
              </p>
            </div>

            <div className="login-page__form">
              <div className="login-page__field">
                <label htmlFor="signup-verify-code">Verification code</label>
                <Input
                  id="signup-verify-code"
                  size="large"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={8}
                />
              </div>

              <Button
                type="primary"
                size="large"
                block
                loading={submitting}
                className="login-page__submit login-page__submit--brand"
                onClick={() => void handleVerify()}
              >
                Verify and continue
              </Button>

              <p className="login-page__signup-inline" style={{ marginTop: 16 }}>
                Didn&apos;t get it?{' '}
                <button
                  type="button"
                  className="login-page__link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  disabled={resending}
                  onClick={() => void handleResend()}
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              </p>

              <p className="login-page__legal login-page__legal--inline">
                Wrong email? <Link to="/signup">Start over</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
