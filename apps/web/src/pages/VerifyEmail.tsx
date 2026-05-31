import { useEffect, useRef, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmEmailVerification } from '../lib/api';
import { Shell, primaryBtn } from './ForgotPassword';

type State = 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>('verifying');
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard StrictMode double-invoke
    ran.current = true;
    if (!token) {
      setState('error');
      setMsg('This verification link is missing its token.');
      return;
    }
    confirmEmailVerification(token)
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setMsg((err as { body?: { detail?: string } })?.body?.detail || 'This verification link is invalid or has expired.');
      });
  }, [token]);

  return (
    <Shell>
      {state === 'verifying' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: 'rgba(10,17,40,0.55)' }}>Verifying your email…</p>
        </div>
      )}
      {state === 'success' && (
        <Result status="success" title="Email verified"
          subTitle="Your email address is confirmed. You're all set."
          extra={<Link to="/login"><Button type="primary" style={primaryBtn}>Continue to sign in</Button></Link>} />
      )}
      {state === 'error' && (
        <Result status="error" title="Verification failed" subTitle={msg}
          extra={<Link to="/login"><Button type="primary" style={primaryBtn}>Back to sign in</Button></Link>} />
      )}
    </Shell>
  );
}
