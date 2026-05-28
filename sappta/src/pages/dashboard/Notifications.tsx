import { Tag, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckOutlined, DeleteOutlined, BellOutlined } from '@ant-design/icons';
import { useNotifications, type Notification } from '../../contexts/NotificationContext';

const typeCfg: Record<string, { color: string; bg: string }> = {
  info: { color: '#0EA5E9', bg: 'rgba(14,165,233,0.06)' },
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.06)' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.06)' },
  error: { color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
};

const moduleCfg: Record<string, { color: string; label: string }> = {
  hrms: { color: '#FF6D00', label: 'HRMS' },
  finance: { color: '#10B981', label: 'Finance' },
  system: { color: '#64748B', label: 'System' },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: Notification) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>
            Notifications
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button icon={<CheckOutlined />} onClick={markAllRead} style={{ borderRadius: 8, fontWeight: 600 }}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Module summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(moduleCfg).map(([key, cfg]) => {
          const count = notifications.filter(n => n.module === key && !n.read).length;
          return (
            <div key={key} style={{ background: '#FFFFFF', borderRadius: 10, padding: '10px 16px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={cfg.color} style={{ fontSize: 10, borderRadius: 6, margin: 0 }}>{cfg.label}</Tag>
              <span style={{ fontSize: 14, fontWeight: 800, color: count > 0 ? cfg.color : 'var(--color-text-muted)' }}>{count}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>unread</span>
            </div>
          );
        })}
      </div>

      {/* Unread */}
      {unread.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Unread ({unread.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unread.map(n => (
              <NotifCard key={n.id} notification={n} onClick={() => handleClick(n)} onDismiss={() => dismiss(n.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Read */}
      {read.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Earlier ({read.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {read.map(n => (
              <NotifCard key={n.id} notification={n} onClick={() => handleClick(n)} onDismiss={() => dismiss(n.id)} />
            ))}
          </div>
        </div>
      )}

      {notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BellOutlined style={{ fontSize: 40, color: 'var(--color-text-muted)', marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No notifications</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>You're all caught up!</div>
        </div>
      )}
    </div>
  );
}

function NotifCard({ notification: n, onClick, onDismiss }: { notification: Notification; onClick: () => void; onDismiss: () => void }) {
  const tc = typeCfg[n.type];
  const mc = moduleCfg[n.module];
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px',
        background: n.read ? '#FFFFFF' : tc.bg, borderRadius: 14,
        border: `1px solid ${n.read ? 'var(--color-border)' : tc.color + '20'}`,
        cursor: n.link ? 'pointer' : 'default',
        transition: 'all 0.15s ease', position: 'relative',
        opacity: n.read ? 0.7 : 1,
      }}
    >
      {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc.color, flexShrink: 0, marginTop: 6 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{n.title}</span>
          <Tag color={mc.color} style={{ fontSize: 9, borderRadius: 6, margin: 0, lineHeight: '16px' }}>{mc.label}</Tag>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>{timeAgo(n.timestamp)}</div>
      </div>
      <Button type="text" size="small" icon={<DeleteOutlined />} onClick={e => { e.stopPropagation(); onDismiss(); }}
        style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
    </div>
  );
}
