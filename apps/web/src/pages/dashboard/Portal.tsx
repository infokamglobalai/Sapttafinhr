import { useState } from 'react';
import { Table, Tag, Button, Modal, Switch, message, Tabs } from 'antd';
import { PlusOutlined, LinkOutlined, CopyOutlined, DeleteOutlined, EyeOutlined, GlobalOutlined } from '@ant-design/icons';
import { MOCK_PARTIES, MOCK_INVOICES, formatINR } from '../../data/finance-mock';

interface PortalAccess {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'vendor';
  email: string;
  status: 'active' | 'expired' | 'revoked';
  createdDate: string;
  lastAccess: string | null;
  permissions: string[];
  token: string;
}

const statusCfg: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: 'Active' },
  expired: { color: 'orange', label: 'Expired' },
  revoked: { color: 'red', label: 'Revoked' },
};

const MOCK_PORTAL_ACCESS: PortalAccess[] = [
  { id: 'pa1', partyId: 'p1', partyName: 'TechCorp India Pvt Ltd', partyType: 'customer', email: 'accounts@techcorp.in', status: 'active', createdDate: '2026-04-10', lastAccess: '2026-05-26T14:30:00', permissions: ['View Invoices', 'Download PDF', 'Make Payment', 'View Statement'], token: 'ptl_tc_••••••4f2a' },
  { id: 'pa2', partyId: 'p2', partyName: 'GreenLeaf Exports', partyType: 'customer', email: 'finance@greenleaf.co.in', status: 'active', createdDate: '2026-04-15', lastAccess: '2026-05-20T10:15:00', permissions: ['View Invoices', 'Download PDF', 'View Statement'], token: 'ptl_gl_••••••8b7c' },
  { id: 'pa3', partyId: 'p5', partyName: 'CloudNine Supplies', partyType: 'vendor', email: 'billing@cloudnine.com', status: 'active', createdDate: '2026-04-20', lastAccess: '2026-05-22T16:45:00', permissions: ['View POs', 'Upload Invoice', 'View Payments'], token: 'ptl_cn_••••••3d1e' },
  { id: 'pa4', partyId: 'p4', partyName: 'QuickServe Logistics', partyType: 'customer', email: 'ap@quickserve.in', status: 'expired', createdDate: '2026-03-01', lastAccess: '2026-04-05T09:00:00', permissions: ['View Invoices', 'Download PDF'], token: 'ptl_qs_••••••9f5a' },
];

export default function Portal() {
  const [accessList, setAccessList] = useState(MOCK_PORTAL_ACCESS);
  const [tab, setTab] = useState('access');

  const activeCount = accessList.filter(a => a.status === 'active').length;
  const customerPortals = accessList.filter(a => a.partyType === 'customer' && a.status === 'active').length;
  const vendorPortals = accessList.filter(a => a.partyType === 'vendor' && a.status === 'active').length;

  const handleRevoke = (id: string) => {
    Modal.confirm({
      title: 'Revoke portal access?',
      content: 'The customer/vendor will immediately lose access to their portal.',
      okText: 'Revoke', okButtonProps: { danger: true },
      onOk: () => {
        setAccessList(prev => prev.map(a => a.id === id ? { ...a, status: 'revoked' as const } : a));
        message.success('Portal access revoked');
      },
    });
  };

  const handleReissue = (id: string) => {
    setAccessList(prev => prev.map(a => a.id === id ? { ...a, status: 'active' as const, token: `ptl_new_••••••${Date.now().toString().slice(-4)}` } : a));
    message.success('New portal token issued');
  };

  const handleCopyLink = (access: PortalAccess) => {
    const url = `https://portal.saptta.com/${access.partyType}/${access.partyId}`;
    navigator.clipboard?.writeText(url);
    message.success('Portal link copied to clipboard');
  };

  const accessColumns = [
    {
      title: 'Party', key: 'party',
      render: (_: unknown, r: PortalAccess) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: r.partyType === 'customer' ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: r.partyType === 'customer' ? '#10B981' : '#8B5CF6', fontSize: 16,
          }}>
            <GlobalOutlined />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.partyName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Type', key: 'type',
      render: (_: unknown, r: PortalAccess) => (
        <Tag color={r.partyType === 'customer' ? 'green' : 'purple'} style={{ fontSize: 11, borderRadius: 6, textTransform: 'capitalize' as const }}>
          {r.partyType}
        </Tag>
      ),
    },
    {
      title: 'Permissions', key: 'perms',
      render: (_: unknown, r: PortalAccess) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {r.permissions.map(p => <Tag key={p} style={{ fontSize: 10, borderRadius: 6 }}>{p}</Tag>)}
        </div>
      ),
    },
    {
      title: 'Token', key: 'token',
      render: (_: unknown, r: PortalAccess) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>{r.token}</span>
      ),
    },
    {
      title: 'Last Access', key: 'lastAccess',
      render: (_: unknown, r: PortalAccess) => r.lastAccess
        ? <span style={{ fontSize: 12 }}>{new Date(r.lastAccess).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Never</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: PortalAccess) => <Tag color={statusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{statusCfg[r.status]?.label}</Tag>,
    },
    {
      title: '', key: 'actions', width: 130,
      render: (_: unknown, r: PortalAccess) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopyLink(r)} style={{ color: '#0EA5E9' }} />
          {r.status === 'active' && (
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleRevoke(r.id)} style={{ color: '#EF4444' }} />
          )}
          {(r.status === 'expired' || r.status === 'revoked') && (
            <Button size="small" onClick={() => handleReissue(r.id)} style={{ fontSize: 11, borderRadius: 6 }}>Reissue</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>
            Customer & Vendor Portal
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Self-service portal for customers to view invoices & vendors to upload bills</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Grant Access
        </Button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Active Portals</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981' }}>{activeCount}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Customer Portals</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981' }}>{customerPortals}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Vendor Portals</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#8B5CF6' }}>{vendorPortals}</div>
        </div>
      </div>

      {/* Portal features info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'rgba(16,185,129,0.04)', borderRadius: 14, padding: '20px 24px', border: '1px solid rgba(16,185,129,0.12)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginBottom: 10 }}>Customer Portal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['View & download invoices (PDF)', 'Check outstanding balance', 'Make online payments (Razorpay)', 'Download account statements', 'Raise support tickets'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(139,92,246,0.04)', borderRadius: 14, padding: '20px 24px', border: '1px solid rgba(139,92,246,0.12)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#8B5CF6', marginBottom: 10 }}>Vendor Portal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['View purchase orders', 'Upload invoices against POs', 'Track payment status', 'Download TDS certificates', 'View payment history'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B5CF6' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Access table */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={accessList} columns={accessColumns} rowKey="id" pagination={false} size="middle" />
      </div>
    </div>
  );
}
