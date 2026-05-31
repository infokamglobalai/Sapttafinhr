import { useState } from 'react';
import { Form, Input, Button, message, Result } from 'antd';
import { Link } from 'react-router-dom';
import { SapttaLogo } from '../components/layout/Navbar';
import ScrollReveal from '../components/shared/ScrollReveal';
import { requestPasswordReset } from '../lib/api';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch {
      // Enumeration-safe API always 200s; only network errors land here.
      message.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      {sent ? (
        <Result
          status="success"
          title="Check your email"
          subTitle="If an account exists for that address, we've sent a password-reset link. It expires in 24 hours."
          extra={<Link to="/login"><Button type="primary" style={primaryBtn}>Back to sign in</Button></Link>}
        />
      ) : (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Forgot your password?</h2>
          <p style={{ color: 'rgba(10,17,40,0.55)', fontSize: 13.5, marginBottom: 24 }}>
            Enter your email and we'll send you a reset link.
          </p>
          <Form layout="vertical" onFinish={onSubmit} requiredMark={false}>
            <Form.Item name="email" label={<b>Email Address</b>}
              rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email' }]}>
              <Input placeholder="you@company.com" size="large" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} style={primaryBtn}>
              Send reset link
            </Button>
          </Form>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/login" style={{ color: '#FF6D00', fontWeight: 600, fontSize: 13.5 }}>Back to sign in</Link>
          </div>
        </>
      )}
    </Shell>
  );
}

export const primaryBtn: React.CSSProperties = {
  fontWeight: 700, height: 48, borderRadius: 8, fontSize: 15,
  background: 'linear-gradient(135deg, #FF9800, #FF6D00)', border: 'none',
  boxShadow: '0 6px 24px rgba(255,109,0,0.2)',
};

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFC', padding: '48px 24px' }}>
      <ScrollReveal animation="scale-in">
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link to="/"><SapttaLogo size="large" /></Link>
          </div>
          <div style={{ borderRadius: 16, padding: '36px 32px', background: '#FFF', border: '1px solid rgba(255,109,0,0.15)', boxShadow: '0 8px 48px rgba(10,17,40,0.04)' }}>
            {children}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
