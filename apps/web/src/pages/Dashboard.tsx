import { Button, Tag } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import {
  TeamOutlined, DollarOutlined, BankOutlined, FileTextOutlined,
  BarChartOutlined, SettingOutlined, CalendarOutlined, AuditOutlined,
  UserOutlined, ClockCircleOutlined, WalletOutlined, ShoppingCartOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { SapttaLogo } from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';

interface QuickLink {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  product: 'hrms' | 'finance' | 'common';
}

const quickLinks: QuickLink[] = [
  { label: 'Employees', description: 'Manage employee records & profiles', icon: <TeamOutlined />, path: '/dashboard/employees', color: '#FF6D00', product: 'hrms' },
  { label: 'Attendance', description: 'Track time, shifts & geofences', icon: <ClockCircleOutlined />, path: '/dashboard/attendance', color: '#FFA000', product: 'hrms' },
  { label: 'Leave', description: 'Requests, approvals & balances', icon: <CalendarOutlined />, path: '/dashboard/leave', color: '#FF8F00', product: 'hrms' },
  { label: 'Payroll', description: 'Run payroll & generate payslips', icon: <WalletOutlined />, path: '/dashboard/payroll', color: '#E65100', product: 'hrms' },
  { label: 'Invoices', description: 'Create GST invoices & quotations', icon: <FileTextOutlined />, path: '/dashboard/invoices', color: '#10B981', product: 'finance' },
  { label: 'Receipts', description: 'Record customer payments', icon: <DollarOutlined />, path: '/dashboard/receipts', color: '#059669', product: 'finance' },
  { label: 'Purchase', description: 'POs, GRNs & vendor bills', icon: <ShoppingCartOutlined />, path: '/dashboard/purchase', color: '#0EA5E9', product: 'finance' },
  { label: 'Banking', description: 'Reconciliation & PDCs', icon: <BankOutlined />, path: '/dashboard/banking', color: '#6366F1', product: 'finance' },
  { label: 'Reports', description: 'P&L, Balance Sheet, Aging & more', icon: <BarChartOutlined />, path: '/dashboard/reports', color: '#8B5CF6', product: 'common' },
  { label: 'Ledger', description: 'Journal entries & trial balance', icon: <AuditOutlined />, path: '/dashboard/ledger', color: '#EC4899', product: 'finance' },
  { label: 'My Profile', description: 'Account & user settings', icon: <UserOutlined />, path: '/dashboard/profile', color: '#64748B', product: 'common' },
  { label: 'Settings', description: 'Company, API keys & webhooks', icon: <SettingOutlined />, path: '/dashboard/settings', color: '#475569', product: 'common' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const products = user?.products || ['hrms', 'finance'];
  const hasHrms = products.includes('hrms');
  const hasFinance = products.includes('finance');

  const visibleLinks = quickLinks.filter(link => {
    if (link.product === 'common') return true;
    if (link.product === 'hrms') return hasHrms;
    if (link.product === 'finance') return hasFinance;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFC', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{
        width: 260, background: '#FFFFFF', borderRight: '1px solid var(--color-border)',
        padding: '28px 20px', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', marginBottom: 32 }}>
          <SapttaLogo />
        </Link>

        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {products.map(p => (
            <Tag key={p} color={p === 'hrms' ? 'orange' : 'green'} style={{ fontSize: 10, fontWeight: 700, borderRadius: 8 }}>
              {p.toUpperCase()}
            </Tag>
          ))}
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {hasHrms && (
            <>
              <SidebarSection label="HR & People" />
              <SidebarLink icon={<TeamOutlined />} label="Employees" />
              <SidebarLink icon={<ClockCircleOutlined />} label="Attendance" />
              <SidebarLink icon={<CalendarOutlined />} label="Leave" />
              <SidebarLink icon={<WalletOutlined />} label="Payroll" />
            </>
          )}
          {hasFinance && (
            <>
              <SidebarSection label="Finance" />
              <SidebarLink icon={<FileTextOutlined />} label="Invoices" />
              <SidebarLink icon={<DollarOutlined />} label="Receipts" />
              <SidebarLink icon={<ShoppingCartOutlined />} label="Purchase" />
              <SidebarLink icon={<BankOutlined />} label="Banking" />
              <SidebarLink icon={<AuditOutlined />} label="Ledger" />
            </>
          )}
          <SidebarSection label="System" />
          <SidebarLink icon={<BarChartOutlined />} label="Reports" />
          <SidebarLink icon={<SettingOutlined />} label="Settings" />
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6D00, #FFA000)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 14,
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
          <Button
            block
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ borderRadius: 8, fontSize: 13, fontWeight: 600, height: 36, color: 'var(--color-text-secondary)' }}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 260, padding: '40px 48px' }}>
        {/* Welcome header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-1px' }}>
            {greetingTime()}, {user?.firstName || 'there'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>
            Here's an overview of your workspace. Select a module to get started.
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
          {hasHrms && (
            <>
              <KPICard label="Total Employees" value="0" subtext="Add your first employee" color="#FF6D00" />
              <KPICard label="Present Today" value="—" subtext="No attendance data yet" color="#FFA000" />
              <KPICard label="Pending Leaves" value="0" subtext="No pending requests" color="#FF8F00" />
            </>
          )}
          {hasFinance && (
            <>
              <KPICard label="Outstanding Receivables" value="₹0" subtext="No pending invoices" color="#10B981" />
              <KPICard label="This Month Revenue" value="₹0" subtext="Create your first invoice" color="#059669" />
              <KPICard label="GST Liability" value="₹0" subtext="No tax due" color="#0EA5E9" />
            </>
          )}
        </div>

        {/* Quick access grid */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 20 }}>
          Quick Access
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {visibleLinks.map(link => (
            <div
              key={link.label}
              onClick={() => navigate(link.path)}
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '24px 20px',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,17,40,0.06)';
                e.currentTarget.style.borderColor = link.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `${link.color}10`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: link.color, fontSize: 18, flexShrink: 0,
              }}>
                {link.icon}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                  {link.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {link.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Getting started checklist */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 20 }}>
            Getting Started
          </h3>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ...(hasHrms ? [
                  { label: 'Add your first employee', done: false },
                  { label: 'Configure attendance geofences', done: false },
                  { label: 'Set up salary structures', done: false },
                ] : []),
                ...(hasFinance ? [
                  { label: 'Create your first invoice', done: false },
                  { label: 'Add a bank account for reconciliation', done: false },
                  { label: 'Import opening balances', done: false },
                ] : []),
                { label: 'Invite team members', done: false },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10,
                  background: item.done ? 'rgba(0,200,83,0.04)' : '#F9FAFB',
                  border: `1px solid ${item.done ? 'rgba(0,200,83,0.15)' : 'var(--color-border)'}`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: item.done ? 'none' : '2px solid var(--color-border)',
                    background: item.done ? '#00C853' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {item.done && '✓'}
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 600,
                    color: item.done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 12px 6px', marginTop: 4 }}>
      {label}
    </div>
  );
}

function SidebarLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
        fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,109,0,0.04)'; e.currentTarget.style.color = '#FF6D00'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </div>
  );
}

function KPICard({ label, value, subtext, color }: { label: string; value: string; subtext: string; color: string }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 16, padding: '20px 24px',
      border: '1px solid var(--color-border)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: `${color}08`, borderRadius: '50%' }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: '-1px', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        {subtext}
      </div>
    </div>
  );
}
