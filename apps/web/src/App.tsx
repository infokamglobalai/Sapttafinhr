import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { getAntTheme } from './theme';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
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

// Dashboard shell (product hub at /app/*)
import DashboardApp from './dashboard_app/App';

// Account billing/subscription page (stays in the marketing shell)
import Billing from './pages/dashboard/Billing';

// ---------------------------------------------------------------------------
// Electron detection — must come after all import declarations
// ---------------------------------------------------------------------------
const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

const HIDE_CHROME_ROUTES = ['/setup', '/app', '/signup', '/login', '/forgot-password', '/reset-password', '/verify-email'];

function AppLayout() {
  const location = useLocation();
  const hideChrome = HIDE_CHROME_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideChrome && <Navbar />}
      <main className="main-content" style={{ flex: 1, paddingTop: hideChrome ? 0 : undefined }}>
        <Routes>
          {/* Public marketing pages */}
          <Route path="/" element={isElectron ? <Navigate to="/app" replace /> : <Home />} />
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

          {/* Account billing/subscription (stays in the marketing shell, matched first) */}
          <Route path="/app/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

          {/* Unified product hub – must come after /app/billing so billing wins */}
          <Route path="/app/*" element={<ProtectedRoute><DashboardApp /></ProtectedRoute>} />
        </Routes>
      </main>
      {!hideChrome && <Footer />}
      {!hideChrome && <CookieConsent />}
      <ChatbotWidget />
    </div>
  );
}

function InnerApp() {
  const { isDark } = useTheme();
  const dynamicTheme = getAntTheme(isDark);

  return (
    <ConfigProvider theme={dynamicTheme}>
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

export default function App() {
  return (
    <ThemeProvider>
      <InnerApp />
    </ThemeProvider>
  );
}
