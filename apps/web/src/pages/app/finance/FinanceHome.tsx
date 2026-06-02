import { useNavigate } from 'react-router-dom';
import {
  DollarOutlined, BankOutlined, FileTextOutlined, AuditOutlined,
  ShoppingCartOutlined, GlobalOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { MOCK_INVOICES, MOCK_VENDOR_BILLS, MOCK_BANK_ACCOUNTS, MOCK_RECEIPTS, formatINR } from '../../../data/finance-mock';
import { useApiResource, asCount, asList } from '../../../hooks/useApiResource';
import { getWorkspace } from '../../../lib/api';

const fhNum = (v: unknown): number => Number(v ?? 0) || 0;

export default function FinanceHome() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();

  // ── Live data from the real FIN tenant API. "connected" = the calls
  //    succeeded; an empty trial workspace then shows real zeros (not demo).
  //    Demo figures are used only when the backend is unreachable.
  const companies = useApiResource('/masters/companies/');
  const invoicesRes = useApiResource<unknown>('/billing/invoices/');
  const billsRes = useApiResource<unknown>('/procurement/vendor-bills/');
  const receiptsRes = useApiResource<unknown>('/payments/receipts/');
  const banksRes = useApiResource<unknown>('/banking/bank-accounts/');

  const connected = !companies.loading && !companies.error;
  const liveCompanyName =
    (companies.data && (companies.data as any).results?.[0]?.name) ||
    (Array.isArray(companies.data) && (companies.data as any)[0]?.name) ||
    null;

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Live aggregates (fall back to demo only when not connected).
  type AnyRow = Record<string, unknown>;
  const liveInvoices = asList<AnyRow>(invoicesRes.data);
  const liveBills = asList<AnyRow>(billsRes.data);
  const liveReceipts = asList<AnyRow>(receiptsRes.data);
  const liveBanks = asList<AnyRow>(banksRes.data);

  const totalReceivables = connected
    ? liveInvoices.reduce((s, i) => s + fhNum(i.balance_due), 0)
    : MOCK_INVOICES.filter(i => i.balanceDue > 0).reduce((s, i) => s + i.balanceDue, 0);
  const overdue = connected
    ? liveInvoices.filter(i => String(i.status).toUpperCase() === 'SENT' && i.due_date && new Date(String(i.due_date)) < new Date() && fhNum(i.balance_due) > 0).reduce((s, i) => s + fhNum(i.balance_due), 0)
    : MOCK_INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.balanceDue, 0);
  const totalPayables = connected
    ? liveBills.reduce((s, b) => s + fhNum(b.balance_due), 0)
    : MOCK_VENDOR_BILLS.filter(b => b.status !== 'paid').reduce((s, b) => s + b.total, 0);
  const overduePayables = connected ? 0 : MOCK_VENDOR_BILLS.filter(b => b.status === 'overdue').reduce((s, b) => s + b.total, 0);
  const totalBankBalance = connected
    ? liveBanks.reduce((s, a) => s + fhNum(a.opening_balance), 0)
    : MOCK_BANK_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const collected = connected
    ? liveReceipts.reduce((s, r) => s + fhNum(r.amount), 0)
    : MOCK_RECEIPTS.reduce((s, r) => s + r.amount, 0);
  const gstLiability = connected
    ? liveInvoices.reduce((s, i) => s + fhNum(i.cgst) + fhNum(i.sgst) + fhNum(i.igst), 0)
    : MOCK_INVOICES.reduce((s, i) => s + i.totalTax, 0);

  // The notification feed is demo content; don't show it for a live workspace
  // (it would surface fake activity like "TechCorp invoice overdue").
  const financeNotifications = connected ? [] : notifications.filter(n => n.module === 'finance').slice(0, 5);

  const quickLinks = [
    { label: 'Invoices', desc: 'GST invoicing', icon: <FileTextOutlined />, path: '/app/finance/invoices', color: '#10B981' },
    { label: 'Receipts', desc: 'Customer payments', icon: <DollarOutlined />, path: '/app/finance/receipts', color: '#059669' },
    { label: 'Purchase', desc: 'POs & vendor bills', icon: <ShoppingCartOutlined />, path: '/app/finance/purchase', color: '#0EA5E9' },
    { label: 'Banking', desc: 'Reconciliation', icon: <BankOutlined />, path: '/app/finance/banking', color: '#6366F1' },
    { label: 'Ledger', desc: 'Journal entries', icon: <AuditOutlined />, path: '/app/finance/ledger', color: '#EC4899' },
    { label: 'Portal', desc: 'Customer/vendor', icon: <GlobalOutlined />, path: '/app/finance/portal', color: '#8B5CF6' },
    { label: 'Reports', desc: 'P&L, GSTR, aging', icon: <BarChartOutlined />, path: '/app/finance/reports', color: '#F59E0B' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>
          {greetingTime()}, {user?.firstName || 'there'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Here's your finance snapshot. {overdue > 0 && <span style={{ color: '#EF4444', fontWeight: 600 }}>{formatINR(overdue)} overdue receivables.</span>}
        </p>
      </div>

      {/* Live backend status — real FIN tenant API */}
      <LiveDataBanner
        loading={companies.loading}
        error={companies.error}
        companyName={liveCompanyName}
        workspace={getWorkspace()}
        connected={connected}
        invoiceCount={connected ? liveInvoices.length : MOCK_INVOICES.length}
      />

      {/* Finance KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <KPICard label="Receivables" value={formatINR(totalReceivables)} color="#10B981" trend={connected ? `${liveInvoices.length} invoices` : `${MOCK_INVOICES.filter(i => i.status === 'overdue').length} overdue`} />
        <KPICard label="Payables" value={formatINR(totalPayables)} color="#EF4444" trend={overduePayables > 0 ? `${formatINR(overduePayables)} overdue` : 'On track'} />
        <KPICard label="Bank Balance" value={formatINR(totalBankBalance)} color="#6366F1" trend={`${connected ? liveBanks.length : MOCK_BANK_ACCOUNTS.length} accounts`} />
        <KPICard label="GST Liability" value={formatINR(gstLiability)} color="#F59E0B" trend="Current period" />
      </div>

      {/* Secondary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <KPICard label="Collected (FY)" value={formatINR(collected)} color="#10B981" trend={`${connected ? liveReceipts.length : MOCK_RECEIPTS.length} receipts`} />
        <KPICard label="Open Invoices" value={String(connected ? liveInvoices.filter(i => fhNum(i.balance_due) > 0).length : MOCK_INVOICES.filter(i => i.status === 'sent' || i.status === 'overdue').length)} color="#0EA5E9" trend="Awaiting payment" />
        <KPICard label="Pending Bills" value={String(connected ? liveBills.filter(b => fhNum(b.balance_due) > 0).length : MOCK_VENDOR_BILLS.filter(b => b.status !== 'paid').length)} color="#FF6D00" trend="To approve/pay" />
      </div>

      {/* Quick Access */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>Finance Modules</h3>
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

      {/* Overdue invoices (demo view only; live overdue is summarised in KPIs
          and actioned on the Invoices page) */}
      {!connected && MOCK_INVOICES.filter(i => i.status === 'overdue').length > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>Overdue Invoices</h3>
          <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 32 }}>
            {MOCK_INVOICES.filter(i => i.status === 'overdue').map(inv => {
              const daysOverdue = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000);
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontSize: 14 }}>
                      <FileTextOutlined />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{inv.number}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{inv.partyName} · {daysOverdue} days overdue</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#EF4444' }}>{formatINR(inv.balanceDue)}</span>
                    <button onClick={() => navigate('/app/finance/invoices')} style={{ background: '#10B981', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Follow up</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Finance Activity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Finance Activity
          {unreadCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', marginLeft: 8 }}>{unreadCount} new</span>}
        </h3>
        <button onClick={() => navigate('/app/finance/notifications')} style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          View all →
        </button>
      </div>
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {financeNotifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No recent finance activity</div>
        ) : (
          financeNotifications.map(n => {
            const typeColor = n.type === 'error' ? '#EF4444' : n.type === 'warning' ? '#F59E0B' : n.type === 'success' ? '#10B981' : '#0EA5E9';
            return (
              <div
                key={n.id}
                onClick={() => n.link && navigate(n.link.replace('/dashboard/', '/app/finance/'))}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px',
                  borderBottom: '1px solid #F5F5F5', cursor: n.link ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : 'rgba(16,185,129,0.02)',
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

function LiveDataBanner({ loading, error, companyName, workspace, connected, invoiceCount }: {
  loading: boolean;
  error: string | null;
  companyName: string | null;
  workspace: string | null;
  connected: boolean;
  invoiceCount: number;
}) {
  const bg = connected ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)';
  const border = connected ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)';
  const dot = connected ? '#10B981' : '#F59E0B';
  if (loading) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: bg, border: `1px solid ${border}`, borderRadius: 12,
      padding: '12px 18px', marginBottom: 28,
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        {connected ? (
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
            <strong style={{ color: '#059669' }}>Live</strong> — your workspace
            {companyName ? <> <strong>{companyName}</strong></> : null}
            {workspace ? <span style={{ color: 'var(--color-text-muted)' }}> ({workspace})</span> : null}
            {invoiceCount === 0
              ? '. No transactions yet — create an invoice to get started.'
              : `. ${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''} on record.`}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Showing sample data — can't reach your workspace{error ? ` (${error})` : ''}. Check that the backend is running.
          </span>
        )}
      </div>
    </div>
  );
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
