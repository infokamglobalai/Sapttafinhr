import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Table, Tag, message, Space, Modal, Form, Input, Select, Switch, Popconfirm, Empty } from 'antd';
import { PlusOutlined, AlertOutlined } from '@ant-design/icons';
import {
  fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  type Announcement
} from '../../lib/api';

const LEVEL_COLOR: Record<string, string> = { INFO: 'blue', WARNING: 'orange', CRITICAL: 'red' };

export default function Announcements() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAnnouncements());
    } catch {
      message.error('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const v = await form.validateFields();
    setBusy(true);
    try {
      await createAnnouncement(v);
      message.success('Announcement published successfully.');
      setOpen(false);
      form.resetFields();
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Failed to publish.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      message.success(label);
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Action failed.');
    }
  };

  const cols = [
    {
      title: 'Announcement Title',
      dataIndex: 'title',
      key: 'title',
      render: (t: string, r: Announcement) => (
        <div style={{ padding: '4px 0' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>{t}</span>
          {r.is_live && <Tag color="success" style={{ marginLeft: 8, borderRadius: '4px', fontWeight: 600 }}>LIVE NOW</Tag>}
        </div>
      )
    },
    {
      title: 'Severity Level',
      dataIndex: 'level',
      key: 'level',
      render: (l: string) => <Tag color={LEVEL_COLOR[l] ?? 'default'} style={{ borderRadius: '4px', fontWeight: 600 }}>{l}</Tag>
    },
    { title: 'Message Content', dataIndex: 'body', key: 'body', ellipsis: true },
    {
      title: 'Active Banner',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (a: boolean, r: Announcement) => (
        <Switch checked={a} onChange={(on) => act(on ? 'Banner activated' : 'Banner deactivated', () => updateAnnouncement(r.id, { is_active: on }))} />
      )
    },
    { title: 'Date Created', dataIndex: 'created_at', key: 'created_at', render: (d: string) => <span style={{ color: '#64748B' }}>{new Date(d).toLocaleDateString()}</span> },
    {
      title: 'Controls',
      key: 'del',
      render: (_: unknown, r: Announcement) => (
        <Popconfirm
          title="Delete Announcement?"
          description="This deletes the banner immediately. Proceed?"
          onConfirm={() => act('Announcement removed', () => deleteAnnouncement(r.id))}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger style={{ borderRadius: '6px' }}>Delete</Button>
        </Popconfirm>
      )
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Announcements &amp; System Banners</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0' }}>Configure global notice alerts displayed at the top of client tenant interfaces.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            form.setFieldsValue({ level: 'INFO' });
            setOpen(true);
          }}
          style={{ height: '40px', borderRadius: '8px', background: '#FF6D00', borderColor: '#FF6D00', fontWeight: 600 }}
        >
          New Announcement
        </Button>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
        bodyStyle={{ padding: '16px 20px 24px' }}
      >
        <Table
          rowKey="id"
          size="middle"
          columns={cols as never}
          dataSource={rows}
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description="No announcements posted yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* New announcement modal */}
      <Modal
        title="Publish Platform Announcement Banner"
        open={open}
        onOk={submit}
        confirmLoading={busy}
        okText="Publish Notice"
        cancelText="Cancel"
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        okButtonProps={{ style: { background: '#FF6D00', borderColor: '#FF6D00', borderRadius: '6px' } }}
        cancelButtonProps={{ style: { borderRadius: '6px' } }}
        width={480}
      >
        <Form form={form} layout="vertical" style={{ paddingTop: '8px' }}>
          <Form.Item name="title" label="Announcement Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input placeholder="e.g. Scheduled System Maintenance" style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="body" label="Alert Message / Description" rules={[{ required: true, message: 'Please enter details' }]}>
            <Input.TextArea rows={4} placeholder="e.g. Database updates will occur from 2 AM to 4 AM IST. Some latency might occur." style={{ borderRadius: '6px' }} />
          </Form.Item>
          <Form.Item name="level" label="Notification Severity Level">
            <Select
              options={[
                { value: 'INFO', label: 'Info (Blue Banner)' },
                { value: 'WARNING', label: 'Warning (Orange Banner)' },
                { value: 'CRITICAL', label: 'Critical (Red Banner)' }
              ]}
              dropdownStyle={{ borderRadius: '8px' }}
            />
          </Form.Item>
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: '#64748B', border: '1px solid #E2E8F0', marginTop: '12px' }}>
            Live status banners appear immediately for all active signed-in client workspaces across the server.
          </div>
        </Form>
      </Modal>
    </div>
  );
}
