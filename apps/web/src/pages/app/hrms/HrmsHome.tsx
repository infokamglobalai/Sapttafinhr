import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TeamOutlined, CalendarOutlined, ClockCircleOutlined, WalletOutlined,
  UserAddOutlined, StarOutlined, SwapOutlined, ScheduleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { MOCK_EMPLOYEES, MOCK_ATTENDANCE, MOCK_LEAVE_REQUESTS, MOCK_PAYROLL_RUNS, formatINR } from '../../../data/hrms-mock';
import { fetchHrStats, type HrStats } from '../../../lib/api';

export default function HrmsHome() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();

  // Live HR KPIs (FIN proxies to the HR backend). Falls back to demo numbers
  // when HR is unavailable or the workspace has no HR data yet.
  const [live, setLive] = useState<HrStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchHrStats(user?.tenantId)
      .then(d => { if (!cancelled) setLive(d); })
      .catch(() => { if (!cancelled) setLive(null); });
    return () => { cancelled = true; };
  }, [user?.tenantId]);

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
  const probation = MOCK_EMPLOYEES.filter(e => e.status === 'probation').length;
  const lateCount = MOCK_ATTENDANCE.filter(a => a.status === 'late').length;

  const hrmsNotifications = notifications.filter(n => n.module === 'hrms').slice(0, 5);

  const quickLinks = [
    { label: 'Employees', desc: 'Manage records', icon: <TeamOutlined />, path: '/app/hrms/employees', color: '#FF6D00' },
    { label: 'Attendance', desc: 'Track time', icon: <ClockCircleOutlined />, path: '/app/hrms/attendance', color: '#FFA000' },
    { label: 'Leave', desc: 'Requests & approvals', icon: <CalendarOutlined />, path: '/app/hrms/leave', color: '#FF8F00' },
    { label: 'Payroll', desc: 'Run & payslips', icon: <WalletOutlined />, path: '/app/hrms/payroll', color: '#E65100' },
    { label: 'Recruitment', desc: 'Job postings & ATS', icon: <UserAddOutlined />, path: '/app/hrms/recruitment', color: '#0EA5E9' },
    { label: 'Performance', desc: 'Reviews & goals', icon: <StarOutlined />, path: '/app/hrms/performance', color: '#F59E0B' },
    { label: 'Expenses', desc: 'Employee claims', icon: <SwapOutlined />, path: '/app/hrms/expenses', color: '#8B5CF6' },
    { label: 'Holidays', desc: 'Holiday calendar', icon: <ScheduleOutlined />, path: '/app/hrms/holidays', color: '#EC4899' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {greetingTime()}, {user?.firstName || 'there'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Here's your HR snapshot. {pendingLeaves > 0 && <span style={{ color: '#FF6D00', fontWeight: 600 }}>{pendingLeaves} leave request{pendingLeaves > 1 ? 's' : ''} need your approval.</span>}
        </p>
      </div>

      {/* Live HR app entry — the embedded real Django HR backend */}
      <div
        onClick={() => navigate('/app/hrms/workspace')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          background: 'linear-gradient(135deg, #FF6D00, #FFA000)', color: 'white',
          borderRadius: 14, padding: '18px 22px', marginBottom: 28, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(255,109,0,0.25)',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>Open the Live HR App →</div>
          <div style={{ fontSize: 13, opacity: 0.92 }}>
            Employees, attendance, payroll &amp; more — your real Saptta HR workspace, embedded here.
          </div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.9, flexShrink: 0 }}><ThunderboltOutlined /></div>
      </div>

      {/* HRMS-specific KPIs — live from the HR backend when the workspace has
          employees; otherwise demo numbers so the dashboard isn't empty. */}
      {(() => {
        const useLive = !!live && live.total_employees > 0;
        const empCount = useLive ? live!.total_employees : activeEmps;
        const present = useLive ? live!.present_today : presentToday;
        const pending = useLive ? live!.pending_leave_approvals : pendingLeaves;
        return (
          <>
            {useLive && (
              <div style={{ fontSize: 12, fontWeight: 600, color: '#10B981', marginBottom: 10 }}>
                ● Live data from your HR workspace
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
              <KPICard label="Total Employees" value={String(empCount)} color="#FF6D00" trend={useLive ? `${live!.new_joiners_this_month} new this month` : `${probation} on probation`} />
              <KPICard label="Present Today" value={`${present}/${empCount}`} color="#10B981" trend={useLive ? `${live!.on_leave_today} on leave` : `${lateCount} late arrival${lateCount !== 1 ? 's' : ''}`} />
              <KPICard label="Pending Leaves" value={String(pending)} color="#FF8F00" trend={pending > 0 ? 'Needs your action' : 'All processed'} />
              {useLive
                ? <KPICard label="Regularizations" value={String(live!.pending_regularizations)} color="#8B5CF6" trend="Pending approval" />
                : (lastPayroll && <KPICard label="Last Payroll" value={formatINR(lastPayroll.totalNet)} color="#8B5CF6" trend={`${lastPayroll.month} ${lastPayroll.year}`} />)}
            </div>
          </>
        );
      })()}

      {/* Quick Access */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>HR Modules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 32 }}>
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

      {/* Pending Approvals */}
      {pendingLeaves > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>Pending Approvals</h3>
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
                <button onClick={() => navigate('/app/hrms/leave')} style={{ background: '#FF6D00', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Review</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* HR Activity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          HR Activity
          {unreadCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#FF6D00', marginLeft: 8 }}>{unreadCount} new</span>}
        </h3>
        <button onClick={() => navigate('/app/hrms/notifications')} style={{ background: 'none', border: 'none', color: '#FF6D00', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          View all →
        </button>
      </div>
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {hrmsNotifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No recent HR activity</div>
        ) : (
          hrmsNotifications.map(n => {
            const typeColor = n.type === 'error' ? '#EF4444' : n.type === 'warning' ? '#F59E0B' : n.type === 'success' ? '#10B981' : '#0EA5E9';
            return (
              <div
                key={n.id}
                onClick={() => n.link && navigate(n.link.replace('/dashboard/', '/app/hrms/'))}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px',
                  borderBottom: '1px solid #F5F5F5', cursor: n.link ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : 'rgba(255,109,0,0.02)',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? '#E5E7EB' : typeColor, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>{timeAgo(n.timestamp)}</span>
              </div>
            );
          })
        )}
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
  return `${Math.floor(hours / 24)}d ago`;
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
