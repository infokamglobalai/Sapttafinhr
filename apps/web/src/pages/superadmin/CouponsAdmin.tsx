import { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Modal, Form, Input, InputNumber, Switch, message, Space, Select,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchAdminCoupons, createAdminCoupon, updateAdminCoupon, deactivateAdminCoupon,
  fetchAdminCouponDetail, type AdminCoupon,
} from '../../lib/api';

const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

export default function CouponsAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setCoupons(await fetchAdminCoupons()); }
    catch { message.error('Failed to load coupons.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      discount_type: 'percent',
      discount_value: 50,
      is_active: true,
      first_time_only: false,
      applies_to_plans: [],
      applies_to_cycles: [],
    });
    setOpen(true);
  };

  const openEdit = (c: AdminCoupon) => {
    setEditing(c);
    form.setFieldsValue({ ...c });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      code: editing ? editing.code : v.code,
      valid_from: v.valid_from || null,
      valid_until: v.valid_until || null,
    };
    setBusy(true);
    try {
      if (editing) await updateAdminCoupon(editing.id, payload);
      else await createAdminCoupon(payload);
      message.success(editing ? 'Coupon updated' : 'Coupon created');
      setOpen(false);
      await load();
    } catch (e) { message.error((e as Error)?.message || 'Failed.'); }
    finally { setBusy(false); }
  };

  const deactivate = async (c: AdminCoupon) => {
    try {
      await deactivateAdminCoupon(c.id);
      message.success('Coupon deactivated');
      await load();
    } catch (e) { message.error((e as Error)?.message || 'Failed.'); }
  };

  const showRedemptions = async (c: AdminCoupon) => {
    try {
      const detail = await fetchAdminCouponDetail(c.id);
      Modal.info({
        title: `Redemptions — ${c.code}`,
        width: 720,
        content: detail.redemptions.length ? (
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={detail.redemptions}
            columns={[
              { title: 'Workspace', dataIndex: 'tenant__schema_name' },
              { title: 'Plan', dataIndex: 'plan_code' },
              { title: 'Discount', render: (_: unknown, r) => inr(r.discount_amount) },
              { title: 'Final', render: (_: unknown, r) => inr(r.final_amount) },
              { title: 'By', dataIndex: 'redeemed_by_email' },
            ]}
          />
        ) : <p>No redemptions yet.</p>,
      });
    } catch { message.error('Could not load redemptions.'); }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => <code style={{ fontWeight: 700 }}>{c}</code> },
    { title: 'Discount', key: 'discount', render: (_: unknown, r: AdminCoupon) =>
      r.discount_type === 'percent' ? `${r.discount_value}%` : inr(r.discount_value) },
    { title: 'Used', key: 'used', render: (_: unknown, r: AdminCoupon) =>
      `${r.redemptions_used}${r.max_redemptions != null ? ` / ${r.max_redemptions}` : ''}` },
    { title: 'Plans', key: 'plans', render: (_: unknown, r: AdminCoupon) =>
      r.applies_to_plans?.length ? r.applies_to_plans.join(', ') : <span style={{ color: '#94a3b8' }}>All</span> },
    { title: 'Status', dataIndex: 'is_active', key: 'active', render: (a: boolean) => a ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag> },
    { title: 'Actions', key: 'actions', render: (_: unknown, c: AdminCoupon) => (
      <Space>
        <Button size="small" onClick={() => openEdit(c)}>Edit</Button>
        <Button size="small" onClick={() => showRedemptions(c)}>History</Button>
        {c.is_active && <Button size="small" danger onClick={() => deactivate(c)}>Deactivate</Button>}
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
        <Card title="Coupon Codes" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New coupon</Button>}
          style={{ borderRadius: 16 }} styles={{ header: { fontWeight: 700 } }}>
          <p style={{ color: 'rgba(10,17,40,0.5)', fontSize: 13, marginBottom: 16 }}>
            Create promo codes for checkout. Use <code>DEMO100</code> (100% off) for demos without Razorpay.
          </p>
          <Table rowKey="id" columns={columns as never} dataSource={coupons} loading={loading} pagination={false} />
        </Card>
      </main>

      <Modal title={editing ? 'Edit coupon' : 'New coupon'} open={open} onOk={submit} confirmLoading={busy}
        onCancel={() => setOpen(false)} okText="Save" width={560}>
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input placeholder="e.g. LAUNCH50" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          )}
          <Form.Item name="description" label="Description"><Input placeholder="Launch promo" /></Form.Item>
          <Space>
            <Form.Item name="discount_type" label="Type" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={[
                { value: 'percent', label: 'Percentage' },
                { value: 'fixed_inr', label: 'Fixed INR' },
              ]} />
            </Form.Item>
            <Form.Item name="discount_value" label="Value" rules={[{ required: true }]}>
              <InputNumber min={0} max={100000} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="applies_to_plans" label="Plans (empty = all)">
            <Select mode="tags" placeholder="saptta-hr, saptta-complete" />
          </Form.Item>
          <Form.Item name="applies_to_cycles" label="Billing cycles (empty = both)">
            <Select mode="multiple" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
          </Form.Item>
          <Space>
            <Form.Item name="max_redemptions" label="Max redemptions"><InputNumber min={1} placeholder="Unlimited" /></Form.Item>
            <Form.Item name="valid_from" label="Valid from (YYYY-MM-DD)"><Input placeholder="2026-01-01" /></Form.Item>
            <Form.Item name="valid_until" label="Valid until"><Input placeholder="2026-12-31" /></Form.Item>
          </Space>
          <Form.Item name="first_time_only" label="First-time customers only" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
