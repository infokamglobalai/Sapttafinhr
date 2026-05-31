import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tag, Drawer, Badge, Dropdown } from 'antd';
import {
  DollarOutlined, BankOutlined, FileTextOutlined, AuditOutlined,
  ShoppingCartOutlined, BarChartOutlined, SettingOutlined,
  GlobalOutlined, ThunderboltOutlined, BellOutlined, AppstoreOutlined,
  UsergroupAddOutlined, LogoutOutlined, MenuOutlined,
  SwapRightOutlined, TeamOutlined,
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
      { path: '/app/finance', label: 'Dashboard', icon: <AppstoreOutlined /> },
      { path: '/app/finance/notifications', label: 'Notifications', icon: <BellOutlined /> },
    ],
  },
  {
    label: 'Sales',
    items: [
      { path: '/app/finance/invoices', label: 'Invoices', icon: <FileTextOutlined /> },
      { path: '/app/finance/receipts', label: 'Receipts', icon: <DollarOutlined /> },
    ],
  },
  {
    label: 'Purchase',
    items: [
      { path: '/app/finance/purchase', label: 'Purchase Orders', icon: <ShoppingCartOutlined /> },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { path: '/app/finance/banking', label: 'Banking', icon: <BankOutlined /> },
      { path: '/app/finance/ledger', label: 'Ledger', icon: <AuditOutlined /> },
    ],
  },
  {
    label: 'Self-Service',
    items: [
      { path: '/app/finance/portal', label: 'Portal', icon: <GlobalOutlined /> },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/app/finance/ai-assistant', label: 'AI Assistant', icon: <ThunderboltOutlined /> },
      { path: '/app/finance/reports', label: 'Reports', icon: <BarChartOutlined /> },
      { path: '/app/finance/team', label: 'Team', icon: <UsergroupAddOutlined /> },
      { path: '/app/finance/billing', label: 'Billing', icon: <DollarOutlined /> },
      { path: '/app/finance/settings', label: 'Settings', icon: <SettingOutlined /> },
    ],
  },
];

export default function FinanceLayout() {
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
    path === '/app/finance' ? location.pathname === '/app/finance' : location.pathname.startsWith(path);

  const handleLogout = () => { logout(); navigate('/'); };
  const hasHrms = user?.products?.includes('hrms');

  const productMenu = {
    items: [
      ...(hasHrms ? [{
        key: 'hrms', icon: <TeamOutlined style={{ color: '#FF6D00' }} />,
        label: <div><div style={{ fontWeight: 700 }}>Saptta HR</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Switch to HRMS</div></div>,
        onClick: () => navigate('/app/hrms'),
      }] : []),
      {
        key: 'finance', icon: <BankOutlined style={{ color: '#10B981' }} />,
        label: <div><div style={{ fontWeight: 700 }}>fin-saptta</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Currently active</div></div>,
        disabled: true,
      },
      { type: 'divider' as const },
      { key: 'switcher', label: 'All Products', onClick: () => navigate('/app') },
    ],
  };

  const sidebarContent = (
    <>
      <Link to="/app/finance" style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 18, boxShadow: '0 6px 16px rgba(16,185,129,0.25)',
          }}>
            <BankOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>fin-saptta</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>ACCOUNTS &amp; FINANCE</div>
          </div>
        </div>
      </Link>

      <Dropdown menu={productMenu} placement="bottomRight" trigger={['click']}>
        <Button block style={{
          margin: '20px 0', borderRadius: 8, fontWeight: 600, fontSize: 12,
          height: 36, borderColor: '#10B981', color: '#10B981',
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
                    color: active ? '#10B981' : 'var(--color-text-secondary)',
                    background: active ? 'rgba(16,185,129,0.08)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.label === 'Notifications' && unreadCount > 0 && (
                    <Badge count={unreadCount} size="small" style={{ backgroundColor: '#10B981' }} />
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
            background: 'linear-gradient(135deg, #10B981, #059669)',
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
          <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileDrawer(true)} style={{ fontSize: 18, color: '#10B981' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}><BankOutlined /></div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>fin-saptta</span>
          </div>
          <Badge count={unreadCount} size="small" style={{ backgroundColor: '#10B981' }}>
            <Button type="text" icon={<BellOutlined />} onClick={() => navigate('/app/finance/notifications')} style={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
          </Badge>
        </div>
      )}

      <Drawer open={mobileDrawer} onClose={() => setMobileDrawer(false)} placement="left" width={260} closable={false}
        styles={{ body: { padding: '20px 18px', display: 'flex', flexDirection: 'column' } }}>
        {sidebarContent}
      </Drawer>

      <div style={{ flex: 1, marginLeft: isMobile ? 0 : 260, paddingTop: isMobile ? 56 : 0 }}>
        {!isMobile && hasHrms && (
          <div style={{
            background: '#FFFFFF', borderBottom: '1px solid var(--color-border)',
            padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Tag style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: 'none', fontWeight: 700, borderRadius: 6 }}>FIN-SAPTTA</Tag>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Accounts &amp; Finance</span>
            </div>
            <Button size="small" icon={<TeamOutlined />} onClick={() => navigate('/app/hrms')}
              style={{ borderRadius: 8, fontWeight: 600, fontSize: 12, borderColor: '#FF6D00', color: '#FF6D00' }}>
              Switch to Saptta HR
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
