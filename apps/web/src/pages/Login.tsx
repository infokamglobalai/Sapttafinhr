import { useEffect, useState, useRef } from 'react';

import { Link, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';

import { SapttaLogo } from '../components/layout/Navbar';

import { useAuth } from '../contexts/AuthContext';

import { openFinanceApp, openHrApp } from '../lib/products';

import { getWorkspace, setWorkspace, hrStaffLogin } from '../lib/api';



const MailIcon = () => (

  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />

    <polyline points="22,6 12,13 2,6" />

  </svg>

);



const LockIcon = () => (

  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />

    <path d="M7 11V7a5 5 0 0 1 10 0v4" />

  </svg>

);



const EyeIcon = ({ open }: { open: boolean }) => open ? (

  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />

    <line x1="1" y1="1" x2="23" y2="23" />

  </svg>

) : (

  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />

    <circle cx="12" cy="12" r="3" />

  </svg>

);



const SparkleIcon = () => (

  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

    <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />

  </svg>

);



const REDIRECT_HINT: Record<string, string> = {

  hr: 'One sign-in — we’ll open Saptta HR for you.',

  finance: 'One sign-in — we’ll open your Finance workspace.',

};



const REDIRECT_LABEL: Record<string, string> = {

  hr: 'Saptta HR',

  finance: 'Finance',

};



function OpeningProduct({ target }: { target: string }) {

  const label = REDIRECT_LABEL[target] ?? target;

  return (

    <div className="login-page login-page--centered login-page--chrome">

      <div className="login-page__shell">

        <div className="login-page__form-wrap login-page__form-wrap--wide">

          <div className="login-page__card login-page__card--status">

            <h1 className="login-page__title">Opening {label}…</h1>

            <p className="login-page__subtitle">One moment — finishing sign-in.</p>

          </div>

        </div>

      </div>

    </div>

  );

}



export default function Login() {

  const navigate = useNavigate();

  const location = useLocation();

  const [searchParams] = useSearchParams();

  const { login, isLoading, isAuthenticated, user } = useAuth();



  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState('');

  const [handoffFailed, setHandoffFailed] = useState<string | null>(null);

  const [handoffPending, setHandoffPending] = useState(false);

  const handoffOnceRef = useRef(false);



  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  const redirectTarget = searchParams.get('redirect');

  const workspaceParam = searchParams.get('workspace') || undefined;



  const ensureWorkspaceForHr = () => {

    if (!getWorkspace()) {

      setWorkspace(import.meta.env.VITE_DEFAULT_WORKSPACE || 'acme');

    }

  };



  const resolveFinanceWorkspace = () => {
    const ws = workspaceParam ?? getWorkspace() ?? user?.tenantId ?? import.meta.env.VITE_DEFAULT_WORKSPACE ?? 'acme';
    return ws && !['localhost', 'finance', 'finance-web'].includes(ws) ? ws : 'acme';
  };



  const performRedirect = async () => {

    if (redirectTarget === 'finance') {

      const ws = resolveFinanceWorkspace();

      const ownWs = getWorkspace();

      if (workspaceParam && ownWs && workspaceParam !== ownWs) {

        navigate(`/access-denied?ws=${encodeURIComponent(workspaceParam)}`, { replace: true });

        return;

      }

      setWorkspace(ws);

      setHandoffPending(true);

      openFinanceApp(ws);

      return;

    }

    if (redirectTarget === 'hr') {

      ensureWorkspaceForHr();

      setHandoffPending(true);

      try {

        await openHrApp();

      } catch {

        setHandoffPending(false);

        setHandoffFailed('hr');

      }

      return;

    }

    navigate(from, { replace: true });

  };



  // Already signed in (or just finished login) → hand off to the target product.

  useEffect(() => {

    if (!isAuthenticated || !redirectTarget || isLoading) return;

    if (handoffOnceRef.current) return;

    handoffOnceRef.current = true;

    void performRedirect();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [isAuthenticated, redirectTarget, workspaceParam, isLoading]);



  if (isAuthenticated && !redirectTarget) return <Navigate to={from} replace />;



  if ((handoffPending || (isAuthenticated && redirectTarget)) && !handoffFailed) {

    return <OpeningProduct target={redirectTarget!} />;

  }



  if (handoffFailed) {

    const label = REDIRECT_LABEL[handoffFailed] ?? handoffFailed;

    return (

      <div className="login-page login-page--centered login-page--chrome">

        <div className="login-page__shell">

          <div className="login-page__form-wrap login-page__form-wrap--wide">

            <div className="login-page__card login-page__card--status">

              <h1 className="login-page__title">Couldn&apos;t open {label}</h1>

              <p className="login-page__subtitle">

                You&apos;re signed in, but {label} isn&apos;t responding. Check that the Finance

                app is running, then try again.

              </p>

              <button

                type="button"

                className="login-page__submit login-page__submit--brand"

                onClick={() => {

                  handoffOnceRef.current = false;

                  setHandoffFailed(null);

                  void performRedirect();

                }}

              >

                Try again

              </button>

              <button

                type="button"

                className="login-page__link"

                style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer' }}

                onClick={() => navigate('/app', { replace: true })}

              >

                Choose a product

              </button>

            </div>

          </div>

        </div>

      </div>

    );

  }



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    setError('');

    handoffOnceRef.current = true;

    try {

      await login(email, password, workspaceParam);

      if (redirectTarget) await performRedirect();

      else navigate(from, { replace: true });

    } catch {

      try {

        const hr = await hrStaffLogin(

          email,

          password,

          workspaceParam,

          redirectTarget === 'hr' ? '/' : '/',

        );

        if (hr.workspace) setWorkspace(hr.workspace);

        window.location.href = hr.redirect_url;

        return;

      } catch {

        handoffOnceRef.current = false;

        setError('Invalid email or password.');

      }

    }

  };



  const handleDemoLogin = async (type: 'admin' | 'saas' | 'kuwit') => {
    setError('');
    setHandoffFailed(null);
    handoffOnceRef.current = true;
    let dEmail = '';
    let dPass = '';
    if (type === 'admin') {
      dEmail = 'demo@saptta.com';
      dPass = 'Demo@1234';
    } else if (type === 'saas') {
      dEmail = 'sp@saptta.com';
      dPass = 'Saptta@2026';
    } else if (type === 'kuwit') {
      dEmail = 'kuwit@saptta.com';
      dPass = 'Kuwit@1234';
    }
    setEmail(dEmail);
    setPassword(dPass);
    try {
      await login(dEmail, dPass, workspaceParam);
      if (redirectTarget) await performRedirect();
      else navigate(from, { replace: true });
    } catch {
      handoffOnceRef.current = false;
      setError('Demo login unavailable. Check that the API is running.');
    }
  };



  return (

    <div className="login-page login-page--centered login-page--chrome">

      <div className="login-page__shell">

        <div className="login-page__form-wrap login-page__form-wrap--wide">

          <div className="login-page__card">

            <div className="login-page__card-top">

              <Link to="/" className="login-page__logo-link" aria-label="Saptta home">

                <SapttaLogo />

              </Link>

              <h1 className="login-page__title">Welcome back</h1>

              {redirectTarget && REDIRECT_HINT[redirectTarget] ? (

                <p className="login-page__redirect-hint">{REDIRECT_HINT[redirectTarget]}</p>

              ) : (

                <p className="login-page__subtitle">One login for owners, HR, team leads, and employees</p>

              )}

            </div>



            <form className="login-page__form" onSubmit={handleSubmit}>

              <div className="login-page__field">

                <label htmlFor="login-email">Email</label>

                <div className="login-page__field-icon">

                  <span className="login-page__field-icon-svg"><MailIcon /></span>

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

              </div>



              <div className="login-page__field">

                <div className="login-page__field-row">

                  <label htmlFor="login-password">Password</label>

                  <Link to="/forgot-password" className="login-page__link">Forgot password?</Link>

                </div>

                <div className="login-page__password-wrap login-page__field-icon">

                  <span className="login-page__field-icon-svg"><LockIcon /></span>

                  <input

                    id="login-password"

                    type={showPw ? 'text' : 'password'}

                    required

                    autoComplete="current-password"

                    placeholder="••••••••"

                    value={password}

                    onChange={(e) => setPassword(e.target.value)}

                  />

                  <button

                    type="button"

                    className="login-page__toggle-pw"

                    onClick={() => setShowPw((v) => !v)}

                    aria-label={showPw ? 'Hide password' : 'Show password'}

                  >

                    <EyeIcon open={showPw} />

                  </button>

                </div>

              </div>



              {error && <div className="login-page__error" role="alert">{error}</div>}



              <button type="submit" className="login-page__submit login-page__submit--brand" disabled={isLoading}>

                {isLoading ? 'Signing in…' : 'Sign in  \u2192'}

              </button>

            </form>



            <div className="login-page__card-foot">

              <div className="login-page__or-divider"><span>or</span></div>

              <p className="login-page__demo-inline">
                <span className="login-page__demo-prefix"><SparkleIcon /> Try demo:</span>
                <button type="button" disabled={isLoading} onClick={() => handleDemoLogin('admin')}>Company Admin</button>
                <span className="login-page__demo-sep" aria-hidden>·</span>
                <button type="button" disabled={isLoading} onClick={() => handleDemoLogin('kuwit')}>demo kuwit</button>
              </p>

              <p className="login-page__signup-inline">

                New here? <Link to="/signup">Start free trial</Link>

              </p>

              <p className="login-page__legal login-page__legal--inline">

                <Link to="/terms">Terms</Link>

                <span aria-hidden> · </span>

                <Link to="/privacy">Privacy</Link>

              </p>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}


