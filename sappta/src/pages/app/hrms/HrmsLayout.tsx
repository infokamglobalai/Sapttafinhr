import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tag, Drawer, Badge, Dropdown } from 'antd';
import {
  TeamOutlined, CalendarOutlined, ClockCircleOutlined, WalletOutlined,
  ScheduleOutlined, UserAddOutlined, StarOutlined, SwapOutlined,
  BarChartOutlined, SettingOutlined, UsergroupAddOutlined,
  ThunderboltOutlined, BellOutlined, AppstoreOutlined,
  LogoutOutlined, MenuOutlined, SwapRightOutlined, BankOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { path: '/app/hrms', label: 'Dashboard', icon: <AppstoreOutlined /> },
      { path: '/app/hrms/notifications', label: 'Notifications', icon: <BellOutlined /> },
    ],
  },
  {
    label: 'People',
    items: [
      { path: '/app/hrms/employees', label: 'Employees', icon: <TeamOutlined /> },
      { path: '/app/hrms/departments', label: 'Departments', icon: <UsergroupAddOutlined /> },
      { path: '/app/hrms/recruitment', label: 'Recruitment', icon: <UserAddOutlined /> },
      { path: '/app/hrms/performance', label: 'Performance', icon: <StarOutlined /> },
    ],
  },
  {
    label: 'Time & Pay',
    items: [
      { path: '/app/hrms/attendance', label: 'Attendance', icon: <ClockCircleOutlined /> },
      { path: '/app/hrms/leave', label: 'Leave', icon: <CalendarOutlined /> },
      { path: '/app/hrms/holidays', label: 'Holidays', icon: <ScheduleOutlined /> },
      { path: '/app/hrms/payroll', label: 'Payroll', icon: <WalletOutlined /> },
      { path: '/app/hrms/expenses', label: 'Expenses', icon: <SwapOutlined /> },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/app/hrms/ai-assistant', label: 'AI Assistant', icon: <ThunderboltOutlined /> },
      { path: '/app/hrms/reports', label: 'Reports', icon: <BarChartOutlined /> },
      { path: '/app/hrms/team', label: 'Team', icon: <UsergroupAddOutlined /> },
      { path: '/app/hrms/settings', label: 'Settings', icon: <SettingOutlined /> },
    ],
  },
];

export default function HrmsLayout() {
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

  const isActive = (path: string) =>
    path === '/app/hrms' ? location.pathname === '/app/hrms' : location.pathname.startsWith(path);

  const handleLogout = () => { logout(); navigate('/'); };
  const hasFinance = user?.products?.includes('finance');

  const productMenu = {
    items: [
      {
        key: 'hrms', icon: <TeamOutlined style={{ color: '#FF6D00' }} />,
        label: <div><div style={{ fontWeight: 700 }}>Saptta HR</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Currently active</div></div>,
        disabled: true,
      },
      ...(hasFinance ? [{
        key: 'finance', icon: <BankOutlined style={{ color: '#10B981' }} />,
        label: <div><div style={{ fontWeight: 700 }}>fin-saptta</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Switch to Finance</div></div>,
        onClick: () => navigate('/app/finance'),
      }] : []),
      { type: 'divider' as const },
      { key: 'switcher', label: 'All Products', onClick: () => navigate('/app') },
    ],
  };

  const sidebarContent = (
    <>
      {/* Product Logo */}
      <Link to="/app/hrms" style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #FF6D00, #FFA000)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 18, boxShadow: '0 6px 16px rgba(255,109,0,0.25)',
          }}>
            <TeamOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>Saptta HR</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>HRMS PLATFORM</div>
          </div>
        </div>
      </Link>

      {/* Product Switcher */}
      <Dropdown menu={productMenu} placement="bottomRight" trigger={['click']}>
        <Button block style={{
          margin: '20px 0', borderRadius: 8, fontWeight: 600, fontSize: 12,
          height: 36, borderColor: '#FF6D00', color: '#FF6D00',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <SwapRightOutlined /> Switch Product
        </Button>
      </Dropdown>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navSections.map(section => (
          <div key={section.label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '14px 12px 6px' }}>
              {section.label}
            </div>
            {section.items.map(item => {
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
                    background: active ? 'rgba(255,109,0,0.08)' : 'transparent',
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
        ))}
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
      {!isMobile && (
        <div style={{
          width: 260, background: '#FFFFFF', borderRight: '1px solid var(--color-border)',
          padding: '24px 20px', display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
        }}>
          {sidebarContent}
        </div>
      )}

      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 20,
          background: '#FFFFFF', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
        }}>
          <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileDrawer(true)} style={{ fontSize: 18, color: '#FF6D00' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #FF6D00, #FFA000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}><TeamOutlined /></div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Saptta HR</span>
          </div>
          <Badge count={unreadCount} size="small" style={{ backgroundColor: '#FF6D00' }}>
            <Button type="text" icon={<BellOutlined />} onClick={() => navigate('/app/hrms/notifications')} style={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
          </Badge>
        </div>
      )}

      <Drawer open={mobileDrawer} onClose={() => setMobileDrawer(false)} placement="left" width={260} closable={false}
        styles={{ body: { padding: '20px 18px', display: 'flex', flexDirection: 'column' } }}>
        {sidebarContent}
      </Drawer>

      <div style={{ flex: 1, marginLeft: isMobile ? 0 : 260, paddingTop: isMobile ? 56 : 0 }}>
        {!isMobile && hasFinance && (
          <div style={{
            background: '#FFFFFF', borderBottom: '1px solid var(--color-border)',
            padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Tag style={{ background: 'rgba(255,109,0,0.08)', color: '#FF6D00', border: 'none', fontWeight: 700, borderRadius: 6 }}>SAPTTA HR</Tag>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>HRMS Platform</span>
            </div>
            <Button size="small" icon={<BankOutlined />} onClick={() => navigate('/app/finance')}
              style={{ borderRadius: 8, fontWeight: 600, fontSize: 12, borderColor: '#10B981', color: '#10B981' }}>
              Switch to fin-saptta
            </Button>
          </div>
        )}
        <div style={{ padding: isMobile ? '24px 16px' : '32px 40px', maxWidth: 1200 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
