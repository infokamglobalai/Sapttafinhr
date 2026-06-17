import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
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
import Setup from './pages/Setup';
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

const HIDE_CHROME_ROUTES = ['/setup', '/app', '/signup', '/login', '/logout', '/launch', '/forgot-password', '/reset-password', '/verify-email', '/access-denied'];

function AppLayout() {
  const location = useLocation();
  const hideChrome = HIDE_CHROME_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideChrome && <Navbar />}
      <main className={hideChrome ? "" : "main-content"} style={{ flex: 1 }}>
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

          {/* Setup wizard (post-signup) */}
          <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />

          {/* Product Switcher — landing after login. Opens the REAL products
              (Finance app on the workspace host; HR app via SSO). */}
          <Route path="/app" element={<ProtectedRoute><ProductSwitcher /></ProtectedRoute>} />

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
      {!hideChrome && <Footer />}
      {!hideChrome && <CookieConsent />}
      <ChatbotWidget />
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
