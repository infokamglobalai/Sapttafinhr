import { useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { openFinanceApp, openHrApp } from '../lib/products';

/**
 * Cross-product handoff dispatcher. Products delegate "switch to the other
 * product" here instead of minting their own SSO/handoff: the platform holds the
 * session AND the entitlements, so `/launch?to=finance|hr` either re-opens the
 * target already signed in (owned) or sends the user to upgrade (not owned).
 * Reached while authenticated (wrapped in ProtectedRoute).
 */
export default function Launch() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const to = params.get('to');

  useEffect(() => {
    const owns = (p: string) => (user?.products || []).includes(p as never);
    if (to === 'hr') {
      if (owns('hrms')) openHrApp();
      else navigate('/pricing', { replace: true });
    } else if (to === 'finance') {
      if (owns('finance')) openFinanceApp(user?.tenantId);
      else navigate('/pricing', { replace: true });
    }
  }, [to, user, navigate]);

  if (to !== 'hr' && to !== 'finance') return <Navigate to="/app" replace />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(10,17,40,0.5)', fontSize: 14 }}>
      Opening {to === 'hr' ? 'Saptta HR' : 'fin-saptta'}…
    </div>
  );
}
