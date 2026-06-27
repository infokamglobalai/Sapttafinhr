import { useEffect, useState } from 'react';
import {
  Button, Card, Table, Tag, Modal, Form, Input, InputNumber, Switch, message, Space, Empty, Popconfirm, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  fetchAdminPlansFull, createPlan, updatePlan, deletePlan, type AdminPlanFull
} from '../../lib/api';

const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

export default function PlansAdmin() {
  const [plans, setPlans] = useState<AdminPlanFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminPlanFull | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setPlans(await fetchAdminPlansFull());
    } catch {
      message.error('Failed to load pricing plans.');
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
      is_active: true,
      monthly_price: 0,
      annual_price: 0,
      features: '{}'
    });
    setOpen(true);
  };

  const openEdit = (p: AdminPlanFull) => {
    setEditing(p);
    form.setFieldsValue({
      ...p,
      features: JSON.stringify(p.features ?? {}, null, 2)
    });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    let features: Record<string, unknown> = {};
    try {
      features = v.features ? JSON.parse(v.features) : {};
    } catch {
      message.error('Features config must be a valid JSON object.');
      return;
    }
    const payload = { ...v, features };
    setBusy(true);
    try {
      if (editing) await updatePlan(editing.id, payload);
      else await createPlan(payload);
      message.success(editing ? 'Pricing plan updated' : 'Pricing plan created');
      setOpen(false);
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Failed to save plan.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: AdminPlanFull) => {
    try {
      await deletePlan(p.id);
      message.success('Plan status retired/archived.');
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Failed to retire plan.');
    }
  };

  const columns = [
    {
      title: 'Plan Code',
      dataIndex: 'code',
      key: 'code',
      render: (c: string) => <code style={{ fontWeight: 700, color: '#334155', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{c}</code>
    },
    { title: 'Plan Name', dataIndex: 'name', key: 'name', render: (n: string) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{n}</span> },
    { title: 'Monthly Price', dataIndex: 'monthly_price', key: 'monthly_price', render: (v: string) => <span style={{ fontWeight: 500 }}>{inr(v)}</span> },
    { title: 'Annual Price', dataIndex: 'annual_price', key: 'annual_price', render: (v: string) => <span style={{ fontWeight: 500 }}>{inr(v)}</span> },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (a: boolean) => (
        <Tag color={a ? 'success' : 'default'} style={{ borderRadius: '4px', fontWeight: 600 }}>
          {a ? 'ACTIVE' : 'RETIRED'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, p: AdminPlanFull) => (
        <Space size="middle">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(p)} style={{ borderRadius: '6px' }}>Edit Plan</Button>
          <Popconfirm
            title="Retire Pricing Plan?"
            description="Warning: Clients cannot select retired plans during checkouts. Proceed?"
            onConfirm={() => remove(p)}
            okText="Retire"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: '6px' }}>Retire</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Subscription Pricing Plans</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0' }}>Configure license plans, monthly/annual fees, and feature toggle configurations.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ height: '40px', borderRadius: '8px', background: '#FF6D00', borderColor: '#FF6D00', fontWeight: 600 }}
        >
          New Plan
        </Button>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
        bodyStyle={{ padding: '16px 20px 24px' }}
      >
        <Table
          rowKey="id"
          columns={columns as never}
          dataSource={plans}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="No pricing plans registered" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* New/edit plan modal */}
      <Modal
        title={editing ? `Edit Plan Details: ${editing.name}` : 'Create Platform Pricing Plan'}
        open={open}
        onOk={submit}
        confirmLoading={busy}
        onCancel={() => setOpen(false)}
        okText="Save Plan"
        cancelText="Cancel"
        okButtonProps={{ style: { background: '#FF6D00', borderColor: '#FF6D00', borderRadius: '6px' } }}
        cancelButtonProps={{ style: { borderRadius: '6px' } }}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ paddingTop: '8px' }}>
          <Form.Item name="code" label="Plan Unique Code" rules={[{ required: true, message: 'Please enter a unique plan code' }]}>
            <Input placeholder="e.g. enterprise-pro" disabled={!!editing} style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="name" label="Plan Name" rules={[{ required: true, message: 'Please enter plan name' }]}>
            <Input placeholder="e.g. Enterprise Plus" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="description" label="Marketing Summary / Features List">
            <Input.TextArea placeholder="e.g. Complete tools for large accounting and payroll teams" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="monthly_price" label="Monthly Fee (₹)" rules={[{ required: true, message: 'Enter monthly cost' }]}>
                <InputNumber min={0} style={{ width: '100%', borderRadius: '6px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="annual_price" label="Annual Fee (₹)" rules={[{ required: true, message: 'Enter annual cost' }]}>
                <InputNumber min={0} style={{ width: '100%', borderRadius: '6px' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="is_active" label="Plan Active &amp; Selectable" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="features"
            label="Product Feature Flags Config (JSON Object)"
            tooltip='Configure toggles read by microservices to restrict limits, e.g. {"einvoice": true, "max_employees": 50}'
          >
            <Input.TextArea rows={6} style={{ fontFamily: 'monospace', fontSize: '12px', borderRadius: '6px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
