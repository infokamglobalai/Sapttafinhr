import { createContext, useContext, useState, type ReactNode } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  module: 'hrms' | 'finance' | 'system';
  read: boolean;
  timestamp: string;
  link?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Leave request pending', message: 'Amit Kumar applied for 1 day Casual Leave on May 29. Needs your approval.', type: 'warning', module: 'hrms', read: false, timestamp: '2026-05-27T09:15:00', link: '/dashboard/leave' },
  { id: 'n2', title: 'Leave request pending', message: 'Priya Patel applied for 2 days Casual Leave (Jun 2–3). Needs your approval.', type: 'warning', module: 'hrms', read: false, timestamp: '2026-05-26T14:30:00', link: '/dashboard/leave' },
  { id: 'n3', title: 'Invoice overdue', message: 'INV-2026-001 for TechCorp India (₹1,88,500) is 22 days overdue.', type: 'error', module: 'finance', read: false, timestamp: '2026-05-27T08:00:00', link: '/dashboard/invoices' },
  { id: 'n4', title: 'Vendor bill due soon', message: 'VB-002 from Apex Office Solutions (₹48,555) is due on Jun 9.', type: 'warning', module: 'finance', read: false, timestamp: '2026-05-27T08:00:00', link: '/dashboard/purchase' },
  { id: 'n5', title: 'Payroll processed', message: 'April 2026 payroll completed — ₹6,32,000 net payout for 10 employees.', type: 'success', module: 'hrms', read: true, timestamp: '2026-04-28T17:00:00', link: '/dashboard/payroll' },
  { id: 'n6', title: 'Journal auto-posted', message: 'JV-2026-005: April payroll journal entry posted to ledger (₹8,03,200).', type: 'success', module: 'finance', read: true, timestamp: '2026-04-28T17:01:00', link: '/dashboard/ledger' },
  { id: 'n7', title: 'Bank reconciliation needed', message: '3 unreconciled transactions in HDFC Bank account since May 20.', type: 'info', module: 'finance', read: true, timestamp: '2026-05-25T10:00:00', link: '/dashboard/banking' },
  { id: 'n8', title: 'Expense claim submitted', message: 'Arjun Mehta submitted an expense claim for ₹4,500 (travel reimbursement).', type: 'info', module: 'hrms', read: false, timestamp: '2026-05-26T16:45:00', link: '/dashboard/expenses' },
  { id: 'n9', title: 'Late attendance alert', message: 'Amit Kumar punched in late (09:14 AM) — 3rd late mark this month.', type: 'warning', module: 'hrms', read: true, timestamp: '2026-05-27T09:15:00', link: '/dashboard/attendance' },
  { id: 'n10', title: 'GSTR-1 filing due', message: 'GSTR-1 for April 2026 is due by May 11. Export your data before deadline.', type: 'error', module: 'finance', read: true, timestamp: '2026-05-05T08:00:00', link: '/dashboard/reports' },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    setNotifications(prev => [{
      ...n, id: 'n_' + Date.now(), read: false, timestamp: new Date().toISOString(),
    }, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, dismiss, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
