import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { openFinanceApp, openHrApp } from '../lib/products';
import { getWorkspace } from '../lib/api';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isLoading, isAuthenticated, user } = useAuth();

  const [email,   setEmail]   = useState('');
  const [password,setPassword]= useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState('');
  const [handoffFailed, setHandoffFailed] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  // A product (Finance/HR) that has no session sends the user here to sign in,
  // then expects to be handed straight back. `redirect` says which product and
  // `workspace` which tenant. With no redirect this is a normal platform login.
  const redirectTarget = searchParams.get('redirect');           // 'finance' | 'hr' | null
  const workspaceParam = searchParams.get('workspace') || undefined;

  // Loop guard: if a handoff fails (e.g. HR can't sign the user in), the product
  // bounces back here; while still authenticated we'd retry forever. We stamp
  // each attempt and, if we land back within the window, stop and show an error.
  const HANDOFF_WINDOW_MS = 8000;
  const attemptedRecently = (t: string) =>
    Date.now() - Number(sessionStorage.getItem(`saptta_handoff_${t}`) || 0) < HANDOFF_WINDOW_MS;
  const markAttempt = (t: string) =>
    sessionStorage.setItem(`saptta_handoff_${t}`, String(Date.now()));

  // After auth, return to the requesting product (full-page handoff) or fall
  // back to the in-app product switcher. A company can only enter its OWN
  // workspace: if a product redirect names a workspace that isn't this user's,
  // we send them to the access-denied page instead of handing off.
  const goAfterLogin = () => {
    if (redirectTarget === 'finance') {
      const ownWs = getWorkspace();
      if (workspaceParam && ownWs && workspaceParam !== ownWs) {
        navigate(`/access-denied?ws=${encodeURIComponent(workspaceParam)}`, { replace: true });
        return;
      }
      markAttempt('finance');
      openFinanceApp(workspaceParam ?? ownWs ?? user?.tenantId);
      return;
    }
    if (redirectTarget === 'hr') { markAttempt('hr'); openHrApp(); return; }
    navigate(from, { replace: true });
  };

  // Already signed in and a product is asking for a handoff → do it immediately,
  // unless we just tried and got bounced back (failed handoff → show an error
  // instead of looping).
  useEffect(() => {
    if (!isAuthenticated || !redirectTarget) return;
    if (attemptedRecently(redirectTarget)) { setHandoffFailed(redirectTarget); return; }
    goAfterLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, redirectTarget, workspaceParam, user]);

  if (isAuthenticated && !redirectTarget) return <Navigate to={from} replace />;

  if (handoffFailed) {
    const label = handoffFailed === 'hr' ? 'Saptta HR' : 'fin-saptta';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFC', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center', background: '#fff', borderRadius: 20, padding: '40px 32px', border: '1px solid rgba(10,17,40,0.07)', boxShadow: '0 4px 32px rgba(10,17,40,0.05)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>!</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A1128', marginBottom: 10 }}>Couldn't open {label}</h1>
          <p style={{ fontSize: 14, color: 'rgba(10,17,40,0.55)', lineHeight: 1.6, marginBottom: 24 }}>
            Your account is signed in, but {label} isn't set up for this workspace yet.
            Contact your administrator, or return to your products.
          </p>
          <button onClick={() => { sessionStorage.removeItem(`saptta_handoff_${handoffFailed}`); navigate('/app', { replace: true }); }}
            style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#FF9800,#FF6D00)', color: '#fff', fontSize: 15, fontWeight: 700 }}>
            Back to my products
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      goAfterLogin();
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  const handleDemoLogin = async (e: React.MouseEvent, type: 'admin' | 'saas') => {
    e.preventDefault();
    setError('');

    const dEmail = type === 'admin' ? 'demo@saptta.com' : 'sp@saptta.com';
    const dPass = type === 'admin' ? 'Demo@1234' : 'Saptta@2026';

    setEmail(dEmail);
    setPassword(dPass);

    try {
      await login(dEmail, dPass);
      goAfterLogin();
    } catch {
      setError('Invalid demo credentials. Please try again.');
    }
  };

  return (
    <div className="login-root">
      {/* Soft ambient background orbs */}
      <div className="login-orb login-orb--a" />
      <div className="login-orb login-orb--b" />

      <main className="login-card-wrap">
        <div style={{ width:'100%', maxWidth:430, position:'relative' }}>

          {/* Logo */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
            <Link to="/" aria-label="Saptta home">
              <img src="/logo.jpeg" alt="Saptta" style={{ height:50, width:'auto', objectFit:'contain' }} />
            </Link>
          </div>

          {/* Heading */}
          <div style={{ marginBottom:24, textAlign:'center' }}>
            <h1 style={{ fontSize:28, fontWeight:900, color:'#0A1128', marginBottom:6, letterSpacing:'-0.8px' }}>
              Welcome back
            </h1>
            <p style={{ color:'rgba(10,17,40,0.5)', fontSize:14.5 }}>
              Sign in to your HRMS &amp; Accounts workspace.
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background:'#fff',
            borderRadius:22,
            padding:'30px 28px',
            border:'1px solid rgba(10,17,40,0.06)',
            boxShadow:'0 18px 50px rgba(10,17,40,0.08)',
          }}>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

              {/* Email */}
              <div>
                <label style={{ display:'block', marginBottom:7, fontSize:13, fontWeight:600, color:'#0A1128' }}>
                  Email address
                </label>
                <div style={{ position:'relative' }}>
                  <span className="login-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    className="login-input"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0A1128' }}>Password</label>
                  <Link to="/forgot-password" style={{ fontSize:12.5, color:'#FF6D00', fontWeight:600, textDecoration:'none' }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position:'relative' }}>
                  <span className="login-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    className="login-input"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight:44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{
                      position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer',
                      color:'rgba(10,17,40,0.4)', padding:4, lineHeight:1,
                    }}
                  >
                    {showPw ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'10px 14px', borderRadius:12,
                  background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)',
                  color:'#dc2626', fontSize:13,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-btn"
                style={{
                  width:'100%', padding:'14px',
                  borderRadius:12, border:'none', cursor: isLoading ? 'default' : 'pointer',
                  background: isLoading ? 'rgba(255,109,0,0.5)' : 'linear-gradient(135deg, #FF9800, #FF6D00)',
                  color:'#fff', fontSize:15, fontWeight:700,
                  boxShadow: isLoading ? 'none' : '0 8px 22px rgba(255,109,0,0.28)',
                  transition:'all 0.2s',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}
              >
                {isLoading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ animation:'spin 1s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign In'}
              </button>

              {/* Demo Logins */}
              <div style={{ display:'flex', alignItems:'center', gap:12, margin:'2px 0' }}>
                <div style={{ flex:1, height:1, background:'rgba(10,17,40,0.08)' }} />
                <span style={{ fontSize:11, fontWeight:600, color:'rgba(10,17,40,0.35)', textTransform:'uppercase', letterSpacing:'0.6px' }}>
                  Quick demo access
                </span>
                <div style={{ flex:1, height:1, background:'rgba(10,17,40,0.08)' }} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <button
                  type="button"
                  onClick={(e) => handleDemoLogin(e, 'saas')}
                  disabled={isLoading}
                  className="demo-btn demo-btn--saas"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" />
                  </svg>
                  Superadmin
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDemoLogin(e, 'admin')}
                  disabled={isLoading}
                  className="demo-btn demo-btn--admin"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                  </svg>
                  Company Admin
                </button>
              </div>
            </form>
          </div>

          {/* Sign up CTA */}
          <div style={{
            marginTop:22, padding:'16px 20px', borderRadius:16,
            background:'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(255,109,0,0.04))',
            border:'1px solid rgba(124,58,237,0.12)',
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, flexWrap:'wrap',
          }}>
            <span style={{ fontSize:13.5, color:'rgba(10,17,40,0.6)', fontWeight:500 }}>
              New to Saptta? Get started free.
            </span>
            <Link to="/pricing" className="login-cta-link">
              View Plans &amp; Sign Up →
            </Link>
          </div>

          <p style={{ textAlign:'center', color:'rgba(10,17,40,0.3)', fontSize:11.5, marginTop:18 }}>
            By signing in you agree to our{' '}
            <Link to="/terms" style={{ color:'rgba(10,17,40,0.45)' }}>Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color:'rgba(10,17,40,0.45)' }}>Privacy Policy</Link>
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .login-root {
          position:relative; min-height:100vh; overflow:hidden;
          font-family:Inter, sans-serif;
          background:#FAFAFC;
        }
        .login-card-wrap {
          position:relative; z-index:1;
          min-height:100vh;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:48px 24px;
        }
        .login-orb {
          position:absolute; border-radius:50%; pointer-events:none; z-index:0;
        }
        .login-orb--a {
          top:-120px; left:-100px; width:420px; height:420px;
          background:radial-gradient(circle, rgba(255,109,0,0.12) 0%, transparent 70%);
        }
        .login-orb--b {
          bottom:-100px; right:-90px; width:380px; height:380px;
          background:radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%);
        }
        .login-input {
          width:100%; box-sizing:border-box;
          padding:12px 14px 12px 42px; border-radius:12px;
          border:1.5px solid rgba(10,17,40,0.1);
          font-size:14px; color:#0A1128;
          outline:none; background:#F7F8FA;
          transition:border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .login-input::placeholder { color:rgba(10,17,40,0.3); }
        .login-input:focus { border-color:#FF6D00; background:#fff; box-shadow:0 0 0 4px rgba(255,109,0,0.1); }
        .login-input-icon {
          position:absolute; left:14px; top:50%; transform:translateY(-50%);
          color:rgba(10,17,40,0.32); display:flex; pointer-events:none;
        }
        .login-input:focus + .login-input-icon { color:#FF6D00; }
        .login-submit-btn:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 12px 28px rgba(255,109,0,0.34) !important; }
        .demo-btn {
          display:flex; align-items:center; justify-content:center; gap:7px;
          padding:11px 8px; border-radius:11px; cursor:pointer;
          font-size:13px; font-weight:700; transition:all 0.18s;
        }
        .demo-btn:disabled { opacity:0.6; cursor:default; }
        .demo-btn--saas { background:rgba(124,58,237,0.06); border:1.5px solid rgba(124,58,237,0.25); color:#7c3aed; }
        .demo-btn--saas:not(:disabled):hover { background:rgba(124,58,237,0.12); border-color:rgba(124,58,237,0.45); }
        .demo-btn--admin { background:#fff; border:1.5px solid rgba(10,17,40,0.14); color:#0A1128; }
        .demo-btn--admin:not(:disabled):hover { background:#F1F5F9; border-color:rgba(10,17,40,0.28); }
        .login-cta-link {
          display:inline-block; padding:9px 20px; border-radius:10px;
          background:#fff; border:1.5px solid rgba(124,58,237,0.3); color:#7c3aed;
          font-weight:700; font-size:13px; text-decoration:none; white-space:nowrap;
          transition:all 0.18s;
        }
        .login-cta-link:hover { background:#7c3aed; color:#fff; border-color:#7c3aed; }
      `}</style>
    </div>
  );
}
