import { useNavigate } from 'react-router-dom';
import {
  TeamOutlined, DollarOutlined, BankOutlined, FileTextOutlined,
  BarChartOutlined, SettingOutlined, CalendarOutlined, AuditOutlined,
  ClockCircleOutlined, WalletOutlined, ShoppingCartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { MOCK_EMPLOYEES, MOCK_ATTENDANCE, MOCK_LEAVE_REQUESTS, MOCK_PAYROLL_RUNS, formatINR } from '../../data/hrms-mock';
import { MOCK_INVOICES, MOCK_VENDOR_BILLS, formatINR as formatINR2 } from '../../data/finance-mock';

export default function DashboardHome() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const products = user?.products || ['hrms', 'finance'];
  const hasHrms = products.includes('hrms');
  const hasFinance = products.includes('finance');

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const activeEmps = MOCK_EMPLOYEES.filter(e => e.status === 'active' || e.status === 'probation').length;
  const presentToday = MOCK_ATTENDANCE.filter(a => a.status === 'present' || a.status === 'late').length;
  const pendingLeaves = MOCK_LEAVE_REQUESTS.filter(l => l.status === 'pending').length;
  const lastPayroll = MOCK_PAYROLL_RUNS.find(p => p.status === 'completed');

  const quickLinks = [
    ...(hasHrms ? [
      { label: 'Employees', desc: 'Manage records', icon: <TeamOutlined />, path: '/dashboard/employees', color: '#FF6D00' },
      { label: 'Attendance', desc: 'Track time', icon: <ClockCircleOutlined />, path: '/dashboard/attendance', color: '#FFA000' },
      { label: 'Leave', desc: 'Requests & approvals', icon: <CalendarOutlined />, path: '/dashboard/leave', color: '#FF8F00' },
      { label: 'Payroll', desc: 'Run & payslips', icon: <WalletOutlined />, path: '/dashboard/payroll', color: '#E65100' },
    ] : []),
    ...(hasFinance ? [
      { label: 'Invoices', desc: 'GST billing', icon: <FileTextOutlined />, path: '/dashboard/invoices', color: '#10B981' },
      { label: 'Receipts', desc: 'Payments', icon: <DollarOutlined />, path: '/dashboard/receipts', color: '#059669' },
      { label: 'Purchase', desc: 'POs & bills', icon: <ShoppingCartOutlined />, path: '/dashboard/purchase', color: '#0EA5E9' },
      { label: 'Banking', desc: 'Reconciliation', icon: <BankOutlined />, path: '/dashboard/banking', color: '#6366F1' },
      { label: 'Ledger', desc: 'Journal entries', icon: <AuditOutlined />, path: '/dashboard/ledger', color: '#EC4899' },
    ] : []),
    { label: 'Reports', desc: 'Analytics', icon: <BarChartOutlined />, path: '/dashboard/reports', color: '#8B5CF6' },
    { label: 'Settings', desc: 'Configure', icon: <SettingOutlined />, path: '/dashboard/settings', color: '#475569' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {greetingTime()}, {user?.firstName || 'there'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Here's what's happening across your workspace today.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {hasHrms && (
          <>
            <KPICard label="Total Employees" value={String(activeEmps)} color="#FF6D00" trend={`${MOCK_EMPLOYEES.filter(e => e.status === 'probation').length} on probation`} />
            <KPICard label="Present Today" value={`${presentToday}/${activeEmps}`} color="#10B981" trend={`${MOCK_ATTENDANCE.filter(a => a.status === 'late').length} late arrivals`} />
            <KPICard label="Pending Leaves" value={String(pendingLeaves)} color="#FF8F00" trend="Needs your action" />
            {lastPayroll && <KPICard label="Last Payroll" value={formatINR(lastPayroll.totalNet)} color="#8B5CF6" trend={`${lastPayroll.month} ${lastPayroll.year}`} />}
          </>
        )}
        {hasFinance && (
          <>
            <KPICard label="Receivables" value={formatINR2(MOCK_INVOICES.filter(i => i.balanceDue > 0).reduce((s, i) => s + i.balanceDue, 0))} color="#10B981" trend={`${MOCK_INVOICES.filter(i => i.status === 'overdue').length} overdue`} />
            <KPICard label="Payables" value={formatINR2(MOCK_VENDOR_BILLS.filter(b => b.status !== 'paid').reduce((s, b) => s + b.total, 0))} color="#EF4444" trend={`${MOCK_VENDOR_BILLS.filter(b => b.status === 'overdue').length} overdue`} />
          </>
        )}
      </div>

      {/* Quick Access */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>Quick Access</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {quickLinks.map(link => (
          <div
            key={link.label}
            onClick={() => navigate(link.path)}
            style={{
              background: '#FFFFFF', borderRadius: 14, padding: '18px 16px',
              border: '1px solid var(--color-border)', cursor: 'pointer',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(10,17,40,0.06)'; e.currentTarget.style.borderColor = link.color; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${link.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: link.color, fontSize: 16, flexShrink: 0 }}>
              {link.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{link.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{link.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {hasHrms && pendingLeaves > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>Pending Actions</h3>
          <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 32 }}>
            {MOCK_LEAVE_REQUESTS.filter(l => l.status === 'pending').map(lr => (
              <div key={lr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#FF6D00' }}>
                    {lr.employeeName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{lr.employeeName}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
                      {lr.leaveTypeFull} · {lr.days} day{lr.days > 1 ? 's' : ''} · {lr.fromDate}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate('/dashboard/leave')} style={{ background: '#FF6D00', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Review</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Activity Feed — cross-product notifications */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Recent Activity
          {unreadCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#FF6D00', marginLeft: 8 }}>{unreadCount} new</span>}
        </h3>
        <button onClick={() => navigate('/dashboard/notifications')} style={{ background: 'none', border: 'none', color: '#FF6D00', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          View all →
        </button>
      </div>
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {notifications.slice(0, 5).map(n => {
          const typeColor = n.type === 'error' ? '#EF4444' : n.type === 'warning' ? '#F59E0B' : n.type === 'success' ? '#10B981' : '#0EA5E9';
          const moduleColor = n.module === 'hrms' ? '#FF6D00' : n.module === 'finance' ? '#10B981' : '#64748B';
          return (
            <div
              key={n.id}
              onClick={() => n.link && navigate(n.link)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px',
                borderBottom: '1px solid #F5F5F5', cursor: n.link ? 'pointer' : 'default',
                background: n.read ? 'transparent' : 'rgba(255,109,0,0.02)',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? '#E5E7EB' : typeColor, marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--color-text-primary)' }}>{n.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: moduleColor, background: `${moduleColor}12`, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' as const }}>{n.module}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {timeAgo(n.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function KPICard({ label, value, color, trend }: { label: string; value: string; color: string; trend: string }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 14, padding: '18px 20px',
      border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, background: `${color}08`, borderRadius: '50%' }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: '-0.5px', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{trend}</div>
    </div>
  );
}
