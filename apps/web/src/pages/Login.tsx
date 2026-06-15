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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div style={{
        display: 'none',
        width: '45%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        background: 'linear-gradient(145deg, #FF6D00 0%, #c2410c 40%, #7c3aed 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="login-left-panel"
      >
        {/* Glow circles */}
        <div style={{ position:'absolute', top:-120, right:-120, width:340, height:340, background:'rgba(255,255,255,0.07)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:-80, left:-80, width:260, height:260, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }} />

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background:'rgba(255,255,255,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:900, fontSize:16, letterSpacing:'-0.5px',
          }}>
            ST
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:17, letterSpacing:'-0.3px' }}>SAPTTA</div>
            <div style={{ fontSize:11, opacity:0.7, letterSpacing:'0.5px', textTransform:'uppercase' }}>Tech Solutions</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position:'relative' }}>
          <h2 style={{ fontSize:'clamp(1.8rem,2.5vw,2.4rem)', fontWeight:900, lineHeight:1.2, marginBottom:16, letterSpacing:'-1px' }}>
            Smart HR.<br />Smarter Accounts.<br />Better Business.
          </h2>
          <p style={{ opacity:0.8, fontSize:15, lineHeight:1.6, maxWidth:320 }}>
            One platform for your entire business — payroll, attendance, GST invoicing, and financial reports.
          </p>

          <div style={{ marginTop:40, display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { icon:'👥', text:'HRMS — Employees, Attendance & Payroll' },
              { icon:'📊', text:'Finance — GST Invoicing & Ledger' },
              { icon:'📱', text:'Mobile app for on-the-go access' },
              { icon:'🔒', text:'India-compliant, secure by design' },
            ].map(f => (
              <div key={f.text} style={{ display:'flex', alignItems:'center', gap:12, fontSize:14 }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <span style={{ opacity:0.9 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize:12, opacity:0.5, position:'relative' }}>
          © {new Date().getFullYear()} Saptta Tech Solutions Pvt. Ltd.
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div style={{
        flex:1,
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        justifyContent:'center',
        padding:'40px 24px',
        background:'#FAFAFC',
        position:'relative',
        overflow:'hidden',
      }}>
        {/* Soft background orbs */}
        <div style={{ position:'absolute', top:-80, left:-80, width:360, height:360, background:'radial-gradient(circle, rgba(255,109,0,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, right:-60, width:300, height:300, background:'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ width:'100%', maxWidth:420, position:'relative' }}>

          {/* Mobile-only logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }} className="login-mobile-logo">
            <div style={{
              width:40, height:40, borderRadius:10,
              background:'linear-gradient(135deg,#FF6D00,#7c3aed)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:900, fontSize:14,
            }}>ST</div>
            <div>
              <div style={{ fontWeight:800, color:'#0A1128', fontSize:15 }}>SAPTTA</div>
              <div style={{ fontSize:11, color:'rgba(10,17,40,0.4)', letterSpacing:'0.4px', textTransform:'uppercase' }}>Tech Solutions</div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom:32 }}>
            <h1 style={{ fontSize:28, fontWeight:900, color:'#0A1128', marginBottom:6, letterSpacing:'-0.5px' }}>
              Welcome back
            </h1>
            <p style={{ color:'rgba(10,17,40,0.5)', fontSize:14 }}>
              Sign in to your HRMS & Accounts workspace.
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background:'#fff',
            borderRadius:20,
            padding:'32px 28px',
            border:'1px solid rgba(10,17,40,0.07)',
            boxShadow:'0 4px 32px rgba(10,17,40,0.05)',
          }}>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Email */}
              <div>
                <label style={{ display:'block', marginBottom:6, fontSize:13, fontWeight:600, color:'#0A1128' }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width:'100%', boxSizing:'border-box',
                    padding:'11px 14px', borderRadius:10,
                    border:'1.5px solid rgba(10,17,40,0.12)',
                    fontSize:14, color:'#0A1128',
                    outline:'none', transition:'border-color 0.2s',
                    background:'#fff',
                  }}
                  onFocus={e => e.target.style.borderColor='#FF6D00'}
                  onBlur={e => e.target.style.borderColor='rgba(10,17,40,0.12)'}
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0A1128' }}>Password</label>
                  <Link to="/forgot-password" style={{ fontSize:12, color:'#FF6D00', fontWeight:500, textDecoration:'none' }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position:'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width:'100%', boxSizing:'border-box',
                      padding:'11px 44px 11px 14px', borderRadius:10,
                      border:'1.5px solid rgba(10,17,40,0.12)',
                      fontSize:14, color:'#0A1128',
                      outline:'none', transition:'border-color 0.2s',
                      background:'#fff',
                    }}
                    onFocus={e => e.target.style.borderColor='#FF6D00'}
                    onBlur={e => e.target.style.borderColor='rgba(10,17,40,0.12)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer',
                      color:'rgba(10,17,40,0.4)', padding:4, lineHeight:1,
                    }}
                  >
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  padding:'10px 14px', borderRadius:10,
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
                style={{
                  width:'100%', padding:'13px',
                  borderRadius:10, border:'none', cursor:'pointer',
                  background: isLoading ? 'rgba(255,109,0,0.5)' : 'linear-gradient(135deg, #FF9800, #FF6D00)',
                  color:'#fff', fontSize:15, fontWeight:700,
                  boxShadow: isLoading ? 'none' : '0 6px 20px rgba(255,109,0,0.25)',
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
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                marginTop: 8, paddingTop: 20, borderTop: '1px solid rgba(10,17,40,0.07)'
              }}>
                <button
                  type="button"
                  onClick={(e) => handleDemoLogin(e, 'saas')}
                  disabled={isLoading}
                  style={{
                    width:'100%', padding:'10px',
                    borderRadius:8, border:'1.5px solid rgba(124,58,237,0.3)', cursor:'pointer',
                    background: 'rgba(124,58,237,0.05)',
                    color:'#7c3aed', fontSize:14, fontWeight:600,
                    transition:'all 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(124,58,237,0.05)')}
                >
                  Demo SAAS Superadmin Login
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDemoLogin(e, 'admin')}
                  disabled={isLoading}
                  style={{
                    width:'100%', padding:'10px',
                    borderRadius:8, border:'1.5px solid rgba(10,17,40,0.15)', cursor:'pointer',
                    background: '#fff',
                    color:'#0A1128', fontSize:14, fontWeight:600,
                    transition:'all 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  Demo Company Admin Login
                </button>
              </div>
            </form>
          </div>

          {/* Sign up CTA */}
          <div style={{
            marginTop:24, padding:'16px 20px', borderRadius:14,
            background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.1)',
            textAlign:'center',
          }}>
            <p style={{ fontSize:13, color:'rgba(10,17,40,0.55)', marginBottom:10 }}>
              New to Saptta? Get started free.
            </p>
            <Link to="/pricing" style={{
              display:'inline-block', padding:'9px 24px', borderRadius:8,
              border:'1.5px solid rgba(124,58,237,0.35)', color:'#7c3aed',
              fontWeight:700, fontSize:13, textDecoration:'none',
              transition:'all 0.2s',
            }}>
              View Plans & Sign Up →
            </Link>
          </div>

          <p style={{ textAlign:'center', color:'rgba(10,17,40,0.3)', fontSize:11, marginTop:20 }}>
            By signing in you agree to our{' '}
            <Link to="/terms" style={{ color:'rgba(10,17,40,0.4)' }}>Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color:'rgba(10,17,40,0.4)' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 900px) {
          .login-left-panel { display: flex !important; }
          .login-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
