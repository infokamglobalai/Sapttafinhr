import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Tabs, Descriptions, Popconfirm, Modal, Form, Input,
  Checkbox, message, Spin, Space, Switch, Typography,
} from 'antd';
import {
  ArrowLeftOutlined, LoginOutlined, ReloadOutlined, PlusOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchAdminCompanyDetail, createCompanyUser, resetUserPassword, setUserActive,
  setCompanyActive, deleteCompany, generateCompanyInvoice, invoiceAction,
  toggleEntitlement, startImpersonation, fetchAdminActivity,
  fetchCompanyUsage, fetchCompanyNotes, addCompanyNote,
  type AdminCompanyDetail, type AdminUser, type AdminInvoice, type AdminEntitlement, type ActivityRow,
  type CompanyUsage, type TenantNote,
} from '../../lib/api';

const { Text } = Typography;
const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green', TRIAL: 'blue', PENDING: 'orange', PAST_DUE: 'volcano', CANCELLED: 'red',
  PAID: 'green', OPEN: 'orange', VOID: 'default', SUSPENDED: 'red',
};

export default function CompanyDetail() {
  const { schema = '' } = useParams();
  const { user, logout } = useAuth();
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
      setData(d); setActivity(act); setUsage(u); setNotes(nt);
    }
    catch { message.error('Failed to load company.'); }
    finally { setLoading(false); }
  }, [schema]);

  useEffect(() => { load(); }, [load]);

  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); message.success(label); await load(); }
    catch (e) { message.error((e as Error)?.message || 'Action failed.'); }
    finally { setBusy(false); }
  };

  const sub = data?.subscription;

  const handleImpersonate = async () => {
    try { await startImpersonation(schema); }
    catch (e) { message.error((e as Error)?.message || 'Could not open workspace.'); }
  };

  const handleResetPw = async (u: AdminUser) => {
    try {
      const r = await resetUserPassword(u.id);
      Modal.success({
        title: 'Password reset link',
        content: (
          <div>
            <p>{r.emailed ? 'A reset email was sent. ' : ''}Share this link with {u.email}:</p>
            <Input.TextArea readOnly value={r.reset_link} autoSize />
          </div>
        ),
      });
    } catch (e) { message.error((e as Error)?.message || 'Failed.'); }
  };

  const submitAddUser = async () => {
    const v = await form.validateFields();
    setBusy(true);
    try {
      const u = await createCompanyUser(schema, v);
      setAddUserOpen(false); form.resetFields();
      if (u.reset_link) {
        Modal.success({
          title: 'User created',
          content: (
            <div>
              <p>Send {u.email} this link to set their password:</p>
              <Input.TextArea readOnly value={u.reset_link} autoSize />
            </div>
          ),
        });
      } else { message.success('User created.'); }
      await load();
    } catch (e) { message.error((e as Error)?.message || 'Failed.'); }
    finally { setBusy(false); }
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    try { await addCompanyNote(schema, noteText.trim()); setNoteText(''); message.success('Note added'); await load(); }
    catch (e) { message.error((e as Error)?.message || 'Failed.'); }
  };

  const userColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email',
      render: (e: string, r: AdminUser) => (
        <span>{e} {r.is_owner && <Tag color="purple">Owner</Tag>}{!r.is_active && <Tag color="red">Disabled</Tag>}</span>
      ) },
    { title: 'Name', dataIndex: 'full_name', key: 'full_name', render: (n: string) => n || <Text type="secondary">—</Text> },
    { title: 'Verified', dataIndex: 'is_verified', key: 'is_verified', render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
    { title: 'Actions', key: 'actions', render: (_: unknown, r: AdminUser) => (
      <Space>
        <Button size="small" onClick={() => handleResetPw(r)}>Reset password</Button>
        {!r.is_staff && (
          <Popconfirm title={r.is_active ? 'Disable this user?' : 'Enable this user?'}
            onConfirm={() => act(r.is_active ? 'User disabled' : 'User enabled', () => setUserActive(r.id, !r.is_active))}>
            <Button size="small" danger={r.is_active}>{r.is_active ? 'Disable' : 'Enable'}</Button>
          </Popconfirm>
        )}
      </Space>
    ) },
  ];

  const invoiceColumns = [
    { title: 'Invoice #', dataIndex: 'number', key: 'number', render: (n: string) => n || '—' },
    { title: 'Period', key: 'period', render: (_: unknown, r: AdminInvoice) => <span style={{ fontSize: 12 }}>{r.period_start} → {r.period_end}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: string) => inr(a) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag> },
    { title: 'Actions', key: 'actions', render: (_: unknown, r: AdminInvoice) => (
      <Space>
        {r.status === 'OPEN' && <Button size="small" type="primary" onClick={() => act('Marked paid', () => invoiceAction(r.id, 'mark-paid'))}>Mark paid</Button>}
        {r.status !== 'VOID' && <Popconfirm title="Void this invoice?" onConfirm={() => act('Invoice voided', () => invoiceAction(r.id, 'void'))}><Button size="small" danger>Void</Button></Popconfirm>}
      </Space>
    ) },
  ];

  const entToggle = (e: AdminEntitlement) => (
    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Switch checked={e.is_active} disabled={busy || !sub}
        onChange={(on) => act(`${e.product_slug} ${on ? 'enabled' : 'disabled'}`,
          () => toggleEntitlement(sub!.id, e.product, on))} />
      <span>{e.product === 'FIN' ? 'Accounting' : 'HRM'}</span>
      <Tag color={STATUS_COLOR[e.status] ?? 'default'}>{e.status}</Tag>
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#FAFAFC' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', background: '#fff', borderBottom: '1px solid rgba(10,17,40,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/superadmin"><SapttaLogo /></Link>
          <Tag color="purple" style={{ fontWeight: 700 }}>SUPER ADMIN</Tag>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <span style={{ fontSize: 13, color: 'rgba(10,17,40,0.5)' }}>{user?.email}</span>
          <Button onClick={() => { logout(); navigate('/'); }}>Sign Out</Button>
        </Space>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/superadmin')} style={{ paddingLeft: 0 }}>Back to overview</Button>

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : !data ? (
          <Card>Company not found.</Card>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{data.name}</h1>
                <div style={{ color: 'rgba(10,17,40,0.5)' }}>{data.billing_email}</div>
                <div style={{ marginTop: 8 }}>
                  <Tag color={data.is_active ? 'green' : 'red'}>{data.is_active ? 'Active' : 'Archived'}</Tag>
                  {sub && <Tag color={STATUS_COLOR[sub.status] ?? 'default'}>{sub.status}</Tag>}
                  {sub && <Tag>{sub.plan_name}</Tag>}
                </div>
              </div>
              <Space>
                <Button type="primary" icon={<LoginOutlined />} onClick={handleImpersonate}>Open as admin</Button>
                <Popconfirm title={data.is_active ? 'Archive (suspend) this company?' : 'Restore this company?'}
                  onConfirm={() => act(data.is_active ? 'Company archived' : 'Company restored', () => setCompanyActive(schema, !data.is_active))}>
                  <Button danger={data.is_active}>{data.is_active ? 'Archive' : 'Restore'}</Button>
                </Popconfirm>
                <Popconfirm title="Permanently delete this company and drop its data? This cannot be undone."
                  okText="Delete" okButtonProps={{ danger: true }}
                  onConfirm={() => act('Company deleted', async () => { await deleteCompany(schema); navigate('/superadmin'); })}>
                  <Button danger>Delete</Button>
                </Popconfirm>
              </Space>
            </div>

            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview', label: 'Overview',
                  children: (
                    <Card>
                      <Descriptions column={2} size="small" bordered>
                        <Descriptions.Item label="Workspace">{data.schema_name}</Descriptions.Item>
                        <Descriptions.Item label="Created">{String(data.created_on).slice(0, 10)}</Descriptions.Item>
                        <Descriptions.Item label="Domains" span={2}>{data.domains.join(', ') || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Plan">{sub?.plan_name ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Period">{sub ? `${sub.current_period_start ?? '—'} → ${sub.current_period_end ?? '—'}` : '—'}</Descriptions.Item>
                      </Descriptions>
                      <div style={{ marginTop: 20 }}>
                        <h3 style={{ fontWeight: 700 }}>Module access</h3>
                        {sub && sub.entitlements.length ? sub.entitlements.map(entToggle)
                          : <Text type="secondary">No subscription / entitlements.</Text>}
                      </div>
                      {usage && (
                        <div style={{ marginTop: 20 }}>
                          <h3 style={{ fontWeight: 700 }}>Usage</h3>
                          <Space size="large" wrap>
                            {[
                              ['Invoices', usage.fin.invoices], ['Parties', usage.fin.parties],
                              ['Items', usage.fin.items], ['Journal entries', usage.fin.journal_entries],
                              ['HR headcount', usage.hr.headcount ?? '—'],
                            ].map(([l, v]) => (
                              <div key={l as string}>
                                <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
                                <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)' }}>{l as string}</div>
                              </div>
                            ))}
                          </Space>
                          <div style={{ marginTop: 14 }}>
                            <h3 style={{ fontWeight: 700 }}>Onboarding</h3>
                            {Object.entries(usage.onboarding).map(([k, v]) => (
                              <Tag key={k} color={v ? 'green' : 'default'}>{k.replace(/_/g, ' ')}</Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ),
                },
                {
                  key: 'users', label: `Users (${data.users.length})`,
                  children: (
                    <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserOpen(true)}>Add user</Button>}>
                      <Table rowKey="id" size="middle" columns={userColumns as never} dataSource={data.users}
                        pagination={false} locale={{ emptyText: 'No platform users linked to this company.' }} />
                    </Card>
                  ),
                },
                {
                  key: 'billing', label: `Billing (${data.invoices.length})`,
                  children: (
                    <Card extra={<Button onClick={() => act('Invoice generated', () => generateCompanyInvoice(schema))} disabled={!sub}>Generate invoice</Button>}>
                      <Table rowKey="id" size="middle" columns={invoiceColumns as never} dataSource={data.invoices}
                        pagination={{ pageSize: 8 }} locale={{ emptyText: 'No invoices yet.' }} />
                    </Card>
                  ),
                },
                {
                  key: 'activity', label: `Activity (${activity.length})`,
                  children: (
                    <Card>
                      <Table rowKey={(r: ActivityRow) => `${r.source}-${r.at}-${r.action}`} size="small"
                        columns={[
                          { title: 'When', dataIndex: 'at', key: 'at', render: (d: string) => new Date(d).toLocaleString() },
                          { title: 'Source', dataIndex: 'source', key: 'source', render: (s: string) => <Tag color={s === 'console' ? 'blue' : 'purple'}>{s}</Tag> },
                          { title: 'Actor', dataIndex: 'actor', key: 'actor' },
                          { title: 'Action', dataIndex: 'action', key: 'action', render: (a: string) => <Tag>{a}</Tag> },
                          { title: 'Detail', dataIndex: 'detail', key: 'detail', render: (d: object) => <Text code style={{ fontSize: 11 }}>{JSON.stringify(d)}</Text> },
                        ] as never}
                        dataSource={activity} pagination={{ pageSize: 10 }}
                        locale={{ emptyText: 'No recorded actions.' }} />
                    </Card>
                  ),
                },
                {
                  key: 'notes', label: `Notes (${notes.length})`,
                  children: (
                    <Card>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <Input.TextArea value={noteText} onChange={e => setNoteText(e.target.value)}
                          placeholder="Add an internal note about this company…" autoSize={{ minRows: 1, maxRows: 4 }} />
                        <Button type="primary" onClick={submitNote}>Add</Button>
                      </div>
                      <Table rowKey="id" size="small"
                        columns={[
                          { title: 'When', dataIndex: 'at', key: 'at', width: 180, render: (d: string) => new Date(d).toLocaleString() },
                          { title: 'Author', dataIndex: 'author', key: 'author' },
                          { title: 'Note', dataIndex: 'body', key: 'body' },
                        ] as never}
                        dataSource={notes} pagination={false} locale={{ emptyText: 'No notes yet.' }} />
                    </Card>
                  ),
                },
              ]}
            />
          </>
        )}
      </main>

      <Modal title="Add platform user" open={addUserOpen} onOk={submitAddUser} confirmLoading={busy}
        onCancel={() => { setAddUserOpen(false); form.resetFields(); }} okText="Create">
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="user@company.com" />
          </Form.Item>
          <Form.Item name="full_name" label="Full name">
            <Input placeholder="Optional" />
          </Form.Item>
          <Form.Item name="make_owner" valuePropName="checked">
            <Checkbox>Make this the billing owner</Checkbox>
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>No password is set — a reset link is generated to share with the user.</Text>
        </Form>
      </Modal>
    </div>
  );
}
