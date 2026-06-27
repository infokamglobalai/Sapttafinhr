import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Tabs, Descriptions, Popconfirm, Modal, Form, Input,
  Checkbox, message, Spin, Space, Switch, Typography, Row, Col, Progress, Timeline, Empty
} from 'antd';
import {
  ArrowLeftOutlined, LoginOutlined, PlusOutlined, SafetyCertificateOutlined, DeleteOutlined, 
  CloseCircleOutlined, CheckCircleFilled, MessageOutlined, FileTextOutlined, 
  CalendarOutlined, SettingOutlined, UserOutlined
} from '@ant-design/icons';
import {
  fetchAdminCompanyDetail, createCompanyUser, resetUserPassword, setUserActive,
  setCompanyActive, deleteCompany, generateCompanyInvoice, invoiceAction,
  toggleEntitlement, startImpersonation, fetchAdminActivity,
  fetchCompanyUsage, fetchCompanyNotes, addCompanyNote,
  type AdminCompanyDetail, type AdminUser, type AdminInvoice, type AdminEntitlement, type ActivityRow,
  type CompanyUsage, type TenantNote
} from '../../lib/api';

const { Text } = Typography;
const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'success', TRIAL: 'processing', PENDING: 'warning', PAST_DUE: 'error', CANCELLED: 'default',
  PAID: 'success', OPEN: 'warning', VOID: 'default', SUSPENDED: 'error',
};

export default function CompanyDetail() {
  const { schema = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminCompanyDetail | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [usage, setUsage] = useState<CompanyUsage | null>(null);
  const [notes, setNotes] = useState<TenantNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, act, u, nt] = await Promise.all([
        fetchAdminCompanyDetail(schema),
        fetchAdminActivity({ schema, limit: 100 }).then(r => r.results).catch(() => [] as ActivityRow[]),
        fetchCompanyUsage(schema).catch(() => null),
        fetchCompanyNotes(schema).catch(() => [] as TenantNote[]),
      ]);
      setData(d);
      setActivity(act);
      setUsage(u);
      setNotes(nt);
    }
    catch {
      message.error('Failed to load company detail metrics.');
    }
    finally {
      setLoading(false);
    }
  }, [schema]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      message.success(label);
      await load();
    }
    catch (e) {
      message.error((e as Error)?.message || 'Action failed.');
    }
    finally {
      setBusy(false);
    }
  };

  const sub = data?.subscription;

  const handleImpersonationConfirm = () => {
    Modal.confirm({
      title: 'Open Impersonated Administrative Session?',
      icon: <SafetyCertificateOutlined style={{ color: '#FF6D00' }} />,
      content: (
        <div style={{ marginTop: '8px' }}>
          <p>You are about to launch administrative access for company <strong>{data?.name}</strong> (schema <code>{schema}</code>).</p>
          <p style={{ color: '#EF4444', fontWeight: 600 }}>This will let you inspect all operational features directly within the customer interface.</p>
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#64748B', border: '1px solid #E2E8F0', marginTop: '12px' }}>
            To end the session and return to the Superadmin Console, look for the <strong>Exit Impersonation</strong> banner at the top of the customer site.
          </div>
        </div>
      ),
      okText: 'Open Workspace',
      cancelText: 'Cancel',
      okButtonProps: { style: { background: '#FF6D00', borderColor: '#FF6D00', borderRadius: '6px' } },
      cancelButtonProps: { style: { borderRadius: '6px' } },
      onOk: async () => {
        try {
          await startImpersonation(schema);
        } catch (e) {
          message.error((e as Error)?.message || 'Could not launch session.');
        }
      }
    });
  };

  const handleResetPw = async (u: AdminUser) => {
    try {
      const r = await resetUserPassword(u.id);
      Modal.success({
        title: 'Share Activation/Password Reset Link',
        content: (
          <div style={{ marginTop: '8px' }}>
            <p>{r.emailed ? 'A direct reset email has been dispatched. ' : ''}Or provide this link manually to user <strong>{u.email}</strong>:</p>
            <Input.TextArea readOnly value={r.reset_link} autoSize style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '8px' }} />
          </div>
        ),
        okText: 'Done'
      });
    } catch (e) {
      message.error((e as Error)?.message || 'Reset password request failed.');
    }
  };

  const submitAddUser = async () => {
    const v = await form.validateFields();
    setBusy(true);
    try {
      const u = await createCompanyUser(schema, v);
      setAddUserOpen(false);
      form.resetFields();
      if (u.reset_link) {
        Modal.success({
          title: 'Client User Created Successfully',
          content: (
            <div style={{ marginTop: '8px' }}>
              <p>User created. Provide this password setup link to <strong>{u.email}</strong> to activate their account:</p>
              <Input.TextArea readOnly value={u.reset_link} autoSize style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '8px' }} />
            </div>
          ),
          okText: 'Done'
        });
      } else {
        message.success('Client user created.');
      }
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Failed to create user.');
    }
    finally {
      setBusy(false);
    }
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addCompanyNote(schema, noteText.trim());
      setNoteText('');
      message.success('Internal note added.');
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Failed to submit note.');
    }
  };

  // Safe Entitlement (product toggling) confirmation modal
  const handleEntitlementChange = (productCode: 'FIN' | 'HR', currentStatus: boolean) => {
    if (!sub) return;
    const productName = productCode === 'FIN' ? 'Accounting' : 'HRM';
    const actionWord = !currentStatus ? 'enable' : 'disable';

    Modal.confirm({
      title: `${actionWord.toUpperCase()} ${productName} Module Access?`,
      content: `Are you sure you want to ${actionWord} the ${productName} module for ${data?.name}? This immediately alters active features for their client workers.`,
      okText: `Confirm ${actionWord}`,
      cancelText: 'Cancel',
      okButtonProps: { danger: currentStatus, style: { borderRadius: '6px' } },
      cancelButtonProps: { style: { borderRadius: '6px' } },
      onOk: () => act(`${productName} module updated`, () => toggleEntitlement(sub.id, productCode, !currentStatus))
    });
  };

  const userColumns = [
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
      render: (e: string, r: AdminUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserOutlined style={{ color: '#94A3B8' }} />
          <div>
            <span style={{ fontWeight: 600, color: '#334155' }}>{e}</span>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {r.is_owner && <Tag color="purple" style={{ fontSize: '10px', borderRadius: '4px' }}>OWNER</Tag>}
              {!r.is_active && <Tag color="red" style={{ fontSize: '10px', borderRadius: '4px' }}>DISABLED</Tag>}
            </div>
          </div>
        </div>
      )
    },
    { title: 'User Full Name', dataIndex: 'full_name', key: 'full_name', render: (n: string) => n || <Text type="secondary" style={{ fontStyle: 'italic' }}>—</Text> },
    {
      title: 'Status',
      dataIndex: 'is_verified',
      key: 'is_verified',
      render: (v: boolean) => (
        <Tag color={v ? 'success' : 'default'} style={{ fontWeight: 600, borderRadius: '4px' }}>
          {v ? 'VERIFIED' : 'PENDING'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: AdminUser) => (
        <Space size="middle">
          <Button size="small" onClick={() => handleResetPw(r)} style={{ borderRadius: '6px' }}>Share Reset Link</Button>
          {!r.is_staff && (
            <Popconfirm
              title={r.is_active ? 'Disable user access?' : 'Restore user access?'}
              description={r.is_active ? 'This user will be locked out of the company portal.' : 'This will grant workspace access back.'}
              onConfirm={() => act(r.is_active ? 'User account suspended' : 'User account enabled', () => setUserActive(r.id, !r.is_active))}
              okText="Confirm"
              cancelText="Cancel"
            >
              <Button size="small" danger={r.is_active} style={{ borderRadius: '6px' }}>
                {r.is_active ? 'Suspend User' : 'Enable User'}
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    },
  ];

  const invoiceColumns = [
    { title: 'Invoice Number', dataIndex: 'number', key: 'number', render: (n: string) => <span style={{ fontWeight: 600 }}>{n || '—'}</span> },
    { title: 'Billing Period', key: 'period', render: (_: unknown, r: AdminInvoice) => <span style={{ fontSize: '12px' }}>{r.period_start} &rarr; {r.period_end}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: string) => <span style={{ fontWeight: 500 }}>{inr(a)}</span> },
    {
      title: 'Invoice Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] ?? 'default'} style={{ borderRadius: '4px', fontWeight: 600 }}>
          {s}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: AdminInvoice) => (
        <Space size="middle">
          {r.status === 'OPEN' && (
            <Button size="small" type="primary" onClick={() => act('Invoice marked PAID', () => invoiceAction(r.id, 'mark-paid'))} style={{ borderRadius: '6px' }}>
              Mark Paid
            </Button>
          )}
          {r.status !== 'VOID' && (
            <Popconfirm
              title="Void Invoice?"
              description="This voids the billing item permanently. Continue?"
              onConfirm={() => act('Invoice voided', () => invoiceAction(r.id, 'void'))}
              okText="Void"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger type="dashed" style={{ borderRadius: '6px' }}>Void</Button>
            </Popconfirm>
          )}
        </Space>
      )
    },
  ];

  // Calculate onboarding progress percentage
  const getOnboardingProgress = () => {
    if (!usage?.onboarding) return 0;
    const steps = Object.values(usage.onboarding);
    const completed = steps.filter(Boolean).length;
    return Math.round((completed / steps.length) * 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back to directory */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/superadmin')} style={{ borderRadius: '8px' }}>
          Back to Directory
        </Button>
      </div>

      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Querying workspace telemetry..." />
        </div>
      ) : !data ? (
        <Card bordered={false} style={{ borderRadius: '16px' }}>
          <Empty description="Workspace detail not found" />
        </Card>
      ) : (
        <>
          {/* Header Panel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{data.name}</h2>
                <Tag color={data.is_active ? 'success' : 'error'} style={{ fontWeight: 600, borderRadius: '4px' }}>
                  {data.is_active ? 'OPERATIONAL' : 'SUSPENDED'}
                </Tag>
                {sub && (
                  <Tag color={STATUS_COLOR[sub.status] ?? 'default'} style={{ fontWeight: 600, borderRadius: '4px' }}>
                    {sub.status}
                  </Tag>
                )}
              </div>
              <div style={{ color: '#64748B', fontSize: '14px', marginTop: '6px' }}>
                Active Domain Schema: <code>{data.schema_name}</code> &bull; Billing Email: <strong>{data.billing_email}</strong>
              </div>
            </div>
            <Space size="middle">
              <Button type="primary" icon={<LoginOutlined />} onClick={handleImpersonationConfirm} style={{ borderRadius: '8px', background: '#FF6D00', borderColor: '#FF6D00', fontWeight: 600 }}>
                Impersonate Admin
              </Button>
              <Popconfirm
                title={data.is_active ? 'Archive & suspend company access?' : 'Restore company access?'}
                description={data.is_active ? 'This locks all workspace tenants immediately.' : 'Restores active user endpoints.'}
                onConfirm={() => act(data.is_active ? 'Company archived' : 'Company restored', () => setCompanyActive(schema, !data.is_active))}
                okText="Yes"
                cancelText="No"
              >
                <Button danger={data.is_active} style={{ borderRadius: '8px' }}>
                  {data.is_active ? 'Archive Tenant' : 'Restore Tenant'}
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Permanently Drop Company Data?"
                description="Warning: This drops the schema database. This cannot be undone."
                okText="Delete Database"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => act('Company deleted', async () => { await deleteCompany(schema); navigate('/superadmin'); })}
              >
                <Button danger icon={<DeleteOutlined />} style={{ borderRadius: '8px' }}>Delete</Button>
              </Popconfirm>
            </Space>
          </div>

          {/* Main Workspace content tab sets */}
          <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '16px 20px 24px' }}>
            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview',
                  label: 'Workspace Overview',
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <Row gutter={[20, 20]}>
                        {/* Summary details */}
                        <Col xs={24} lg={12}>
                          <Card bordered={false} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '100%' }} title={<span style={{ fontWeight: 700 }}>Telemetry Profile</span>}>
                            <Descriptions column={1} size="small" bordered style={{ background: '#FFF' }}>
                              <Descriptions.Item label="Subdomain schema">{data.schema_name}</Descriptions.Item>
                              <Descriptions.Item label="Created timestamp">{new Date(data.created_on).toLocaleString()}</Descriptions.Item>
                              <Descriptions.Item label="Active domain bindings">{data.domains.join(', ') || '—'}</Descriptions.Item>
                              <Descriptions.Item label="Current Plan">{sub?.plan_name ?? 'None'}</Descriptions.Item>
                              <Descriptions.Item label="Billing cycle duration">{sub ? `${sub.current_period_start ?? '—'} to ${sub.current_period_end ?? '—'}` : '—'}</Descriptions.Item>
                            </Descriptions>
                          </Card>
                        </Col>

                        {/* Onboarding Checklist Widget */}
                        <Col xs={24} lg={12}>
                          <Card bordered={false} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '100%' }} title={<span style={{ fontWeight: 700 }}>Client Onboarding Progress</span>}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                              <Progress type="circle" percent={getOnboardingProgress()} size={70} strokeColor="#FF6D00" />
                              <div>
                                <span style={{ fontWeight: 700, fontSize: '15px' }}>Onboarding Checklist Status</span>
                                <div style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>Measures configuration steps set up by the client.</div>
                              </div>
                            </div>
                            
                            {usage?.onboarding && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                  { k: 'has_subscription', label: 'Subscription Created' },
                                  { k: 'subscription_active', label: 'Payment Verified' },
                                  { k: 'fin_seeded', label: 'Ledger Seed Data Created' },
                                  { k: 'has_first_invoice', label: 'First Customer Invoice Sent' },
                                  { k: 'hr_provisioned', label: 'HR Workspace Activated' },
                                ].map(step => {
                                  const ok = (usage.onboarding as any)[step.k];
                                  return (
                                    <div key={step.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#FFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{step.label}</span>
                                      {ok ? (
                                        <Tag color="success" icon={<CheckCircleFilled />} style={{ margin: 0, borderRadius: '4px' }}>COMPLETE</Tag>
                                      ) : (
                                        <Tag color="default" icon={<CloseCircleOutlined />} style={{ margin: 0, borderRadius: '4px' }}>PENDING</Tag>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </Card>
                        </Col>
                      </Row>

                      {/* Usage details */}
                      {usage && (
                        <Card bordered={false} style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }} title={<span style={{ fontWeight: 700 }}>Usage Indicators</span>}>
                          <Row gutter={[16, 16]}>
                            {[
                              ['SaaS Invoices', usage.fin.invoices, <FileTextOutlined style={{ fontSize: '20px', color: '#FF6D00' }} />],
                              ['Contacts / Parties', usage.fin.parties, <UserOutlined style={{ fontSize: '20px', color: '#10B981' }} />],
                              ['Item Catalogs', usage.fin.items, <SettingOutlined style={{ fontSize: '20px', color: '#6366F1' }} />],
                              ['Journal Ledger Entries', usage.fin.journal_entries, <BookOutlinedReplacement style={{ fontSize: '20px', color: '#8B5CF6' }} />],
                              ['HR Headcount Count', usage.hr.headcount ?? '—', <UsergroupAddOutlinedReplacement style={{ fontSize: '20px', color: '#EC4899' }} />]
                            ].map(([label, value, icon]) => (
                              <Col xs={12} md={4} key={label as string}>
                                <Card bordered={false} style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '8px', textAlign: 'center' }} bodyStyle={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{icon}</div>
                                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{value}</div>
                                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', marginTop: '4px', fontWeight: 600 }}>{label as string}</div>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </Card>
                      )}

                      {/* License module settings */}
                      <Card bordered={false} style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }} title={<span style={{ fontWeight: 700 }}>Licensed Product Modules</span>}>
                        <p style={{ color: '#64748B', fontSize: '13px', marginTop: '-8px', marginBottom: '16px' }}>Configure modules active for client staff. This overrides default plan entitlements.</p>
                        {sub && sub.entitlements.length ? (
                          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            {sub.entitlements.map(e => {
                              const label = e.product === 'FIN' ? 'Accounting Ledger' : 'HRM Portal';
                              return (
                                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', minWidth: '220px' }}>
                                  <Switch
                                    checked={e.is_active}
                                    disabled={busy}
                                    onChange={() => handleEntitlementChange(e.product, e.is_active)}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{label}</div>
                                    <div style={{ marginTop: '2px' }}>
                                      <Tag color={STATUS_COLOR[e.status] ?? 'default'} style={{ fontSize: '10px', margin: 0, borderRadius: '4px' }}>
                                        {e.status}
                                      </Tag>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <Empty description="No active subscription entitlements" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                      </Card>
                    </div>
                  ),
                },
                {
                  key: 'users',
                  label: `Client Users (${data.users.length})`,
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserOpen(true)} style={{ borderRadius: '6px', background: '#FF6D00', borderColor: '#FF6D00' }}>
                          Add Portal User
                        </Button>
                      </div>
                      <Table
                        rowKey="id"
                        size="middle"
                        columns={userColumns as never}
                        dataSource={data.users}
                        pagination={false}
                        locale={{ emptyText: <Empty description="No users linked to this company workspace" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'billing',
                  label: `SaaS Invoices (${data.invoices.length})`,
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => act('Subscription invoice generated', () => generateCompanyInvoice(schema))} disabled={!sub} style={{ borderRadius: '6px' }}>
                          Generate Manual Billing Invoice
                        </Button>
                      </div>
                      <Table
                        rowKey="id"
                        size="middle"
                        columns={invoiceColumns as never}
                        dataSource={data.invoices}
                        pagination={{ pageSize: 8 }}
                        locale={{ emptyText: <Empty description="No historic invoices logged" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'activity',
                  label: `Audits & Actions (${activity.length})`,
                  children: (
                    <Table
                      rowKey={(r: ActivityRow) => `${r.source}-${r.at}-${r.action}`}
                      size="small"
                      columns={[
                        { title: 'When', dataIndex: 'at', key: 'at', render: (d: string) => <span style={{ color: '#64748B' }}>{new Date(d).toLocaleString()}</span> },
                        { title: 'Source', dataIndex: 'source', key: 'source', render: (s: string) => <Tag color={s === 'console' ? 'blue' : 'purple'} style={{ borderRadius: '4px' }}>{s}</Tag> },
                        { title: 'Actor Email', dataIndex: 'actor', key: 'actor', render: (a: string) => <span style={{ fontWeight: 600 }}>{a}</span> },
                        { title: 'Action Name', dataIndex: 'action', key: 'action', render: (a: string) => <Tag style={{ borderRadius: '4px' }}>{a}</Tag> },
                        { title: 'Payload Detail', dataIndex: 'detail', key: 'detail', render: (d: object) => <Text code style={{ fontSize: '11px' }}>{JSON.stringify(d)}</Text> },
                      ] as never}
                      dataSource={activity}
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: <Empty description="No client audit actions recorded" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                  ),
                },
                {
                  key: 'notes',
                  label: `Internal Admin Notes (${notes.length})`,
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '8px 4px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <Input.TextArea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Type internal workspace notes (billing records, tickets, manual exceptions)…"
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          style={{ borderRadius: '8px' }}
                        />
                        <Button type="primary" icon={<MessageOutlined />} onClick={submitNote} style={{ height: 'auto', borderRadius: '8px', background: '#FF6D00', borderColor: '#FF6D00' }}>
                          Add Note
                        </Button>
                      </div>

                      {notes.length ? (
                        <div style={{ padding: '16px 20px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <Timeline
                            mode="left"
                            items={notes.map(n => ({
                              label: (
                                <span style={{ color: '#94A3B8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                  <CalendarOutlined /> {new Date(n.at).toLocaleString()}
                                </span>
                              ),
                              color: '#FF6D00',
                              children: (
                                <div style={{ background: '#FFF', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '-4px' }}>
                                  <div style={{ fontWeight: 700, color: '#334155', fontSize: '13px' }}>{n.author}</div>
                                  <div style={{ color: '#475569', fontSize: '13px', marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{n.body}</div>
                                </div>
                              )
                            }))}
                          />
                        </div>
                      ) : (
                        <Empty description="No internal staff notes created yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}

      {/* Add Client User Modal */}
      <Modal
        title="Add Company Workspace User"
        open={addUserOpen}
        onOk={submitAddUser}
        confirmLoading={busy}
        onCancel={() => {
          setAddUserOpen(false);
          form.resetFields();
        }}
        okText="Create User"
        cancelText="Cancel"
        okButtonProps={{ style: { background: '#FF6D00', borderColor: '#FF6D00', borderRadius: '6px' } }}
        cancelButtonProps={{ style: { borderRadius: '6px' } }}
        width={420}
      >
        <Form form={form} layout="vertical" style={{ paddingTop: '8px' }}>
          <Form.Item name="email" label="User Email Address" rules={[{ required: true, type: 'email', message: 'Enter valid email address' }]}>
            <Input placeholder="e.g. employee@company.com" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="full_name" label="Display Name">
            <Input placeholder="e.g. John Miller (Optional)" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="make_owner" valuePropName="checked">
            <Checkbox>Promote to Billing Owner</Checkbox>
          </Form.Item>
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#64748B', border: '1px solid #E2E8F0', marginTop: '12px' }}>
            No password is required. An activation link will be generated for the user to select their password.
          </div>
        </Form>
      </Modal>
    </div>
  );
}

// Inline replacements for missing icons if any
function BookOutlinedReplacement(props: any) {
  return <FileTextOutlined {...props} />;
}
function UsergroupAddOutlinedReplacement(props: any) {
  return <UserOutlined {...props} />;
}
