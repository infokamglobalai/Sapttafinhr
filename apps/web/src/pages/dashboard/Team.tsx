import { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CrownOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Option } = Select;

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'hr_manager' | 'accountant' | 'manager' | 'employee';
  status: 'active' | 'invited' | 'disabled';
  lastActive: string;
  modules: string[];
}

const roleCfg: Record<string, { color: string; label: string; desc: string }> = {
  owner: { color: '#FF6D00', label: 'Owner', desc: 'Full access to all modules and settings' },
  admin: { color: '#8B5CF6', label: 'Admin', desc: 'Full access except billing & subscription' },
  hr_manager: { color: '#0EA5E9', label: 'HR Manager', desc: 'HRMS modules: employees, attendance, leave, payroll' },
  accountant: { color: '#10B981', label: 'Accountant', desc: 'Finance modules: invoices, receipts, ledger, reports' },
  manager: { color: '#F59E0B', label: 'Manager', desc: 'Approve leaves, expenses; view team reports' },
  employee: { color: '#64748B', label: 'Employee', desc: 'Self-service: own attendance, leave, payslips' },
};

const statusCfg: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: 'Active' },
  invited: { color: 'blue', label: 'Invited' },
  disabled: { color: 'default', label: 'Disabled' },
};

const INITIAL_TEAM: TeamMember[] = [
  { id: 'tm1', name: 'Nutan Kumar', email: 'nutankumarkm@gmail.com', role: 'owner', status: 'active', lastActive: '2026-05-27T14:30:00', modules: ['All'] },
  { id: 'tm2', name: 'Sneha Reddy', email: 'sneha.reddy@company.com', role: 'hr_manager', status: 'active', lastActive: '2026-05-27T12:15:00', modules: ['Employees', 'Attendance', 'Leave', 'Payroll'] },
  { id: 'tm3', name: 'Kavitha Nair', email: 'kavitha.nair@company.com', role: 'accountant', status: 'active', lastActive: '2026-05-27T11:00:00', modules: ['Invoices', 'Receipts', 'Ledger', 'Reports'] },
  { id: 'tm4', name: 'Vikram Patel', email: 'vikram.patel@company.com', role: 'admin', status: 'active', lastActive: '2026-05-26T18:00:00', modules: ['All'] },
  { id: 'tm5', name: 'Neha Gupta', email: 'neha.gupta@company.com', role: 'manager', status: 'active', lastActive: '2026-05-27T09:30:00', modules: ['Leave Approvals', 'Expenses', 'Reports'] },
  { id: 'tm6', name: 'New Hire', email: 'newhire@company.com', role: 'employee', status: 'invited', lastActive: '', modules: ['Self-Service'] },
];

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [showInvite, setShowInvite] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();

  const handleInvite = () => {
    form.validateFields().then(values => {
      setTeam(prev => [...prev, {
        id: 'tm_' + Date.now(),
        name: values.name,
        email: values.email,
        role: values.role,
        status: 'invited' as const,
        lastActive: '',
        modules: roleCfg[values.role]?.desc ? [roleCfg[values.role].desc] : [],
      }]);
      setShowInvite(false);
      form.resetFields();
      message.success(`Invitation sent to ${values.email}`);
    });
  };

  const handleRemove = (member: TeamMember) => {
    if (member.role === 'owner') { message.warning('Cannot remove the owner'); return; }
    Modal.confirm({
      title: `Remove ${member.name}?`, content: 'They will lose access immediately.',
      okText: 'Remove', okButtonProps: { danger: true },
      onOk: () => { setTeam(prev => prev.filter(t => t.id !== member.id)); message.success('User removed'); },
    });
  };

  const columns = [
    {
      title: 'User', key: 'user',
      render: (_: unknown, r: TeamMember) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${roleCfg[r.role]?.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleCfg[r.role]?.color, fontSize: 14, flexShrink: 0 }}>
            {r.role === 'owner' ? <CrownOutlined /> : <UserOutlined />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role', key: 'role',
      render: (_: unknown, r: TeamMember) => (
        <div>
          <Tag color={roleCfg[r.role]?.color} style={{ fontSize: 11, borderRadius: 6, marginBottom: 2 }}>{roleCfg[r.role]?.label}</Tag>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 250 }}>{roleCfg[r.role]?.desc}</div>
        </div>
      ),
    },
    {
      title: 'Access', key: 'modules',
      render: (_: unknown, r: TeamMember) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {r.modules.map(m => <Tag key={m} style={{ fontSize: 10, borderRadius: 6 }}>{m}</Tag>)}
        </div>
      ),
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: TeamMember) => <Tag color={statusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{statusCfg[r.status]?.label}</Tag>,
    },
    {
      title: 'Last Active', key: 'lastActive',
      render: (_: unknown, r: TeamMember) => r.lastActive
        ? <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{new Date(r.lastActive).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Never</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: TeamMember) => r.role !== 'owner' ? (
        <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleRemove(r)} style={{ color: '#EF4444' }} />
      ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Team & Access Control</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {team.filter(t => t.status === 'active').length} active users · Role-based permissions across HRMS & Finance
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowInvite(true)} style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Invite User
        </Button>
      </div>

      {/* Role summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(roleCfg).map(([key, cfg]) => {
          const count = team.filter(t => t.role === key && t.status === 'active').length;
          return (
            <div key={key} style={{ background: '#FFFFFF', borderRadius: 10, padding: '10px 16px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{cfg.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{count}</span>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={team} columns={columns} rowKey="id" pagination={false} size="middle" />
      </div>

      {/* Invite modal */}
      <Modal open={showInvite} onCancel={() => setShowInvite(false)} onOk={handleInvite}
        title={<span style={{ fontWeight: 700 }}>Invite Team Member</span>}
        okText="Send Invitation" okButtonProps={{ style: { background: '#FF6D00', border: 'none', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="jane@company.com" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select role">
              {Object.entries(roleCfg).filter(([k]) => k !== 'owner').map(([k, v]) => (
                <Option key={k} value={k}>
                  <div>{v.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{v.desc}</div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
