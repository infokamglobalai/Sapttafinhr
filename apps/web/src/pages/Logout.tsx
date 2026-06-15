import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Single full-logout endpoint. Products (on their own origins) send the user
 * here to end the platform session — the one session they can't clear
 * cross-origin. Clears auth + workspace, then hard-redirects to the login page.
 */
export default function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    logout(); // AuthContext.logout(): clearAuth() + setWorkspace(null) + reset state
    window.location.replace('/login');
  }, [logout]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(10,17,40,0.5)', fontSize: 14 }}>
      Signing out…
    </div>
  );
}
