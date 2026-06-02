import { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, type Notification,
} from './api';

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60; if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60; if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24; if (d < 7) return `${Math.floor(d)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN');
}

const DOT: Record<Notification['level'], string> = {
  INFO: 'bg-brand-500',
  WARNING: 'bg-amber-500',
  ERROR: 'bg-red-500',
};

/** Send the user to a notification's link. Hash routes stay in-app; URLs open out. */
function followLink(link: string) {
  if (!link) return;
  if (/^https?:\/\//i.test(link)) { window.open(link, '_blank', 'noopener'); return; }
  const path = link.replace(/^#/, '');
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: items, isLoading } = useNotifications();
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const onClickItem = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) { setOpen(false); followLink(n.link); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="text-sm font-semibold text-slate-900">Notifications</div>
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading && <div className="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>}
              {!isLoading && (items?.length ?? 0) === 0 && (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  <Bell size={20} className="mx-auto mb-2 text-slate-300" />
                  You're all caught up.
                </div>
              )}
              {items?.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onClickItem(n)}
                  className={cn(
                    'flex w-full items-start gap-2.5 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50',
                    !n.is_read && 'bg-brand-50/40',
                  )}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : DOT[n.level])} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', n.is_read ? 'text-slate-600' : 'font-semibold text-slate-900')}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.is_read && (
                    <span
                      role="button"
                      title="Mark read"
                      onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                      className="mt-0.5 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Check size={13} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
