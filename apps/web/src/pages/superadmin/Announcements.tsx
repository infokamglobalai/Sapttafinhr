import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, message, Space, Modal, Form, Input, Select, Switch, Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  type Announcement,
} from '../../lib/api';

const LEVEL_COLOR: Record<string, string> = { INFO: 'blue', WARNING: 'orange', CRITICAL: 'red' };

export default function Announcements() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchAnnouncements()); }
    catch { message.error('Failed to load announcements.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const submit = async () => {
    const v = await form.validateFields();
    setBusy(true);
    try { await createAnnouncement(v); message.success('Announcement published'); setOpen(false); form.resetFields(); await load(); }
    catch (e) { message.error((e as Error)?.message || 'Failed.'); }
    finally { setBusy(false); }
  };

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); message.success(label); await load(); }
    catch (e) { message.error((e as Error)?.message || 'Action failed.'); }
  };

  const cols = [
    { title: 'Title', dataIndex: 'title', key: 'title', render: (t: string, r: Announcement) => (
      <span><strong>{t}</strong>{r.is_live && <Tag color="green" style={{ marginLeft: 8 }}>LIVE</Tag>}</span>
    ) },
    { title: 'Level', dataIndex: 'level', key: 'level', render: (l: string) => <Tag color={LEVEL_COLOR[l]}>{l}</Tag> },
    { title: 'Message', dataIndex: 'body', key: 'body', ellipsis: true },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (a: boolean, r: Announcement) => (
      <Switch checked={a} onChange={(on) => act(on ? 'Activated' : 'Deactivated', () => updateAnnouncement(r.id, { is_active: on }))} />
    ) },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: '', key: 'del', render: (_: unknown, r: Announcement) => (
      <Popconfirm title="Delete this announcement?" onConfirm={() => act('Deleted', () => deleteAnnouncement(r.id))}>
        <Button size="small" danger>Delete</Button>
      </Popconfirm>
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

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/superadmin')} style={{ paddingLeft: 0 }}>Back to overview</Button>
        <Card title="Platform Announcements" style={{ borderRadius: 16 }} styles={{ header: { fontWeight: 700 } }}
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ level: 'INFO' }); setOpen(true); }}>New announcement</Button>}>
          <p style={{ color: 'rgba(10,17,40,0.5)', marginTop: -8 }}>Live announcements show as a banner to every signed-in user across the platform.</p>
          <Table rowKey="id" size="middle" columns={cols as never} dataSource={rows} loading={loading}
            pagination={false} locale={{ emptyText: 'No announcements yet.' }} />
        </Card>
      </main>

      <Modal title="New announcement" open={open} onOk={submit} confirmLoading={busy} okText="Publish"
        onCancel={() => { setOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input placeholder="Scheduled maintenance" /></Form.Item>
          <Form.Item name="body" label="Message"><Input.TextArea rows={3} placeholder="Details shown in the banner" /></Form.Item>
          <Form.Item name="level" label="Level">
            <Select options={[{ value: 'INFO', label: 'Info' }, { value: 'WARNING', label: 'Warning' }, { value: 'CRITICAL', label: 'Critical' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
