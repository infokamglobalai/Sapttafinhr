import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tag, Drawer } from 'antd';
import {
  TeamOutlined, DollarOutlined, BankOutlined, FileTextOutlined,
  BarChartOutlined, SettingOutlined, CalendarOutlined, AuditOutlined,
  ClockCircleOutlined, WalletOutlined, ShoppingCartOutlined,
  LogoutOutlined, MenuOutlined, AppstoreOutlined, ScheduleOutlined,
  BellOutlined, SwapOutlined, UsergroupAddOutlined,
  UserAddOutlined, StarOutlined, ThunderboltOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { Badge } from 'antd';
import { SapttaLogo } from '../../components/layout/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  product: 'hrms' | 'finance' | 'common';
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Home', icon: <AppstoreOutlined />, product: 'common' },
      { path: '/dashboard/notifications', label: 'Notifications', icon: <BellOutlined />, product: 'common' },
    ],
  },
  {
    label: 'HR & People',
    items: [
      { path: '/dashboard/employees', label: 'Employees', icon: <TeamOutlined />, product: 'hrms' },
      { path: '/dashboard/attendance', label: 'Attendance', icon: <ClockCircleOutlined />, product: 'hrms' },
      { path: '/dashboard/leave', label: 'Leave', icon: <CalendarOutlined />, product: 'hrms' },
      { path: '/dashboard/payroll', label: 'Payroll', icon: <WalletOutlined />, product: 'hrms' },
      { path: '/dashboard/departments', label: 'Departments', icon: <TeamOutlined />, product: 'hrms' },
      { path: '/dashboard/holidays', label: 'Holidays', icon: <ScheduleOutlined />, product: 'hrms' },
      { path: '/dashboard/recruitment', label: 'Recruitment', icon: <UserAddOutlined />, product: 'hrms' },
      { path: '/dashboard/performance', label: 'Performance', icon: <StarOutlined />, product: 'hrms' },
    ],
  },
  {
    label: 'Cross-Product',
    items: [
      { path: '/dashboard/expenses', label: 'Expenses', icon: <SwapOutlined />, product: 'common' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/dashboard/invoices', label: 'Invoices', icon: <FileTextOutlined />, product: 'finance' },
      { path: '/dashboard/receipts', label: 'Receipts', icon: <DollarOutlined />, product: 'finance' },
      { path: '/dashboard/purchase', label: 'Purchase', icon: <ShoppingCartOutlined />, product: 'finance' },
      { path: '/dashboard/banking', label: 'Banking', icon: <BankOutlined />, product: 'finance' },
      { path: '/dashboard/ledger', label: 'Ledger', icon: <AuditOutlined />, product: 'finance' },
      { path: '/dashboard/portal', label: 'Portal', icon: <GlobalOutlined />, product: 'finance' },
    ],
  },
  {
    label: 'AI & System',
    items: [
      { path: '/dashboard/ai-assistant', label: 'AI Assistant', icon: <ThunderboltOutlined />, product: 'common' },
      { path: '/dashboard/reports', label: 'Reports', icon: <BarChartOutlined />, product: 'common' },
      { path: '/dashboard/team', label: 'Team', icon: <UsergroupAddOutlined />, product: 'common' },
      { path: '/dashboard/settings', label: 'Settings', icon: <SettingOutlined />, product: 'common' },
    ],
  },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { setMobileDrawer(false); }, [location.pathname]);

  const products = user?.products || ['hrms', 'finance'];
  const isItemVisible = (item: NavItem) =>
    item.product === 'common' || products.includes(item.product);

  const isActive = (path: string) =>
    path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(path);

  const handleLogout = () => { logout(); navigate('/'); };

  const sidebarContent = (
    <>
      <Link to="/dashboard" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
        <SapttaLogo />
      </Link>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {products.map(p => (
          <Tag key={p} color={p === 'hrms' ? 'orange' : 'green'} style={{ fontSize: 10, fontWeight: 700, borderRadius: 8 }}>
            {p.toUpperCase()}
          </Tag>
        ))}
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navSections.map(section => {
          const visibleItems = section.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '14px 12px 6px' }}>
                {section.label}
              </div>
              {visibleItems.map(item => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                      fontSize: 13, fontWeight: active ? 600 : 500,
                      color: active ? '#FF6D00' : 'var(--color-text-secondary)',
                      background: active ? 'rgba(255,109,0,0.06)' : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.label === 'Notifications' && unreadCount > 0 && (
                      <Badge count={unreadCount} size="small" style={{ backgroundColor: '#FF6D00' }} />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6D00, #FFA000)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0,
          }}>
            {(user?.firstName?.[0] || 'U').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <Button block icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 8, fontSize: 13, fontWeight: 600, height: 36, color: 'var(--color-text-secondary)' }}>
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', display: 'flex' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{
          width: 260, background: '#FFFFFF', borderRight: '1px solid var(--color-border)',
          padding: '28px 20px', display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
        }}>
          {sidebarContent}
        </div>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 20,
          background: '#FFFFFF', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
        }}>
          <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileDrawer(true)} style={{ fontSize: 18, color: '#FF6D00' }} />
          <SapttaLogo />
          <Badge count={unreadCount} size="small" style={{ backgroundColor: '#FF6D00' }}>
            <Button type="text" icon={<BellOutlined />} onClick={() => navigate('/dashboard/notifications')} style={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
          </Badge>
        </div>
      )}

      {/* Mobile drawer */}
      <Drawer open={mobileDrawer} onClose={() => setMobileDrawer(false)} placement="left" width={260} closable={false}
        styles={{ body: { padding: '24px 20px', display: 'flex', flexDirection: 'column' } }}>
        {sidebarContent}
      </Drawer>

      {/* Main content area */}
      <div style={{ flex: 1, marginLeft: isMobile ? 0 : 260, paddingTop: isMobile ? 56 : 0 }}>
        <div style={{ padding: isMobile ? '24px 16px' : '32px 40px', maxWidth: 1200 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
