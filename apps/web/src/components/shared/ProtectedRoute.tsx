import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../contexts/AuthContext';

const VERIFY_ALLOWED_PREFIXES = ['/signup/verify', '/verify-email', '/logout'];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const onVerifyRoute = VERIFY_ALLOWED_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (user && user.emailVerified === false && !onVerifyRoute) {
    return (
      <Navigate
        to="/signup/verify"
        replace
        state={{ email: user.email, provisioning: true }}
      />
    );
  }

  return <>{children}</>;
}
