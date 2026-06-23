import { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Modal, Form, Input, InputNumber, Switch, message, Space,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchAdminPlansFull, createPlan, updatePlan, deletePlan, type AdminPlanFull,
} from '../../lib/api';

const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

export default function PlansAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<AdminPlanFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminPlanFull | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setPlans(await fetchAdminPlansFull()); }
    catch { message.error('Failed to load plans.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ is_active: true, monthly_price: 0, annual_price: 0, features: '{}' }); setOpen(true); };
  const openEdit = (p: AdminPlanFull) => { setEditing(p); form.setFieldsValue({ ...p, features: JSON.stringify(p.features ?? {}, null, 2) }); setOpen(true); };

  const submit = async () => {
    const v = await form.validateFields();
    let features: Record<string, unknown> = {};
    try { features = v.features ? JSON.parse(v.features) : {}; }
    catch { message.error('Feature flags must be valid JSON.'); return; }
    const payload = { ...v, features };
    setBusy(true);
    try {
      if (editing) await updatePlan(editing.id, payload);
      else await createPlan(payload);
      message.success(editing ? 'Plan updated' : 'Plan created');
      setOpen(false); await load();
    } catch (e) { message.error((e as Error)?.message || 'Failed.'); }
    finally { setBusy(false); }
  };

  const remove = async (p: AdminPlanFull) => {
    try { await deletePlan(p.id); message.success('Plan removed/retired'); await load(); }
    catch (e) { message.error((e as Error)?.message || 'Failed.'); }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => <code>{c}</code> },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Monthly', dataIndex: 'monthly_price', key: 'monthly_price', render: (v: string) => inr(v) },
    { title: 'Annual', dataIndex: 'annual_price', key: 'annual_price', render: (v: string) => inr(v) },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (a: boolean) => a ? <Tag color="green">Active</Tag> : <Tag>Retired</Tag> },
    { title: 'Actions', key: 'actions', render: (_: unknown, p: AdminPlanFull) => (
      <Space>
        <Button size="small" onClick={() => openEdit(p)}>Edit</Button>
        <Button size="small" danger onClick={() => remove(p)}>Retire</Button>
      </Space>
    ) },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#FAFAFC' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', background: '#fff', borderBottom: '1px solid rgba(10,17,40,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/superadmin"><SapttaLogo /></Link>
          <Tag color="purple" style={{ fontWeight: 700 }}>SUPER ADMIN</Tag>
        </div>
        <Space>
          <span style={{ fontSize: 13, color: 'rgba(10,17,40,0.5)' }}>{user?.email}</span>
          <Button onClick={() => { logout(); navigate('/'); }}>Sign Out</Button>
        </Space>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '24px' }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/superadmin')} style={{ paddingLeft: 0 }}>Back to overview</Button>
        <Card title="Pricing Plans" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New plan</Button>}
          style={{ borderRadius: 16 }} styles={{ header: { fontWeight: 700 } }}>
          <Table rowKey="id" columns={columns as never} dataSource={plans} loading={loading} pagination={false} />
        </Card>
      </main>

      <Modal title={editing ? 'Edit plan' : 'New plan'} open={open} onOk={submit} confirmLoading={busy}
        onCancel={() => setOpen(false)} okText="Save">
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. finance-pro" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input /></Form.Item>
          <Space>
            <Form.Item name="monthly_price" label="Monthly (₹)"><InputNumber min={0} /></Form.Item>
            <Form.Item name="annual_price" label="Annual (₹)"><InputNumber min={0} /></Form.Item>
          </Space>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="features" label="Feature flags (JSON)"
            tooltip='Per-plan toggles read by the products, e.g. {"einvoice": true, "max_users": 5}'>
            <Input.TextArea rows={4} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
