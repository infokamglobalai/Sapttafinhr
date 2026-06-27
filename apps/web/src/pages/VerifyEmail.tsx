import { useEffect, useRef, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmEmailVerification, getAccessToken } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Shell, primaryBtn } from './ForgotPassword';

type State = 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { hydrateSession } = useAuth();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>('verifying');
  const [msg, setMsg] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState('error');
      setMsg('This verification link is missing its token.');
      return;
    }
    confirmEmailVerification(token)
      .then(async () => {
        const loggedIn = !!getAccessToken();
        setHasSession(loggedIn);
        if (loggedIn) {
          try {
            await hydrateSession();
            navigate('/app/billing', { replace: true });
            return;
          } catch {
            /* fall through to success screen */
          }
        }
        setState('success');
      })
      .catch((err) => {
        setState('error');
        const body = err && typeof err === 'object' && 'body' in err ? (err as { body?: { detail?: string } }).body : null;
        setMsg(body?.detail || (err as Error)?.message || 'This verification link is invalid or has expired.');
      });
  }, [token, hydrateSession, navigate]);

  return (
    <Shell>
      {state === 'verifying' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: 'rgba(10,17,40,0.55)' }}>Verifying your email…</p>
        </div>
      )}
      {state === 'success' && (
        <Result
          status="success"
          title="Email verified"
          subTitle="Your email address is confirmed. You're all set."
          extra={
            <Link to={hasSession ? '/app/billing' : '/login'}>
              <Button type="primary" style={primaryBtn}>
                {hasSession ? 'Continue to your workspace' : 'Continue to sign in'}
              </Button>
            </Link>
          }
        />
      )}
      {state === 'error' && (
        <Result
          status="error"
          title="Verification failed"
          subTitle={msg}
          extra={<Link to="/login"><Button type="primary" style={primaryBtn}>Back to sign in</Button></Link>}
        />
      )}
    </Shell>
  );
}
