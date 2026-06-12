import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  CheckCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  'HRMS — employees, attendance & payroll',
  'Finance — GST invoicing & ledger',
  'Mobile access for your team',
  'India-compliant & secure by design',
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginDemo, isLoading, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('saptta_backend_url') || 'https://app.saptta.com/api/v1';
  });

  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (backendUrl.trim()) {
      localStorage.setItem('saptta_backend_url', backendUrl.trim());
    } else {
      localStorage.removeItem('saptta_backend_url');
    }
    window.location.reload();
  };

  const handleResetSettings = () => {
    localStorage.removeItem('saptta_backend_url');
    window.location.reload();
  };

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    try {
      await loginDemo();
      navigate(from, { replace: true });
    } catch {
      setError('Demo login failed. Please ensure the backend is fully provisioned.');
    }
  };

  return (
    <div className="login-page">
      <aside className="login-page__brand" aria-hidden={false}>
        <div className="login-page__brand-inner">
          <Link to="/" className="login-page__logo-link" aria-label="Saptta home">
            <img src="/logo.jpeg" alt="Saptta" className="login-page__logo" />
          </Link>

          <div className="login-page__brand-copy">
            <p className="login-page__eyebrow">HR & Finance platform</p>
            <h1 className="login-page__headline">
              One platform for people, payroll, and books.
            </h1>
            <p className="login-page__subline">
              Run HRMS and accounts together — built for Indian compliance and growing teams.
            </p>

            <ul className="login-page__features">
              {FEATURES.map((item) => (
                <li key={item}>
                  <CheckCircleOutlined className="login-page__feature-icon" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="login-page__copyright">
            © {new Date().getFullYear()} Saptta Tech Solutions Pvt. Ltd.
          </p>
        </div>
      </aside>

      <main className="login-page__main">
        <div className="login-page__form-wrap">
          <Link to="/" className="login-page__logo-link login-page__logo-link--mobile" aria-label="Saptta home">
            <img src="/logo.jpeg" alt="Saptta" className="login-page__logo" />
          </Link>

          <header className="login-page__form-header">
            <h2 className="login-page__title">Welcome back</h2>
            <p className="login-page__subtitle">Sign in to your HRMS &amp; Accounts workspace.</p>
          </header>

          <div className="login-page__card">
            {isElectron && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="login-page__settings-btn"
                title="Server Settings"
                aria-label="Server settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
            <form className="login-page__form" onSubmit={handleSubmit} noValidate>
              <div className="login-page__field">
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="login-page__field">
                <div className="login-page__field-row">
                  <label htmlFor="login-password">Password</label>
                  <Link to="/forgot-password" className="login-page__link">
                    Forgot password?
                  </Link>
                </div>
                <div className="login-page__password-wrap">
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="login-page__toggle-pw"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-page__error" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="login-page__submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingOutlined spin />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>

              <div className="login-page__divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="login-page__demo-btn"
                onClick={handleDemoLogin}
                disabled={isLoading}
              >
                Try Demo Company Login
              </button>
            </form>
          </div>

          <div className="login-page__signup">
            <p>New to Saptta? Start with a free trial.</p>
            <Link to="/pricing" className="login-page__signup-btn">
              View plans &amp; sign up
            </Link>
          </div>

          <p className="login-page__legal">
            By signing in you agree to our{' '}
            <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </main>

      {showSettings && (
        <div className="login-page__settings-modal" role="dialog" aria-modal="true" aria-label="Desktop server settings">
          <div className="login-page__settings-panel">
            <h3>Desktop Server Settings</h3>
            <p>
              Specify the API Gateway Server URL for this Saptta Accounts instance. Default connects to the remote production backend.
            </p>
            <form onSubmit={handleSaveSettings}>
              <label htmlFor="backend-url">Backend API URL</label>
              <input
                id="backend-url"
                type="url"
                required
                placeholder="https://app.saptta.com/api/v1"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
              />
              <span className="login-page__settings-hint">
                Example: http://localhost:8080/api/v1 (Local Nginx Proxy)
              </span>
              <div className="login-page__settings-actions">
                <button type="submit" className="login-page__settings-save">Save &amp; Apply</button>
                <button type="button" className="login-page__settings-reset" onClick={handleResetSettings}>
                  Reset Default
                </button>
                <button type="button" className="login-page__settings-cancel" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
