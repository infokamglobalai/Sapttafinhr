import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { SapttaLogo } from '../components/layout/Navbar';

/**
 * Shown when a signed-in user tries to enter a workspace that isn't their
 * company's. Each user belongs to exactly one company; the platform detects the
 * workspace mismatch at login (see Login.tsx) and routes here rather than
 * handing off to another tenant's product.
 */
export default function AccessDenied() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, logout } = useAuth();
  const attempted = params.get('ws');

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFC', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', padding: '16px 40px',
        background: '#fff', borderBottom: '1px solid rgba(10,17,40,0.06)',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}><SapttaLogo /></Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{
          maxWidth: 460, width: '100%', textAlign: 'center',
          background: '#fff', borderRadius: 20, padding: '40px 32px',
          border: '1px solid rgba(10,17,40,0.07)', boxShadow: '0 4px 32px rgba(10,17,40,0.05)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
            background: 'rgba(239,68,68,0.08)', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>
            <LockOutlined />
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A1128', marginBottom: 10, letterSpacing: '-0.4px' }}>
            You don't have access to this workspace
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(10,17,40,0.55)', lineHeight: 1.6, marginBottom: 8 }}>
            {attempted
              ? <>Your account isn't part of the <strong>{attempted}</strong> workspace.</>
              : <>Your account isn't part of that workspace.</>}
            {' '}You can only access your own company's products.
          </p>
          {user?.email && (
            <p style={{ fontSize: 12, color: 'rgba(10,17,40,0.4)', marginBottom: 24 }}>
              Signed in as {user.email}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button type="primary" size="large" onClick={() => navigate('/app', { replace: true })}
              style={{ borderRadius: 10, fontWeight: 700, height: 46 }}>
              Go to my workspace
            </Button>
            <Button size="large" onClick={handleLogout}
              style={{ borderRadius: 10, fontWeight: 600, height: 44 }}>
              Sign in with a different account
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
