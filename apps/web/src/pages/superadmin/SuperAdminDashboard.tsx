import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Select, message, Statistic, Spin, Popconfirm, Row, Col,
  Modal, Form, Input, Checkbox, Space, Tooltip, Empty
} from 'antd';
import {
  PlusOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  SearchOutlined
} from '@ant-design/icons';
import {
  fetchAdminStats, fetchAdminCompaniesPaged, fetchAdminPlans, fetchAdminInvoices, fetchAdminAnalytics,
  activateSubscription, suspendSubscription, changeSubscriptionPlan, provisionCompany,
  type AdminStats, type AdminCompany, type AdminPlan, type AdminInvoice, type AdminAnalytics
} from '../../lib/api';

const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'success',
  TRIAL: 'processing',
  PENDING: 'warning',
  PAST_DUE: 'error',
  CANCELLED: 'default',
};

const STATS_CONFIG = [
  { key: 'total_companies', title: 'Companies', icon: <ShopOutlined style={{ fontSize: '24px', color: '#6366F1' }} />, color: '#E0E7FF' },
  { key: 'active_subscriptions', title: 'Active Subscriptions', icon: <CheckCircleOutlined style={{ fontSize: '24px', color: '#10B981' }} />, color: '#D1FAE5' },
  { key: 'pending_subscriptions', title: 'Pending Subscriptions', icon: <ClockCircleOutlined style={{ fontSize: '24px', color: '#F59E0B' }} />, color: '#FEF3C7' },
  { key: 'mrr', title: 'Monthly Rec. Revenue', icon: <DollarCircleOutlined style={{ fontSize: '24px', color: '#EC4899' }} />, color: '#FCE7F3', isCurrency: true },
  { key: 'seats', title: 'Accounting / HRM seats', icon: <TeamOutlined style={{ fontSize: '24px', color: '#8B5CF6' }} />, color: '#EDE9FE' },
  { key: 'open_invoices', title: 'Open Invoices', icon: <FileTextOutlined style={{ fontSize: '24px', color: '#EF4444' }} />, color: '#FEE2E2' },
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [provOpen, setProvOpen] = useState(false);
  const [provBusy, setProvBusy] = useState(false);
  const [provForm] = Form.useForm();

  // Server-side directory state
  const [companyTotal, setCompanyTotal] = useState(0);
  const [companyQ, setCompanyQ] = useState('');
  const [companyStatus, setCompanyStatus] = useState<string | undefined>(undefined);
  const [companyProduct, setCompanyProduct] = useState<string | undefined>(undefined);
  const [companyPage, setCompanyPage] = useState(1);
  const COMPANY_PAGE_SIZE = 10;

  const loadCompanies = useCallback(async () => {
    try {
      const r = await fetchAdminCompaniesPaged({
        q: companyQ,
        status: companyStatus,
        product: companyProduct,
        page: companyPage,
        page_size: COMPANY_PAGE_SIZE,
      });
      setCompanies(r.results);
      setCompanyTotal(r.count);
    } catch {
      message.error('Failed to load companies.');
    }
  }, [companyQ, companyStatus, companyProduct, companyPage]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, inv, an] = await Promise.all([
        fetchAdminStats(),
        fetchAdminPlans(),
        fetchAdminInvoices().catch(() => [] as AdminInvoice[]),
        fetchAdminAnalytics().catch(() => null),
      ]);
      setStats(s);
      setPlans(p);
      setInvoices(inv);
      setAnalytics(an);
      await loadCompanies();
    } catch {
      message.error('Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Refetch directory when filters / page change.
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const submitProvision = async () => {
    const v = await provForm.validateFields();
    setProvBusy(true);
    try {
      const r = await provisionCompany(v);
      setProvOpen(false);
      provForm.resetFields();
      Modal.success({
        title: 'Company Provisioned Successfully',
        content: (
          <div style={{ marginTop: '8px' }}>
            <p>Company <strong>{r.name}</strong> created at workspace schema <code>{r.schema_name}</code>.</p>
            {r.reset_link && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontWeight: 600, marginBottom: '6px' }}>Password Reset/Activation Link:</p>
                <Input.TextArea readOnly value={r.reset_link} autoSize={{ minRows: 2, maxRows: 4 }} style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>Provide this link to the company administrator to activate their account.</p>
              </div>
            )}
          </div>
        ),
        okText: 'Done'
      });
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Provisioning failed.');
    } finally {
      setProvBusy(false);
    }
  };

  const runAction = async (subId: number, label: string, fn: () => Promise<unknown>) => {
    setBusy(subId);
    try {
      await fn();
      message.success(label);
      await load();
    } catch {
      message.error('Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const getStatValue = (key: string) => {
    if (!stats) return '—';
    if (key === 'total_companies') return stats.total_companies;
    if (key === 'active_subscriptions') return stats.active_subscriptions;
    if (key === 'pending_subscriptions') return stats.pending_subscriptions;
    if (key === 'mrr') return inr(stats.mrr);
    if (key === 'seats') return `${stats.finance_seats} / ${stats.hr_seats}`;
    if (key === 'open_invoices') return stats.open_invoices;
    return '—';
  };

  const companyColumns = [
    {
      title: 'Company',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, r: AdminCompany) => (
        <div style={{ padding: '4px 0' }}>
          <a
            style={{ fontWeight: 600, color: '#FF6D00', fontSize: '14px' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/superadmin/companies/${r.schema_name}`);
            }}
          >
            {r.name}
          </a>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{r.billing_email || r.schema_name}</div>
        </div>
      ),
    },
    {
      title: 'Subscription Plan',
      key: 'plan',
      render: (_: unknown, r: AdminCompany) => r.subscription ? (
        <span style={{ fontWeight: 500, fontSize: '13px', color: '#334155' }}>{r.subscription.plan_name}</span>
      ) : (
        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No Subscription</span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, r: AdminCompany) => {
        const st = r.subscription?.status ?? 'NONE';
        return (
          <Tag color={STATUS_COLOR[st] ?? 'default'} style={{ textTransform: 'uppercase', fontWeight: 600, borderRadius: '4px' }}>
            {st}
          </Tag>
        );
      },
    },
    {
      title: 'Active Modules',
      key: 'products',
      render: (_: unknown, r: AdminCompany) => {
        const products = r.subscription?.products ?? [];
        return (
          <Space size={4}>
            {products.map(p => (
              <Tag key={p} color={p === 'finance' ? 'blue' : 'purple'} style={{ borderRadius: '4px', fontSize: '11px' }}>
                {p === 'finance' ? 'Accounting' : 'HRM'}
              </Tag>
            ))}
            {!products.length && <span style={{ color: '#94A3B8' }}>—</span>}
          </Space>
        );
      },
    },
    {
      title: 'Registered Since',
      dataIndex: 'created_on',
      key: 'created_on',
      render: (d: string) => <span style={{ fontSize: '13px', color: '#64748B' }}>{d}</span>
    },
    {
      title: 'Quick Actions',
      key: 'actions',
      width: 280,
      render: (_: unknown, r: AdminCompany) => {
        const sub = r.subscription;
        if (!sub) return <span style={{ color: '#94A3B8', fontSize: '13px', fontStyle: 'italic' }}>No actions available</span>;
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!sub.is_active ? (
              <Button
                size="small"
                type="primary"
                loading={busy === sub.id}
                onClick={() => runAction(sub.id, 'Subscription activated', () => activateSubscription(sub.id))}
                style={{ borderRadius: '6px', fontSize: '12px' }}
              >
                Activate
              </Button>
            ) : (
              <Popconfirm
                title="Suspend company access?"
                description="This will lock the company workspace. Proceed?"
                okText="Suspend"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => runAction(sub.id, 'Subscription suspended', () => suspendSubscription(sub.id))}
              >
                <Button size="small" danger type="dashed" loading={busy === sub.id} style={{ borderRadius: '6px', fontSize: '12px' }}>
                  Suspend
                </Button>
              </Popconfirm>
            )}
            <Select
              size="small"
              style={{ width: 140 }}
              placeholder="Change plan"
              value={undefined}
              disabled={busy === sub.id}
              options={plans.map(p => ({ label: p.name, value: p.id }))}
              onChange={(planId: number) => runAction(sub.id, 'Plan updated', () => changeSubscriptionPlan(sub.id, planId))}
              dropdownStyle={{ minWidth: '160px' }}
            />
          </div>
        );
      },
    },
  ];

  const invoiceColumns = [
    { title: 'Invoice #', dataIndex: 'number', key: 'number', render: (n: string) => <span style={{ fontWeight: 600, color: '#334155' }}>{n || '—'}</span> },
    { title: 'Billing Period', key: 'period', render: (_: unknown, r: AdminInvoice) => <span style={{ fontSize: '13px', color: '#64748B' }}>{r.period_start} &rarr; {r.period_end}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: string) => <span style={{ fontWeight: 500 }}>{inr(a)}</span> },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (d: string) => <span style={{ color: '#64748B' }}>{d}</span> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'PAID' ? 'success' : s === 'OPEN' ? 'warning' : 'default'} style={{ fontWeight: 600, borderRadius: '4px' }}>
          {s}
        </Tag>
      )
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Welcome Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Console Overview</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0' }}>Real-time usage metrics, subscriptions, and platform-level operations.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setProvOpen(true)}
          style={{ height: '40px', borderRadius: '8px', fontWeight: 600, background: '#FF6D00', borderColor: '#FF6D00' }}
        >
          Provision Company
        </Button>
      </div>

      {loading && !stats ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading console metrics..." />
        </div>
      ) : (
        <>
          {/* Stats KPI Widgets Grid */}
          <Row gutter={[20, 20]}>
            {STATS_CONFIG.map(s => (
              <Col xs={24} sm={12} lg={8} xl={4} key={s.key}>
                <Card
                  bordered={false}
                  hoverable
                  style={{
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
                    borderLeft: `4px solid ${s.icon.props.style.color}`,
                    height: '100%'
                  }}
                  bodyStyle={{ padding: '20px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.title}</span>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                    {getStatValue(s.key)}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Analytics Visuals Row */}
          {analytics && (
            <Row gutter={[24, 24]}>
              {/* Signups Chart */}
              <Col xs={24} lg={14}>
                <Card
                  title="Signup Growth History"
                  bordered={false}
                  style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', height: '100%' }}
                  headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700, fontSize: '15px' }}
                >
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '24px' }}>Monthly signups (last 12 months)</div>
                  
                  {/* Custom CSS Bar Chart */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    height: '160px',
                    paddingBottom: '20px',
                    position: 'relative',
                    borderBottom: '1px solid #E2E8F0',
                  }}>
                    {/* Horizontal Background Lines */}
                    {[0, 25, 50, 75, 100].map(p => (
                      <div key={p} style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: `${p}%`,
                        height: '1px',
                        borderBottom: '1px dashed #E2E8F0',
                        zIndex: 1
                      }} />
                    ))}

                    {(() => {
                      const max = Math.max(1, ...analytics.signups_by_month.map(m => m.signups));
                      return analytics.signups_by_month.map(m => {
                        const heightPercent = (m.signups / max) * 100;
                        return (
                          <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                            <Tooltip
                              title={
                                <div style={{ fontSize: '12px', padding: '2px' }}>
                                  <strong style={{ color: '#A78BFA' }}>{m.month}</strong>
                                  <div style={{ marginTop: '4px' }}>New Signups: <strong>{m.signups}</strong></div>
                                  <div>Cumulative: <strong>{m.total}</strong></div>
                                </div>
                              }
                            >
                              <div style={{
                                width: '65%',
                                height: '120px',
                                display: 'flex',
                                alignItems: 'flex-end',
                                cursor: 'pointer',
                              }}>
                                <div
                                  style={{
                                    width: '100%',
                                    background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
                                    borderRadius: '6px 6px 0 0',
                                    height: `${heightPercent}%`,
                                    minHeight: m.signups ? '4px' : '0',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                  }}
                                  className="signup-bar"
                                />
                              </div>
                            </Tooltip>
                            <span style={{ fontSize: '10px', color: '#64748B', marginTop: '8px', fontWeight: 500 }}>
                              {m.month.slice(5)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </Card>
              </Col>

              {/* Status & Plan Mix Cards */}
              <Col xs={24} lg={10}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                  {/* Subscription Status Card */}
                  <Card
                    title="Subscription Status Mix"
                    size="small"
                    bordered={false}
                    style={{ borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}
                    headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 4px' }}>
                      {Object.entries(analytics.status_mix).filter(([, n]) => n > 0).map(([s, n]) => (
                        <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Tag color={STATUS_COLOR[s] ?? 'default'} style={{ textTransform: 'uppercase', fontWeight: 600, borderRadius: '4px' }}>
                            {s}
                          </Tag>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{n} companies</span>
                        </div>
                      ))}
                      {!Object.keys(analytics.status_mix).length && <Empty description="No status data" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>
                  </Card>

                  {/* Top Plans Card */}
                  <Card
                    title="Top Plans Share"
                    size="small"
                    bordered={false}
                    style={{ borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', flex: 1 }}
                    headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 4px' }}>
                      {analytics.plan_mix.slice(0, 5).map((p, idx) => (
                        <div key={p.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                            <span style={{ color: '#94A3B8', marginRight: '8px', fontSize: '11px', fontFamily: 'monospace' }}>#{idx+1}</span>
                            {p.plan}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{p.count} Active</span>
                        </div>
                      ))}
                      {!analytics.plan_mix.length && <Empty description="No plan distribution data" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>
                  </Card>
                </div>
              </Col>
            </Row>
          )}

          {/* Companies & Directory Table */}
          <Card
            title={`Company Directory (${companyTotal})`}
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
            headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700, fontSize: '15px' }}
            bodyStyle={{ padding: '16px 20px 24px' }}
            extra={
              <Space wrap size="middle">
                <Input
                  placeholder="Search company / email"
                  allowClear
                  prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                  onChange={(e) => {
                    setCompanyQ(e.target.value);
                    setCompanyPage(1);
                  }}
                  style={{ width: 240, borderRadius: '8px' }}
                />
                <Select
                  placeholder="Filter Status"
                  allowClear
                  value={companyStatus}
                  onChange={(v) => {
                    setCompanyStatus(v);
                    setCompanyPage(1);
                  }}
                  options={['ACTIVE', 'PENDING', 'PAST_DUE', 'CANCELLED', 'TRIAL'].map(s => ({ value: s, label: s }))}
                  style={{ width: 140 }}
                  dropdownStyle={{ borderRadius: '8px' }}
                />
                <Select
                  placeholder="Filter Module"
                  allowClear
                  value={companyProduct}
                  onChange={(v) => {
                    setCompanyProduct(v);
                    setCompanyPage(1);
                  }}
                  options={[{ value: 'finance', label: 'Accounting' }, { value: 'hrms', label: 'HRM' }]}
                  style={{ width: 140 }}
                  dropdownStyle={{ borderRadius: '8px' }}
                />
              </Space>
            }
          >
            <Table
              rowKey="schema_name"
              size="middle"
              columns={companyColumns as never}
              dataSource={companies}
              loading={loading}
              scroll={{ x: 900 }}
              pagination={{
                current: companyPage,
                pageSize: COMPANY_PAGE_SIZE,
                total: companyTotal,
                showSizeChanger: false,
                onChange: (p) => setCompanyPage(p),
                style: { marginTop: '24px' }
              }}
              onRow={(r) => ({
                onClick: () => navigate(`/superadmin/companies/${r.schema_name}`),
                style: { cursor: 'pointer' },
              })}
              style={{ background: '#FFF' }}
            />
          </Card>

          {/* Payments Card */}
          <Card
            title="Recent SaaS Subscription Payments"
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
            headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700, fontSize: '15px' }}
            bodyStyle={{ padding: '8px 20px 20px' }}
          >
            <Table
              rowKey="id"
              size="middle"
              columns={invoiceColumns as never}
              dataSource={invoices}
              pagination={{ pageSize: 8, style: { marginTop: '16px' } }}
              locale={{ emptyText: <Empty description="No invoices found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </>
      )}

      {/* Provision New Company Modal */}
      <Modal
        title="Provision Workspace & Company"
        open={provOpen}
        onOk={submitProvision}
        confirmLoading={provBusy}
        onCancel={() => {
          setProvOpen(false);
          provForm.resetFields();
        }}
        okText="Create Company"
        cancelText="Cancel"
        okButtonProps={{ style: { background: '#FF6D00', borderColor: '#FF6D00', borderRadius: '6px' } }}
        cancelButtonProps={{ style: { borderRadius: '6px' } }}
        bodyStyle={{ paddingTop: '16px' }}
        width={520}
      >
        <Form
          form={provForm}
          layout="vertical"
          initialValues={{ products: ['finance', 'hrms'], plan_id: 'saptta-complete', country: 'IN' }}
        >
          <Form.Item name="company_name" label="Company Name" rules={[{ required: true, message: 'Please enter company name' }]}>
            <Input placeholder="e.g. Acme Corporation" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="email" label="Owner Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid owner email' }]}>
            <Input placeholder="e.g. admin@acme.com" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="full_name" label="Owner Name">
            <Input placeholder="e.g. John Doe (Optional)" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="plan_id" label="Plan Code" rules={[{ required: true }]}>
                <Input style={{ borderRadius: '6px' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="country" label="Country Code" rules={[{ required: true }]}>
                <Input placeholder="IN" style={{ borderRadius: '6px' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="products" label="Enable Product Modules">
            <Checkbox.Group>
              <Row>
                <Col span={12}>
                  <Checkbox value="finance">Accounting Module</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="hrms">HRM Module</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: '#64748B', border: '1px solid #E2E8F0' }}>
            Subscription is created with an <strong>ACTIVE</strong> status immediately. An account password-activation link is returned upon submission.
          </div>
        </Form>
      </Modal>
    </div>
  );
}
