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
import Industries from './pages/Industries';
import IndustryDetail from './pages/IndustryDetail';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import Signup from './pages/Signup';
import Setup from './pages/Setup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Product switcher & layouts
import ProductSwitcher from './pages/app/ProductSwitcher';
import HrmsLayout from './pages/app/hrms/HrmsLayout';
import HrmsHome from './pages/app/hrms/HrmsHome';
import HrWorkspace from './pages/app/hrms/HrWorkspace';
import FinanceLayout from './pages/app/finance/FinanceLayout';
import FinanceHome from './pages/app/finance/FinanceHome';

// Shared dashboard pages (reused across both products)
import Employees from './pages/dashboard/Employees';
import Attendance from './pages/dashboard/Attendance';
import Leave from './pages/dashboard/Leave';
import Payroll from './pages/dashboard/Payroll';
import Departments from './pages/dashboard/Departments';
import Holidays from './pages/dashboard/Holidays';
import Recruitment from './pages/dashboard/Recruitment';
import Performance from './pages/dashboard/Performance';
import Expenses from './pages/dashboard/Expenses';
import Invoices from './pages/dashboard/Invoices';
import Receipts from './pages/dashboard/Receipts';
import Purchase from './pages/dashboard/Purchase';
import Banking from './pages/dashboard/Banking';
import Ledger from './pages/dashboard/Ledger';
import Reports from './pages/dashboard/Reports';
import Portal from './pages/dashboard/Portal';
import AuditAssistant from './pages/dashboard/AuditAssistant';
import Team from './pages/dashboard/Team';
import Settings from './pages/dashboard/Settings';
import Notifications from './pages/dashboard/Notifications';

const HIDE_CHROME_ROUTES = ['/setup', '/app', '/signup', '/login', '/forgot-password', '/reset-password', '/verify-email'];

function AppLayout() {
  const location = useLocation();
  const hideChrome = HIDE_CHROME_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideChrome && <Navbar />}
      <main className="main-content" style={{ flex: 1 }}>
        <Routes>
          {/* Public marketing pages */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/hrms" element={<HrmsSolutions />} />
          <Route path="/accounts" element={<AccountsSolutions />} />
          <Route path="/mobile-app" element={<MobileApp />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/industries/:slug" element={<IndustryDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Setup wizard (post-signup) */}
          <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />

          {/* Product Switcher — landing after login */}
          <Route path="/app" element={<ProtectedRoute><ProductSwitcher /></ProtectedRoute>} />

          {/* Saptta HR Product */}
          <Route path="/app/hrms" element={<ProtectedRoute><HrmsLayout /></ProtectedRoute>}>
            <Route index element={<HrmsHome />} />
            {/* Live HR app (real Django backend), embedded in-shell */}
            <Route path="workspace" element={<HrWorkspace />} />
            <Route path="workspace/:section" element={<HrWorkspace />} />
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="departments" element={<Departments />} />
            <Route path="holidays" element={<Holidays />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="performance" element={<Performance />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="ai-assistant" element={<AuditAssistant />} />
            <Route path="reports" element={<Reports />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* fin-saptta Product */}
          <Route path="/app/finance" element={<ProtectedRoute><FinanceLayout /></ProtectedRoute>}>
            <Route index element={<FinanceHome />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="purchase" element={<Purchase />} />
            <Route path="banking" element={<Banking />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="reports" element={<Reports />} />
            <Route path="portal" element={<Portal />} />
            <Route path="ai-assistant" element={<AuditAssistant />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* Legacy /dashboard → redirect to product switcher */}
          <Route path="/dashboard/*" element={<Navigate to="/app" replace />} />
        </Routes>
      </main>
      {!hideChrome && <Footer />}
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
