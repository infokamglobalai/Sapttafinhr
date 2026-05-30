import { Form, Input, Button, Divider, message } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SapttaLogo } from '../components/layout/Navbar';
import ScrollReveal from '../components/shared/ScrollReveal';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, isAuthenticated } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      message.success('Welcome back!');
      navigate(from, { replace: true });
    } catch {
      message.error('Invalid email or password.');
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAFAFC',
      padding: '48px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="orb-orange" style={{ width: 500, height: 500, top: -100, left: -100 }} />
      <div className="orb-purple" style={{ width: 400, height: 400, bottom: -100, right: -80 }} />

      <ScrollReveal animation="scale-in">
        <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 12 }}>
              <SapttaLogo size="large" />
            </div>
            <p style={{ color: 'rgba(10, 17, 40, 0.55)', fontSize: 13.5 }}>Sign in to your HRMS & Accounts dashboard</p>
          </div>

          <div style={{
            borderRadius: 16, padding: '36px 32px',
            background: '#FFFFFF',
            border: '1px solid rgba(255, 109, 0, 0.15)',
            boxShadow: '0 8px 48px rgba(10, 17, 40, 0.04)',
          }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item
                label={<span style={{ fontWeight: 600, color: '#0A1128', fontSize: 14 }}>Email Address</span>}
                name="email"
                rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Enter a valid email' }]}
              >
                <Input placeholder="you@company.com" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, color: '#0A1128', fontSize: 14 }}>Password</span>}
                name="password"
                rules={[{ required: true, message: 'Please enter your password' }]}
              >
                <Input.Password placeholder="Enter your password" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>

              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 20 }}>
                <span className="card-hover" style={{ color: '#FF6D00', fontSize: 13.5, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}>
                  Forgot password?
                </span>
              </div>

              <Form.Item>
                <Button
                  type="primary" htmlType="submit" size="large" block loading={isLoading}
                  style={{
                    fontWeight: 700, height: 50, borderRadius: 8, fontSize: 15,
                    background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
                    border: 'none',
                    boxShadow: '0 6px 24px rgba(255, 109, 0, 0.2)',
                    transition: 'all 0.25s ease',
                  }}
                  className="card-hover"
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ color: 'rgba(10, 17, 40, 0.2)', fontSize: 12 }}>New to SAPTTA?</Divider>

            <Link to="/pricing">
              <Button block size="large" style={{
                borderColor: 'rgba(138,43,226,0.3)', color: '#8A2BE2',
                background: 'rgba(138,43,226,0.06)',
                fontWeight: 600, height: 48, borderRadius: 8,
                transition: 'all 0.25s ease',
              }} className="card-hover">
                View Plans & Sign Up
              </Button>
            </Link>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(10, 17, 40, 0.45)', fontSize: 12, marginTop: 20 }}>
            By signing in, you agree to our{' '}
            <span style={{ color: '#FF6D00', cursor: 'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: '#FF6D00', cursor: 'pointer' }}>Privacy Policy</span>
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}
