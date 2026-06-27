import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link, Outlet, Navigate } from 'react-router-dom';
import { Layout, Menu, Button, Tag, Avatar, Space, Tooltip, Breadcrumb, message, theme } from 'antd';
import {
  DashboardOutlined,
  DollarCircleOutlined,
  DashboardFilled,
  TeamOutlined,
  SoundOutlined,
  TagOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  ReloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HeartOutlined,
  HeartFilled,
  ArrowLeftOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import { fetchAdminHealth, type HealthReport } from '../../lib/api';

const { Sider, Header, Content } = Layout;

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [collapsed, setCollapsed] = useState(false);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [healthLoading, setHealthLoading] = useState(false);

  // Load overall system health status for the header badge.
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const h = await fetchAdminHealth(false);
      setHealth(h);
    } catch {
      // Quietly ignore or set degraded
      setHealth({ overall: 'degraded', services: {}, checked_at: new Date().toISOString() });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    // Poll health status every 60 seconds
    const interval = setInterval(loadHealth, 60000);
    return () => clearInterval(interval);
  }, [loadHealth]);

  // Authorization Check
  if (user && !user.isSuperAdmin) {
    return <Navigate to="/app" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleGlobalRefresh = () => {
    setRefreshKey(prev => prev + 1);
    loadHealth();
    message.success('View refreshed');
  };

  // Determine current active menu key based on pathname.
  const getActiveKey = () => {
    const path = location.pathname;
    if (path === '/superadmin') return 'dashboard';
    if (path.startsWith('/superadmin/revenue')) return 'revenue';
    if (path.startsWith('/superadmin/ops')) return 'ops';
    if (path.startsWith('/superadmin/users')) return 'users';
    if (path.startsWith('/superadmin/announcements')) return 'announcements';
    if (path.startsWith('/superadmin/coupons')) return 'coupons';
    if (path.startsWith('/superadmin/plans')) return 'plans';
    return 'dashboard';
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ fontSize: '16px' }} />,
      label: 'Overview',
      onClick: () => navigate('/superadmin')
    },
    {
      key: 'revenue',
      icon: <DollarCircleOutlined style={{ fontSize: '16px' }} />,
      label: 'Revenue & Dunning',
      onClick: () => navigate('/superadmin/revenue')
    },
    {
      key: 'ops',
      icon: <DashboardFilled style={{ fontSize: '16px' }} />,
      label: 'Operations & Health',
      onClick: () => navigate('/superadmin/ops')
    },
    {
      key: 'users',
      icon: <TeamOutlined style={{ fontSize: '16px' }} />,
      label: 'Platform Users',
      onClick: () => navigate('/superadmin/users')
    },
    {
      key: 'announcements',
      icon: <SoundOutlined style={{ fontSize: '16px' }} />,
      label: 'Announcements',
      onClick: () => navigate('/superadmin/announcements')
    },
    {
      key: 'coupons',
      icon: <TagOutlined style={{ fontSize: '16px' }} />,
      label: 'Promo Coupons',
      onClick: () => navigate('/superadmin/coupons')
    },
    {
      key: 'plans',
      icon: <AppstoreOutlined style={{ fontSize: '16px' }} />,
      label: 'Pricing Plans',
      onClick: () => navigate('/superadmin/plans')
    }
  ];

  // Helper to generate breadcrumbs.
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return (
      <Breadcrumb style={{ fontSize: '13px' }}>
        <Breadcrumb.Item>
          <HomeOutlined style={{ marginRight: '4px' }} />
          <Link to="/app" style={{ color: 'inherit' }}>Platform</Link>
        </Breadcrumb.Item>
        {paths.map((p, idx) => {
          const url = `/${paths.slice(0, idx + 1).join('/')}`;
          const isLast = idx === paths.length - 1;
          const label = p.charAt(0).toUpperCase() + p.slice(1);
          return (
            <Breadcrumb.Item key={url}>
              {isLast ? (
                <span style={{ fontWeight: 500, color: '#0A1128' }}>{label}</span>
              ) : (
                <Link to={url} style={{ color: 'inherit' }}>{label}</Link>
              )}
            </Breadcrumb.Item>
          );
        })}
      </Breadcrumb>
    );
  };

  const getPageTitle = () => {
    const key = getActiveKey();
    switch (key) {
      case 'dashboard': return 'Platform Overview';
      case 'revenue': return 'Revenue & Dunning';
      case 'ops': return 'Operations Control';
      case 'users': return 'Platform Users';
      case 'announcements': return 'Global Announcements';
      case 'coupons': return 'Promo Codes & Coupons';
      case 'plans': return 'Subscription Plans';
      default: return 'Superadmin Console';
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Sidebar with premium styling */}
      <Sider
        width={260}
        collapsedWidth={80}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        style={{
          background: '#0F172A',
          boxShadow: '4px 0 24px rgba(15, 23, 42, 0.15)',
          zIndex: 11,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh'
        }}
      >
        {/* Logo area */}
        <div style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.3s'
        }}>
          <Link to="/superadmin" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ filter: 'brightness(0) invert(1)', flexShrink: 0 }}>
              <SapttaLogo />
            </div>
            {!collapsed && (
              <span style={{
                color: '#A78BFA',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '1px',
                background: 'rgba(167, 139, 250, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '4px'
              }}>CONSOLE</span>
            )}
          </Link>
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[getActiveKey()]}
            items={menuItems}
            className="superadmin-sidebar-menu"
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>

        {/* Sidebar Footer / User Profile */}
        <div style={{
          padding: '16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#090D1A',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {!collapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar style={{ backgroundColor: '#8B5CF6', verticalAlign: 'middle', fontWeight: 600 }} size="default">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </Avatar>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 600, lineHeight: 1.2 }}>Super Admin</div>
                  <div style={{ color: '#64748B', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.email}>
                    {user?.email}
                  </div>
                </div>
              </div>
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  color: '#FDA4AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '6px',
                  height: '36px'
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Tooltip title={user?.email} placement="right">
                <Avatar style={{ backgroundColor: '#8B5CF6', cursor: 'pointer' }} size="default">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </Avatar>
              </Tooltip>
              <Tooltip title="Sign Out" placement="right">
                <Button
                  type="text"
                  danger
                  icon={<LogoutOutlined style={{ fontSize: '16px' }} />}
                  onClick={handleLogout}
                  style={{ color: '#FDA4AF' }}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </Sider>

      {/* Main Layout Shell */}
      <Layout style={{ background: '#F8FAFC' }}>
        <style>{`
          .superadmin-sidebar-menu .ant-menu-item {
            border-radius: 8px !important;
            margin: 4px 12px !important;
            height: 44px !important;
            display: flex !important;
            align-items: center !important;
            color: #94A3B8 !important;
            transition: all 0.2s ease !important;
          }
          .superadmin-sidebar-menu .ant-menu-item:hover {
            color: #FFF !important;
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
          .superadmin-sidebar-menu .ant-menu-item-selected {
            background-color: #FF6D00 !important;
            color: #FFF !important;
            font-weight: 600 !important;
          }
          .superadmin-sidebar-menu .ant-menu-item-selected .anticon {
            color: #FFF !important;
          }
          .signup-bar:hover {
            filter: brightness(1.15) !important;
            transform: translateY(-2px) !important;
          }
        `}</style>
        {/* Header bar */}
        <Header style={{
          background: '#FFFFFF',
          padding: '0 32px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
        }}>
          {/* Header Left (Title & Breadcrumbs) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: '38px', height: '38px', borderRadius: '8px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                {getPageTitle()}
              </div>
              {getBreadcrumbs()}
            </div>
          </div>

          {/* Header Right Actions */}
          <Space size="middle">
            {/* System Health */}
            {health && (
              <Tooltip title={`Checked at: ${new Date(health.checked_at).toLocaleTimeString()}`} placement="bottom">
                <Tag
                  color={health.overall === 'up' ? 'success' : 'warning'}
                  icon={health.overall === 'up' ? <HeartFilled /> : <HeartOutlined />}
                  onClick={() => navigate('/superadmin/ops')}
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginRight: 0
                  }}
                >
                  {health.overall === 'up' ? 'Healthy' : 'Degraded'}
                </Tag>
              </Tooltip>
            )}

            {/* Global Refresh */}
            <Tooltip title="Refresh view data" placement="bottom">
              <Button
                icon={<ReloadOutlined spin={healthLoading} />}
                onClick={handleGlobalRefresh}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  color: '#64748B',
                  width: '38px',
                  height: '38px'
                }}
              />
            </Tooltip>
          </Space>
        </Header>

        {/* Content Region */}
        <Content style={{
          padding: '32px 32px 40px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 70px)',
          width: '100%'
        }}>
          {/* We pass refreshKey as an Context outlet so sub-views can trigger reload if desired */}
          <Outlet key={refreshKey} context={{ loadHealth }} />
        </Content>
      </Layout>
    </Layout>
  );
}
