import { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Select, message, Statistic, Spin, Popconfirm, Row, Col,
} from 'antd';
import { LogoutOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchAdminStats, fetchAdminCompanies, fetchAdminPlans, fetchAdminInvoices,
  activateSubscription, suspendSubscription, changeSubscriptionPlan,
  type AdminStats, type AdminCompany, type AdminPlan, type AdminInvoice,
} from '../../lib/api';

const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green', TRIAL: 'blue', PENDING: 'orange', PAST_DUE: 'volcano', CANCELLED: 'red',
};

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c, p, inv] = await Promise.all([
        fetchAdminStats(),
        fetchAdminCompanies(),
        fetchAdminPlans(),
        fetchAdminInvoices().catch(() => [] as AdminInvoice[]),
      ]);
      setStats(s); setCompanies(c); setPlans(p); setInvoices(inv);
    } catch {
      message.error('Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Block non-super-admins (ProtectedRoute only checks authentication).
  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const runAction = async (subId: number, label: string, fn: () => Promise<unknown>) => {
    setBusy(subId);
    try { await fn(); message.success(label); await load(); }
    catch { message.error('Action failed.'); }
    finally { setBusy(null); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const companyColumns = [
    {
      title: 'Company', dataIndex: 'name', key: 'name',
      render: (_: unknown, r: AdminCompany) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0A1128' }}>{r.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.45)' }}>{r.billing_email || r.schema_name}</div>
        </div>
      ),
    },
    {
      title: 'Plan', key: 'plan',
      render: (_: unknown, r: AdminCompany) => r.subscription
        ? <span style={{ fontSize: 13 }}>{r.subscription.plan_name}</span>
        : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: AdminCompany) => {
        const st = r.subscription?.status ?? 'NONE';
        return <Tag color={STATUS_COLOR[st] ?? 'default'}>{st}</Tag>;
      },
    },
    {
      title: 'Modules', key: 'products',
      render: (_: unknown, r: AdminCompany) => (
        <>
          {(r.subscription?.products ?? []).map(p => (
            <Tag key={p} color={p === 'finance' ? 'green' : 'orange'}>{p === 'finance' ? 'Accounting' : 'HRM'}</Tag>
          ))}
          {!r.subscription?.products?.length && <span style={{ color: '#cbd5e1' }}>—</span>}
        </>
      ),
    },
    { title: 'Since', dataIndex: 'created_on', key: 'created_on', render: (d: string) => <span style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)' }}>{d}</span> },
    {
      title: 'Actions', key: 'actions', width: 320,
      render: (_: unknown, r: AdminCompany) => {
        const sub = r.subscription;
        if (!sub) return <span style={{ color: '#cbd5e1' }}>No subscription</span>;
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {!sub.is_active && (
              <Button size="small" type="primary" loading={busy === sub.id}
                onClick={() => runAction(sub.id, 'Subscription activated', () => activateSubscription(sub.id))}>
                Activate
              </Button>
            )}
            {sub.is_active && (
              <Popconfirm title="Suspend this company's access?" okText="Suspend" okButtonProps={{ danger: true }}
                onConfirm={() => runAction(sub.id, 'Subscription suspended', () => suspendSubscription(sub.id))}>
                <Button size="small" danger loading={busy === sub.id}>Suspend</Button>
              </Popconfirm>
            )}
            <Select
              size="small" style={{ minWidth: 150 }} placeholder="Change plan"
              value={undefined} disabled={busy === sub.id}
              options={plans.map(p => ({ label: p.name, value: p.id }))}
              onChange={(planId: number) => runAction(sub.id, 'Plan changed', () => changeSubscriptionPlan(sub.id, planId))}
            />
          </div>
        );
      },
    },
  ];

  const invoiceColumns = [
    { title: 'Invoice #', dataIndex: 'number', key: 'number', render: (n: string) => n || '—' },
    { title: 'Period', key: 'period', render: (_: unknown, r: AdminInvoice) => <span style={{ fontSize: 12 }}>{r.period_start} → {r.period_end}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: string) => inr(a) },
    { title: 'Due', dataIndex: 'due_date', key: 'due_date' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'PAID' ? 'green' : s === 'OPEN' ? 'orange' : 'default'}>{s}</Tag> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFC' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', background: '#fff', borderBottom: '1px solid rgba(10,17,40,0.06)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" style={{ textDecoration: 'none' }}><SapttaLogo /></Link>
          <Tag color="purple" style={{ fontWeight: 700 }}>SUPER ADMIN</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ReloadOutlined />} onClick={load} style={{ borderRadius: 8 }}>Refresh</Button>
          <span style={{ fontSize: 13, color: 'rgba(10,17,40,0.5)' }}>{user?.email}</span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 8 }}>Sign Out</Button>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A1128', marginBottom: 4, letterSpacing: '-0.5px' }}>Platform Overview</h1>
        <p style={{ color: 'rgba(10,17,40,0.5)', fontSize: 14, marginBottom: 24 }}>Manage companies, subscriptions, and payments across Saptta.</p>

        {loading && !stats ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : (
          <>
            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
              {[
                { title: 'Companies', value: stats?.total_companies ?? 0 },
                { title: 'Active Subscriptions', value: stats?.active_subscriptions ?? 0 },
                { title: 'Pending', value: stats?.pending_subscriptions ?? 0 },
                { title: 'MRR', value: inr(stats?.mrr ?? 0) },
                { title: 'Accounting / HRM seats', value: `${stats?.finance_seats ?? 0} / ${stats?.hr_seats ?? 0}` },
                { title: 'Open Invoices', value: stats?.open_invoices ?? 0 },
              ].map(s => (
                <Col xs={12} md={8} lg={4} key={s.title}>
                  <Card size="small" style={{ borderRadius: 14 }}>
                    <Statistic title={s.title} value={s.value} valueStyle={{ fontSize: 22, fontWeight: 700, color: '#0A1128' }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Companies */}
            <Card title="Companies & Subscriptions" style={{ borderRadius: 16, marginBottom: 24 }}
              styles={{ header: { fontWeight: 700 } }}>
              <Table
                rowKey="schema_name" size="middle" columns={companyColumns as never}
                dataSource={companies} loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 900 }}
              />
            </Card>

            {/* Payments */}
            <Card title="Payments (SaaS Invoices)" style={{ borderRadius: 16 }}
              styles={{ header: { fontWeight: 700 } }}>
              <Table
                rowKey="id" size="middle" columns={invoiceColumns as never}
                dataSource={invoices} pagination={{ pageSize: 10 }}
                locale={{ emptyText: 'No invoices yet.' }}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
