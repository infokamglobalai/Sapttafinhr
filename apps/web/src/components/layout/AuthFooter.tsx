import { Link } from 'react-router-dom';
import { SapttaLogo } from './Navbar';

/** Slim footer for auth pages — matches site branding without the full marketing footer height. */
export default function AuthFooter() {
  return (
    <footer className="auth-footer">
      <div className="auth-footer__inner">
        <Link to="/" className="auth-footer__brand" aria-label="Saptta home">
          <SapttaLogo size="compact" />
        </Link>
        <nav className="auth-footer__links" aria-label="Footer">
          <Link to="/products">Products</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
        <p className="auth-footer__copy">© 2026 Saptta Technologies Pvt. Ltd.</p>
      </div>
    </footer>
  );
}
