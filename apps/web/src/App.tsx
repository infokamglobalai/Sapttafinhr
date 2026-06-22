import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthFooter from './components/layout/AuthFooter';
import ScrollToTop from './components/layout/ScrollToTop';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import About from './pages/About';
import HrmsSolutions from './pages/HrmsSolutions';
import AccountsSolutions from './pages/AccountsSolutions';
import MobileApp from './pages/MobileApp';
import Features from './pages/Features';
import Products from './pages/Products';
import Industries from './pages/Industries';
import IndustryDetail from './pages/IndustryDetail';
import Contact from './pages/Contact';
import Resources from './pages/Resources';
import Solutions from './pages/Solutions';
import Careers from './pages/Careers';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import SecurityPage from './pages/SecurityPage';
import StatusPage from './pages/StatusPage';
import CookieConsent from './components/legal/CookieConsent';
import ChatbotWidget from './components/chatbot/ChatbotWidget';

// Product switcher (hands off to the real standalone products) + account billing.
import ProductSwitcher from './pages/app/ProductSwitcher';
import Billing from './pages/dashboard/Billing';
import AccessDenied from './pages/AccessDenied';
import Launch from './pages/Launch';
import Logout from './pages/Logout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

const HIDE_CHROME_ROUTES = ['/app', '/superadmin', '/logout', '/launch', '/verify-email', '/access-denied'];
const AUTH_MARKETING_ROUTES = ['/login', '/forgot-password', '/reset-password', '/signup'];

function AppLayout() {
  const location = useLocation();
  const hideChrome = HIDE_CHROME_ROUTES.some(r => location.pathname.startsWith(r));
  const authMarketingPage = AUTH_MARKETING_ROUTES.some(r => location.pathname.startsWith(r));
  const isSignupPage = location.pathname.startsWith('/signup');
  const isLoginPage = location.pathname.startsWith('/login');

  return (
    <div
      style={
        hideChrome
          ? { height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
          : { minHeight: '100vh', display: 'flex', flexDirection: 'column' }
      }
    >
      {!hideChrome && <Navbar />}
      <main
        className={`main-content${authMarketingPage ? ' main-content--login' : hideChrome ? ' main-content--auth' : ''}`}
        style={{ flex: 1 }}
      >
        <Routes>
          {/* Public marketing pages */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/hrms" element={<HrmsSolutions />} />
          <Route path="/accounts" element={<AccountsSolutions />} />
          <Route path="/mobile-app" element={<MobileApp />} />
          <Route path="/features" element={<Features />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/industries/:slug" element={<IndustryDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Product Switcher — landing after login. Opens the REAL products
              (Finance app on the workspace host; HR app via SSO). */}
          <Route path="/app" element={<ProtectedRoute><ProductSwitcher /></ProtectedRoute>} />

          {/* Super Admin Dashboard — platform owner only (page self-gates on is_staff). */}
          <Route path="/superadmin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />

          {/* Account billing/subscription (stays in the marketing shell). */}
          <Route path="/app/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

          {/* Wrong-workspace guard: shown when a user tries to enter a company
              that isn't theirs (workspace mismatch detected at login). */}
          <Route path="/access-denied" element={<ProtectedRoute><AccessDenied /></ProtectedRoute>} />

          {/* Cross-product handoff dispatcher + single full-logout endpoint.
              Products delegate "switch product" and "sign out" to the platform. */}
          <Route path="/launch" element={<ProtectedRoute><Launch /></ProtectedRoute>} />
          <Route path="/logout" element={<Logout />} />

          {/* The product UIs now live in their own apps. Old in-shell mock
              dashboard routes redirect to the switcher, which hands off. */}
          <Route path="/app/hrms/*" element={<Navigate to="/app" replace />} />
          <Route path="/app/finance/*" element={<Navigate to="/app" replace />} />
          <Route path="/dashboard/*" element={<Navigate to="/app" replace />} />
        </Routes>
      </main>
      {(isLoginPage || isSignupPage || (!hideChrome && !authMarketingPage))
        ? <Footer />
        : authMarketingPage
          ? <AuthFooter />
          : null}
      {!hideChrome && !authMarketingPage && <CookieConsent />}
      {!hideChrome && !authMarketingPage && <ChatbotWidget />}
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppLayout />
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
