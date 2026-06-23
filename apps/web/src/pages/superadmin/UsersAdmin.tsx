import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Button, Card, Table, Tag, message, Space, Input, Popconfirm, Typography } from 'antd';
import { ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  searchUsers, setUserStaff, startImpersonation, type PlatformUser,
} from '../../lib/api';

const { Text } = Typography;

export default function UsersAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try { setRows(await searchUsers(query)); }
    catch { message.error('Search failed.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(''); }, [load]);

  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); message.success(label); await load(q); }
    catch (e) { message.error((e as Error)?.message || 'Action failed.'); }
  };

  const impersonate = async (u: PlatformUser) => {
    if (!u.workspace) { message.warning('This user has no workspace to open.'); return; }
    try { await startImpersonation(u.workspace, u.id); }
    catch (e) { message.error((e as Error)?.message || 'Could not open workspace.'); }
  };

  const cols = [
    { title: 'Email', dataIndex: 'email', key: 'email', render: (e: string, r: PlatformUser) => (
      <span>{e}{r.is_staff && <Tag color="purple" style={{ marginLeft: 6 }}>ADMIN</Tag>}{!r.is_active && <Tag color="red" style={{ marginLeft: 6 }}>Disabled</Tag>}</span>
    ) },
    { title: 'Name', dataIndex: 'full_name', key: 'name', render: (n: string) => n || <Text type="secondary">—</Text> },
    { title: 'Workspace', dataIndex: 'workspace', key: 'workspace', render: (w: string, r: PlatformUser) => w
      ? <a onClick={() => navigate(`/superadmin/companies/${w}`)}>{w}</a> : <Text type="secondary">—</Text> },
    { title: 'Verified', dataIndex: 'is_verified', key: 'verified', render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
    { title: 'Actions', key: 'actions', render: (_: unknown, r: PlatformUser) => (
      <Space>
        <Button size="small" icon={<LoginOutlined />} disabled={!r.workspace} onClick={() => impersonate(r)}>Open as</Button>
        <Popconfirm title={r.is_staff ? 'Revoke platform admin?' : 'Grant platform admin?'}
          onConfirm={() => act(r.is_staff ? 'Admin revoked' : 'Admin granted', () => setUserStaff(r.id, !r.is_staff))}>
          <Button size="small" danger={r.is_staff}>{r.is_staff ? 'Revoke admin' : 'Make admin'}</Button>
        </Popconfirm>
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

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/superadmin')} style={{ paddingLeft: 0 }}>Back to overview</Button>
        <Card title="Platform Users" style={{ borderRadius: 16 }} styles={{ header: { fontWeight: 700 } }}
          extra={<Input.Search placeholder="Search email or name" allowClear style={{ width: 280 }}
            value={q} onChange={(e) => setQ(e.target.value)} onSearch={(v) => load(v)} />}>
          <Table rowKey="id" size="middle" columns={cols as never} dataSource={rows} loading={loading}
            pagination={{ pageSize: 15 }} locale={{ emptyText: 'No users found.' }} />
        </Card>
      </main>
    </div>
  );
}
