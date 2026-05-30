import { useState } from 'react';
import { Table, Tag, Button, Modal, message, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { MOCK_LEAVE_REQUESTS, MOCK_LEAVE_BALANCES, MOCK_EMPLOYEES, type LeaveRequest, type LeaveBalance } from '../../data/hrms-mock';

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Pending' },
  approved: { color: 'green', label: 'Approved' },
  rejected: { color: 'red', label: 'Rejected' },
  cancelled: { color: 'default', label: 'Cancelled' },
};

const leaveTypeColors: Record<string, string> = {
  CL: '#FF6D00', SL: '#EF4444', EL: '#10B981', ML: '#8B5CF6', CO: '#0EA5E9', LWP: '#64748B',
};

export default function Leave() {
  const [requests, setRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS);
  const [tab, setTab] = useState('requests');

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const, approvedBy: 'Admin' } : r));
    message.success('Leave approved');
  };

  const handleReject = (id: string) => {
    Modal.confirm({
      title: 'Reject leave request?',
      content: 'The employee will be notified.',
      okText: 'Reject', okButtonProps: { danger: true },
      onOk: () => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const, approvedBy: 'Admin' } : r));
        message.success('Leave rejected');
      },
    });
  };

  const requestColumns = [
    {
      title: 'Employee', key: 'employee',
      render: (_: unknown, r: LeaveRequest) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#FF6D00', flexShrink: 0 }}>
            {r.employeeName.split(' ').map(n => n[0]).join('')}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{r.employeeName}</span>
        </div>
      ),
    },
    {
      title: 'Type', key: 'type',
      render: (_: unknown, r: LeaveRequest) => (
        <Tag style={{ background: `${leaveTypeColors[r.leaveType]}15`, color: leaveTypeColors[r.leaveType], border: 'none', fontWeight: 600, fontSize: 11, borderRadius: 6 }}>
          {r.leaveType} — {r.leaveTypeFull}
        </Tag>
      ),
    },
    {
      title: 'Duration', key: 'duration',
      render: (_: unknown, r: LeaveRequest) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.days} day{r.days > 1 ? 's' : ''}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.fromDate} → {r.toDate}</div>
        </div>
      ),
    },
    {
      title: 'Reason', dataIndex: 'reason', key: 'reason',
      render: (v: string) => <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{v}</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: LeaveRequest) => <Tag color={statusConfig[r.status].color} style={{ fontSize: 11, borderRadius: 6 }}>{statusConfig[r.status].label}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 110,
      render: (_: unknown, r: LeaveRequest) => r.status === 'pending' ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="small" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)}
            style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
            Approve
          </Button>
          <Button size="small" icon={<CloseOutlined />} onClick={() => handleReject(r.id)}
            style={{ borderRadius: 6, fontSize: 11 }} danger>
            Reject
          </Button>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {r.approvedBy ? `By ${r.approvedBy}` : '—'}
        </span>
      ),
    },
  ];

  const pending = requests.filter(r => r.status === 'pending').length;

  interface BalanceRow { key: string; name: string; empCode: string; balances: LeaveBalance[] }
  const balancesByEmployee: BalanceRow[] = MOCK_EMPLOYEES.filter(e => e.status !== 'terminated').map(emp => {
    const balances = MOCK_LEAVE_BALANCES.filter(lb => lb.employeeId === emp.id);
    return { key: emp.id, name: `${emp.firstName} ${emp.lastName}`, empCode: emp.empCode, balances };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Leave Management</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {pending > 0 ? `${pending} request${pending > 1 ? 's' : ''} pending approval` : 'All requests processed'}
          </p>
        </div>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'requests',
          label: <span>Requests {pending > 0 && <Tag color="orange" style={{ marginLeft: 6, borderRadius: 10, fontSize: 11 }}>{pending}</Tag>}</span>,
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table dataSource={requests} columns={requestColumns} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
            </div>
          ),
        },
        {
          key: 'balances',
          label: 'Leave Balances',
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table
                dataSource={balancesByEmployee}
                rowKey="key"
                pagination={{ pageSize: 10 }}
                size="middle"
                columns={[
                  {
                    title: 'Employee', key: 'name',
                    render: (_: unknown, r: BalanceRow) => (
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>{r.empCode}</span>
                      </div>
                    ),
                  },
                  ...['CL', 'SL', 'EL'].map(code => ({
                    title: code,
                    key: code,
                    width: 160,
                    render: (_: unknown, r: BalanceRow) => {
                      const b = r.balances.find(lb => lb.typeCode === code);
                      if (!b) return '—';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ height: 4, flex: 1, background: '#F1F3F5', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(b.used / b.total) * 100}%`, background: leaveTypeColors[code], borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', minWidth: 50, textAlign: 'right' }}>
                            {b.balance}/{b.total}
                          </span>
                        </div>
                      );
                    },
                  })),
                ]}
              />
            </div>
          ),
        },
      ]} />
    </div>
  );
}
