import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Select, message, Statistic, Spin, Popconfirm, Row, Col,
  Modal, Form, Input, Checkbox, Space,
} from 'antd';
import { LogoutOutlined, ReloadOutlined, PlusOutlined, AppstoreOutlined, DashboardOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchAdminStats, fetchAdminCompaniesPaged, fetchAdminPlans, fetchAdminInvoices, fetchAdminAnalytics, fetchAdminHealth,
  activateSubscription, suspendSubscription, changeSubscriptionPlan, provisionCompany,
  type AdminStats, type AdminCompany, type AdminPlan, type AdminInvoice, type AdminAnalytics, type HealthReport,
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
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [provOpen, setProvOpen] = useState(false);
  const [provBusy, setProvBusy] = useState(false);
  const [provForm] = Form.useForm();

  // Server-side directory state (Phase 7).
  const [companyTotal, setCompanyTotal] = useState(0);
  const [companyQ, setCompanyQ] = useState('');
  const [companyStatus, setCompanyStatus] = useState<string | undefined>(undefined);
  const [companyProduct, setCompanyProduct] = useState<string | undefined>(undefined);
  const [companyPage, setCompanyPage] = useState(1);
  const COMPANY_PAGE_SIZE = 10;

  const loadCompanies = useCallback(async () => {
    try {
      const r = await fetchAdminCompaniesPaged({
        q: companyQ, status: companyStatus, product: companyProduct,
        page: companyPage, page_size: COMPANY_PAGE_SIZE,
      });
      setCompanies(r.results); setCompanyTotal(r.count);
    } catch { message.error('Failed to load companies.'); }
  }, [companyQ, companyStatus, companyProduct, companyPage]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, inv, an, h] = await Promise.all([
        fetchAdminStats(),
        fetchAdminPlans(),
        fetchAdminInvoices().catch(() => [] as AdminInvoice[]),
        fetchAdminAnalytics().catch(() => null),
        fetchAdminHealth().catch(() => null),
      ]);
      setStats(s); setPlans(p); setInvoices(inv); setAnalytics(an); setHealth(h);
      await loadCompanies();
    } catch {
      message.error('Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  // Refetch the directory when filters / page change.
  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const submitProvision = async () => {
    const v = await provForm.validateFields();
    setProvBusy(true);
    try {
      const r = await provisionCompany(v);
      setProvOpen(false); provForm.resetFields();
      Modal.success({
        title: 'Company provisioned',
        content: (
          <div>
            <p><strong>{r.name}</strong> created at workspace <code>{r.schema_name}</code>.</p>
            {r.reset_link && <>
              <p>Send the owner this link to set their password:</p>
              <Input.TextArea readOnly value={r.reset_link} autoSize />
            </>}
          </div>
        ),
      });
      await load();
    } catch (e) { message.error((e as Error)?.message || 'Provisioning failed.'); }
    finally { setProvBusy(false); }
  };

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
          <a style={{ fontWeight: 600, color: '#4f46e5' }}
            onClick={() => navigate(`/superadmin/companies/${r.schema_name}`)}>{r.name}</a>
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
          <div onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
    <div style={{ height: '100%', overflowY: 'auto', background: '#FAFAFC' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {health && (
            <Tag color={health.overall === 'up' ? 'green' : 'orange'}
              style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/superadmin/ops')}>
              ● {health.overall === 'up' ? 'Healthy' : 'Degraded'}
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setProvOpen(true)} style={{ borderRadius: 8 }}>New company</Button>
          <Button icon={<DashboardOutlined />} onClick={() => navigate('/superadmin/ops')} style={{ borderRadius: 8 }}>Operations</Button>
          <Button onClick={() => navigate('/superadmin/revenue')} style={{ borderRadius: 8 }}>Revenue</Button>
          <Button onClick={() => navigate('/superadmin/users')} style={{ borderRadius: 8 }}>Users</Button>
          <Button onClick={() => navigate('/superadmin/announcements')} style={{ borderRadius: 8 }}>Announce</Button>
          <Button onClick={() => navigate('/superadmin/coupons')} style={{ borderRadius: 8 }}>Coupons</Button>
          <Button icon={<AppstoreOutlined />} onClick={() => navigate('/superadmin/plans')} style={{ borderRadius: 8 }}>Plans</Button>
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

            {/* Analytics */}
            {analytics && (
              <Card title="Growth & Mix" style={{ borderRadius: 16, marginBottom: 24 }} styles={{ header: { fontWeight: 700 } }}>
                <Row gutter={[24, 24]}>
                  <Col xs={24} lg={14}>
                    <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)', marginBottom: 8 }}>Signups (last 12 months)</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                      {(() => {
                        const max = Math.max(1, ...analytics.signups_by_month.map(m => m.signups));
                        return analytics.signups_by_month.map(m => (
                          <div key={m.month} style={{ flex: 1, textAlign: 'center' }} title={`${m.month}: ${m.signups} signups (total ${m.total})`}>
                            <div style={{ height: 96, display: 'flex', alignItems: 'flex-end' }}>
                              <div style={{ width: '100%', background: '#6366f1', borderRadius: '4px 4px 0 0',
                                height: `${(m.signups / max) * 96}px`, minHeight: m.signups ? 3 : 0 }} />
                            </div>
                            <div style={{ fontSize: 9, color: 'rgba(10,17,40,0.4)' }}>{m.month.slice(5)}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </Col>
                  <Col xs={24} lg={5}>
                    <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)', marginBottom: 8 }}>Subscription status</div>
                    {Object.entries(analytics.status_mix).filter(([, n]) => n > 0).map(([s, n]) => (
                      <div key={s} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag><strong>{n}</strong>
                      </div>
                    ))}
                  </Col>
                  <Col xs={24} lg={5}>
                    <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)', marginBottom: 8 }}>Top plans</div>
                    {analytics.plan_mix.slice(0, 6).map(p => (
                      <div key={p.code} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span style={{ color: 'rgba(10,17,40,0.7)' }}>{p.plan}</span><strong>{p.count}</strong>
                      </div>
                    ))}
                  </Col>
                </Row>
              </Card>
            )}

            {/* Companies */}
            <Card title={`Companies & Subscriptions (${companyTotal})`} style={{ borderRadius: 16, marginBottom: 24 }}
              styles={{ header: { fontWeight: 700 } }}
              extra={
                <Space wrap>
                  <Input.Search placeholder="Search company / email" allowClear style={{ width: 220 }}
                    onSearch={(v) => { setCompanyQ(v); setCompanyPage(1); }} />
                  <Select placeholder="Status" allowClear style={{ width: 130 }} value={companyStatus}
                    onChange={(v) => { setCompanyStatus(v); setCompanyPage(1); }}
                    options={['ACTIVE', 'PENDING', 'PAST_DUE', 'CANCELLED', 'TRIAL'].map(s => ({ value: s, label: s }))} />
                  <Select placeholder="Module" allowClear style={{ width: 130 }} value={companyProduct}
                    onChange={(v) => { setCompanyProduct(v); setCompanyPage(1); }}
                    options={[{ value: 'finance', label: 'Accounting' }, { value: 'hrms', label: 'HRM' }]} />
                </Space>
              }>
              <Table
                rowKey="schema_name" size="middle" columns={companyColumns as never}
                dataSource={companies} loading={loading} scroll={{ x: 900 }}
                pagination={{ current: companyPage, pageSize: COMPANY_PAGE_SIZE, total: companyTotal,
                  showSizeChanger: false, onChange: (p) => setCompanyPage(p) }}
                onRow={(r) => ({
                  onClick: () => navigate(`/superadmin/companies/${r.schema_name}`),
                  style: { cursor: 'pointer' },
                })}
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

      <Modal title="Provision a new company" open={provOpen} onOk={submitProvision} confirmLoading={provBusy}
        onCancel={() => { setProvOpen(false); provForm.resetFields(); }} okText="Create company">
        <Form form={provForm} layout="vertical" initialValues={{ products: ['finance', 'hrms'], plan_id: 'saptta-complete', country: 'IN' }}>
          <Form.Item name="company_name" label="Company name" rules={[{ required: true }]}>
            <Input placeholder="Acme Pvt Ltd" />
          </Form.Item>
          <Form.Item name="email" label="Owner email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="owner@acme.com" />
          </Form.Item>
          <Form.Item name="full_name" label="Owner name"><Input placeholder="Optional" /></Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="plan_id" label="Plan code"><Input /></Form.Item>
            <Form.Item name="country" label="Country"><Input style={{ width: 80 }} /></Form.Item>
          </Space>
          <Form.Item name="products" label="Modules">
            <Checkbox.Group options={[{ label: 'Accounting', value: 'finance' }, { label: 'HRM', value: 'hrms' }]} />
          </Form.Item>
          <span style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)' }}>Subscription is created ACTIVE. A password-reset link is returned for the owner.</span>
        </Form>
      </Modal>
    </div>
  );
}
