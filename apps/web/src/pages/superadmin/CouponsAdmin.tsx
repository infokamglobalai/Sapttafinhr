import { useEffect, useState } from 'react';
import {
  Button, Card, Table, Tag, Modal, Form, Input, InputNumber, Switch, message, Space, Select, Empty, Popconfirm, Row, Col
} from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  fetchAdminCoupons, createAdminCoupon, updateAdminCoupon, deactivateAdminCoupon,
  fetchAdminCouponDetail, type AdminCoupon
} from '../../lib/api';

const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

export default function CouponsAdmin() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setCoupons(await fetchAdminCoupons());
    } catch {
      message.error('Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    } catch (e) {
      message.error((e as Error)?.message || 'Failed to save coupon.');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (c: AdminCoupon) => {
    try {
      await deactivateAdminCoupon(c.id);
      message.success('Coupon deactivated');
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Failed.');
    }
  };

  const showRedemptions = async (c: AdminCoupon) => {
    try {
      const detail = await fetchAdminCouponDetail(c.id);
      Modal.info({
        title: `Redemptions History — ${c.code}`,
        width: 720,
        content: detail.redemptions.length ? (
          <div style={{ marginTop: '16px' }}>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={detail.redemptions}
              columns={[
                { title: 'Workspace Schema', dataIndex: 'tenant__schema_name', render: (s: string) => <span style={{ fontWeight: 600 }}>{s}</span> },
                { title: 'Subscribed Plan', dataIndex: 'plan_code' },
                { title: 'Discount Deducted', render: (_: unknown, r) => inr(r.discount_amount) },
                { title: 'Paid Amount', render: (_: unknown, r) => <span style={{ fontWeight: 500 }}>{inr(r.final_amount)}</span> },
                { title: 'Redeemed By', dataIndex: 'redeemed_by_email', render: (email: string) => <span style={{ color: '#64748B', fontSize: '12px' }}>{email}</span> },
              ]}
            />
          </div>
        ) : (
          <div style={{ padding: '24px 0' }}><Empty description="No coupon redemptions recorded" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
        ),
        okButtonProps: { style: { borderRadius: '6px' } }
      });
    } catch {
      message.error('Could not load redemptions details.');
    }
  };

  const columns = [
    {
      title: 'Promo Code',
      dataIndex: 'code',
      key: 'code',
      render: (c: string) => <code style={{ fontWeight: 700, color: '#334155', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>{c}</code>
    },
    {
      title: 'Discount Value',
      key: 'discount',
      render: (_: unknown, r: AdminCoupon) => r.discount_type === 'percent' ? (
        <span style={{ fontWeight: 600, color: '#10B981' }}>{r.discount_value}% Off</span>
      ) : (
        <span style={{ fontWeight: 600, color: '#10B981' }}>{inr(r.discount_value)} Off</span>
      )
    },
    {
      title: 'Redemption Stats',
      key: 'used',
      render: (_: unknown, r: AdminCoupon) => (
        <span style={{ fontWeight: 500 }}>
          {r.redemptions_used} used {r.max_redemptions != null ? `/ ${r.max_redemptions} max` : '(Unlimited)'}
        </span>
      )
    },
    {
      title: 'Allowed Plans',
      key: 'plans',
      render: (_: unknown, r: AdminCoupon) => r.applies_to_plans?.length ? (
        <Space size={2}>{r.applies_to_plans.map(p => <Tag key={p} style={{ borderRadius: '4px' }}>{p}</Tag>)}</Space>
      ) : (
        <Tag color="blue" style={{ borderRadius: '4px' }}>All Pricing Plans</Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'active',
      render: (a: boolean) => (
        <Tag color={a ? 'success' : 'default'} style={{ borderRadius: '4px', fontWeight: 600 }}>
          {a ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, c: AdminCoupon) => (
        <Space size="middle">
          <Button size="small" onClick={() => openEdit(c)} style={{ borderRadius: '6px' }}>Edit</Button>
          <Button size="small" icon={<InfoCircleOutlined />} onClick={() => showRedemptions(c)} style={{ borderRadius: '6px' }}>History</Button>
          {c.is_active && (
            <Popconfirm
              title="Deactivate Coupon?"
              description="This blocks new checkouts using this code. Continue?"
              onConfirm={() => deactivate(c)}
            >
              <Button size="small" danger style={{ borderRadius: '6px' }}>Deactivate</Button>
            </Popconfirm>
          )}
        </Space>
      )
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Coupon Codes &amp; Promotions</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0' }}>Create, update, and track redemption audits of promotional discounts used at client signups.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ height: '40px', borderRadius: '8px', background: '#FF6D00', borderColor: '#FF6D00', fontWeight: 600 }}
        >
          New Coupon
        </Button>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
        bodyStyle={{ padding: '16px 20px 24px' }}
      >
        <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', color: '#64748B', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
          Admins can configure active codes for checkout discounts. Use promo code <code>DEMO100</code> (100% off) to simulate trial-activation during demos without processing gateway payments.
        </div>
        <Table
          rowKey="id"
          columns={columns as never}
          dataSource={coupons}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="No promo coupons logged" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* New/edit coupon modal */}
      <Modal
        title={editing ? `Edit Coupon Code: ${editing.code}` : 'Create New Promotional Coupon'}
        open={open}
        onOk={submit}
        confirmLoading={busy}
        onCancel={() => setOpen(false)}
        okText="Save Coupon"
        cancelText="Cancel"
        okButtonProps={{ style: { background: '#FF6D00', borderColor: '#FF6D00', borderRadius: '6px' } }}
        cancelButtonProps={{ style: { borderRadius: '6px' } }}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ paddingTop: '8px' }}>
          {!editing && (
            <Form.Item name="code" label="Coupon Promo Code" rules={[{ required: true, message: 'Please enter a coupon code' }]}>
              <Input placeholder="e.g. SUMMER50" style={{ textTransform: 'uppercase', borderRadius: '6px' }} />
            </Form.Item>
          )}
          <Form.Item name="description" label="Marketing Description" rules={[{ required: true, message: 'Please enter description' }]}>
            <Input placeholder="e.g. 50% discount on initial checkout" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount_type" label="Discount Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'percent', label: 'Percentage (%)' },
                    { value: 'fixed_inr', label: 'Fixed Amount (INR)' },
                  ]}
                  dropdownStyle={{ borderRadius: '8px' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discount_value" label="Discount Value" rules={[{ required: true }]}>
                <InputNumber min={0} max={100000} style={{ width: '100%', borderRadius: '6px' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="applies_to_plans" label="Restrict to Plan Codes (Leave empty for all)">
            <Select mode="tags" placeholder="e.g. saptta-hr, saptta-complete" dropdownStyle={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item name="applies_to_cycles" label="Restrict to Billing Cycles">
            <Select mode="multiple" placeholder="Applies to all cycles" options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} dropdownStyle={{ borderRadius: '8px' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="max_redemptions" label="Max Uses">
                <InputNumber min={1} placeholder="Unlimited" style={{ width: '100%', borderRadius: '6px' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="valid_from" label="Valid From (YYYY-MM-DD)">
                <Input placeholder="e.g. 2026-01-01" style={{ borderRadius: '6px' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="valid_until" label="Valid Until (YYYY-MM-DD)">
                <Input placeholder="e.g. 2026-12-31" style={{ borderRadius: '6px' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
            <Col span={12}>
              <Form.Item name="first_time_only" label="First Checkouts Only" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Coupon Active" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
