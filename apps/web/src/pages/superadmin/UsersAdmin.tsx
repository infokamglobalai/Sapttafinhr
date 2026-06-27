import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Table, Tag, message, Space, Input, Popconfirm, Typography, Modal, Empty } from 'antd';
import { LoginOutlined, SearchOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import {
  searchUsers, setUserStaff, startImpersonation, type PlatformUser
} from '../../lib/api';

const { Text } = Typography;

export default function UsersAdmin() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      setRows(await searchUsers(query));
    } catch {
      message.error('Search failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      message.success(label);
      await load(q);
    } catch (e) {
      message.error((e as Error)?.message || 'Action failed.');
    }
  };

  const handleImpersonationConfirm = (u: PlatformUser) => {
    if (!u.workspace) {
      message.warning('This user is not associated with an active workspace.');
      return;
    }

    Modal.confirm({
      title: 'Impersonate Client Session?',
      icon: <SafetyCertificateOutlined style={{ color: '#FF6D00' }} />,
      content: (
        <div style={{ marginTop: '8px' }}>
          <p>You are about to log into workspace <strong>{u.workspace}</strong> as client user <strong>{u.full_name || u.email}</strong>.</p>
          <p style={{ color: '#EF4444', fontWeight: 600 }}>This will grant you full access to modify their ledger, settings, and HRM logs.</p>
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#64748B', border: '1px solid #E2E8F0', marginTop: '12px' }}>
            To end this session and return to the Superadmin Console, look for the <strong>Exit Impersonation</strong> banner at the top of the screen.
          </div>
        </div>
      ),
      okText: 'Access Workspace',
      cancelText: 'Cancel',
      okButtonProps: { style: { background: '#FF6D00', borderColor: '#FF6D00', borderRadius: '6px' } },
      cancelButtonProps: { style: { borderRadius: '6px' } },
      onOk: async () => {
        try {
          await startImpersonation(u.workspace, u.id);
        } catch (e) {
          message.error((e as Error)?.message || 'Could not launch session.');
        }
      }
    });
  };

  const cols = [
    {
      title: 'User Account',
      dataIndex: 'email',
      key: 'email',
      render: (e: string, r: PlatformUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
          <UserOutlined style={{ color: '#94A3B8' }} />
          <div>
            <span style={{ fontWeight: 600, color: '#334155' }}>{e}</span>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {r.is_staff && <Tag color="purple" style={{ fontSize: '10px', borderRadius: '4px', fontWeight: 600 }}>STAFF ADMIN</Tag>}
              {!r.is_active && <Tag color="red" style={{ fontSize: '10px', borderRadius: '4px', fontWeight: 600 }}>SUSPENDED</Tag>}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Display Name',
      dataIndex: 'full_name',
      key: 'name',
      render: (n: string) => n || <Text type="secondary" style={{ fontStyle: 'italic' }}>Not specified</Text>
    },
    {
      title: 'Client Workspace',
      dataIndex: 'workspace',
      key: 'workspace',
      render: (w: string) => w ? (
        <a
          style={{ fontWeight: 600, color: '#FF6D00' }}
          onClick={() => navigate(`/superadmin/companies/${w}`)}
        >
          {w}
        </a>
      ) : (
        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Platform Level User</span>
      )
    },
    {
      title: 'Email Verified',
      dataIndex: 'is_verified',
      key: 'verified',
      render: (v: boolean) => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: '4px', fontWeight: 600 }}>
          {v ? 'VERIFIED' : 'PENDING'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: PlatformUser) => (
        <Space size="middle">
          <Button
            size="small"
            icon={<LoginOutlined />}
            disabled={!r.workspace || !r.is_active}
            onClick={() => handleImpersonationConfirm(r)}
            style={{ borderRadius: '6px' }}
          >
            Access As
          </Button>
          <Popconfirm
            title={r.is_staff ? 'Revoke administrative powers?' : 'Promote to platform admin?'}
            description={r.is_staff ? 'Revoking staff privileges will block access to the Superadmin Console.' : 'This will allow the user to view all databases and run dunning.'}
            onConfirm={() => act(r.is_staff ? 'Administrative role revoked' : 'Administrative role granted', () => setUserStaff(r.id, !r.is_staff))}
            okText="Confirm"
            cancelText="Cancel"
            okButtonProps={{ danger: r.is_staff }}
          >
            <Button size="small" danger={r.is_staff} style={{ borderRadius: '6px' }}>
              {r.is_staff ? 'Revoke Staff' : 'Make Staff'}
            </Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Platform Users Directory</h2>
        <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0' }}>Search user credentials, toggle administrative roles, and securely launch debug console sessions.</p>
      </div>

      <Card
        bordered={false}
        style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
        bodyStyle={{ padding: '16px 20px 24px' }}
        extra={
          <Input.Search
            placeholder="Search email, name or workspace"
            allowClear
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSearch={(v) => load(v)}
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            style={{ width: 320, borderRadius: '8px' }}
          />
        }
      >
        <Table
          rowKey="id"
          size="middle"
          columns={cols as never}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 15, style: { marginTop: '16px' } }}
          locale={{ emptyText: <Empty description="No users found matching query" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
    </div>
  );
}
