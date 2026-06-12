import { useState } from 'react';
import { Form, Input, Button, message, Result } from 'antd';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../lib/api';
import { Shell, primaryBtn } from './ForgotPassword';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !uid || !token;

  const onSubmit = async (values: { password: string; confirm: string }) => {
    if (values.password !== values.confirm) {
      message.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(uid, token, values.password);
      setDone(true);
    } catch (err) {
      const detail = (err as { body?: { detail?: string | string[] } })?.body?.detail;
      message.error(Array.isArray(detail) ? detail.join(' ') : detail || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      {invalidLink ? (
        <Result status="error" title="Invalid reset link"
          subTitle="This link is missing required information. Request a new one."
          extra={<Link to="/forgot-password"><Button type="primary" style={primaryBtn}>Request new link</Button></Link>} />
      ) : done ? (
        <Result status="success" title="Password updated"
          subTitle="Your password has been reset. You can now sign in."
          extra={<Button type="primary" style={primaryBtn} onClick={() => navigate('/login')}>Sign in</Button>} />
      ) : (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Set a new password</h2>
          <p style={{ color: 'rgba(10,17,40,0.55)', fontSize: 13.5, marginBottom: 24 }}>Choose a strong password (min 8 characters).</p>
          <Form layout="vertical" onFinish={onSubmit} requiredMark={false}>
            <Form.Item name="password" label={<b>New Password</b>}
              rules={[{ required: true, message: 'Enter a password' }, { min: 8, message: 'Minimum 8 characters' }]}>
              <Input.Password placeholder="New password" size="large" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="confirm" label={<b>Confirm Password</b>} dependencies={['password']}
              rules={[{ required: true, message: 'Confirm your password' }]}>
              <Input.Password placeholder="Re-enter password" size="large" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} style={primaryBtn}>
              Reset password
            </Button>
          </Form>
        </>
      )}
    </Shell>
  );
}
