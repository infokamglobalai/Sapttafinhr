import { useEffect, useState } from 'react';
import { fetchActiveAnnouncements, getAccessToken, type Announcement } from '../lib/api';

const LEVEL_BG: Record<string, string> = { INFO: '#2563eb', WARNING: '#d97706', CRITICAL: '#dc2626' };

/**
 * Platform-wide announcement banner shown to any signed-in user. Reads the live
 * announcement from the API; dismissible per-announcement (remembered in
 * localStorage). Rendered globally beneath the impersonation banner.
 */
export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('saptta_dismissed_announcements') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    if (!getAccessToken()) return;
    fetchActiveAnnouncements().then(setItems).catch(() => {});
  }, []);

  const visible = items.filter(a => !dismissed.includes(a.id));
  if (!visible.length) return null;
  const a = visible[0];

  const dismiss = () => {
    const next = [...dismissed, a.id];
    setDismissed(next);
    localStorage.setItem('saptta_dismissed_announcements', JSON.stringify(next));
  };

  return (
    <div style={{
      background: LEVEL_BG[a.level] || '#2563eb', color: '#fff', padding: '8px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontSize: 13,
    }}>
      <span><strong>{a.title}</strong>{a.body ? ` — ${a.body}` : ''}</span>
      <button onClick={dismiss} style={{
        background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 6,
        padding: '2px 10px', cursor: 'pointer', fontWeight: 600,
      }}>Dismiss</button>
    </div>
  );
}
