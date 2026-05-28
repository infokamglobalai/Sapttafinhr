import { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, message, Drawer } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, EyeOutlined, SwapOutlined } from '@ant-design/icons';
import { MOCK_EMPLOYEES } from '../../data/hrms-mock';
import { formatINR } from '../../data/finance-mock';
import { useNotifications } from '../../contexts/NotificationContext';

const { Option } = Select;
const { TextArea } = Input;

interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status: 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  receipt: boolean;
  approvedBy: string | null;
  journalRef: string | null;
}

const categoryCfg: Record<string, string> = {
  travel: '#0EA5E9', food: '#FF6D00', office_supplies: '#10B981', communication: '#8B5CF6',
  client_meeting: '#EC4899', training: '#F59E0B', other: '#64748B',
};

const statusCfg: Record<string, { color: string; label: string }> = {
  submitted: { color: 'orange', label: 'Submitted' },
  approved: { color: 'blue', label: 'Approved' },
  rejected: { color: 'red', label: 'Rejected' },
  reimbursed: { color: 'green', label: 'Reimbursed' },
};

const INITIAL_CLAIMS: ExpenseClaim[] = [
  { id: 'ec1', claimNumber: 'EXP-001', employeeId: 'e5', employeeName: 'Arjun Mehta', empCode: 'SAP-005', date: '2026-05-26', category: 'travel', description: 'Client visit to Mumbai — cab fare + meals', amount: 4500, status: 'submitted', receipt: true, approvedBy: null, journalRef: null },
  { id: 'ec2', claimNumber: 'EXP-002', employeeId: 'e3', employeeName: 'Amit Kumar', empCode: 'SAP-003', date: '2026-05-22', category: 'client_meeting', description: 'Lunch with QuickServe Logistics team', amount: 2800, status: 'approved', receipt: true, approvedBy: 'Neha Gupta', journalRef: null },
  { id: 'ec3', claimNumber: 'EXP-003', employeeId: 'e1', employeeName: 'Rahul Sharma', empCode: 'SAP-001', date: '2026-05-18', category: 'training', description: 'AWS certification exam fee', amount: 12500, status: 'reimbursed', receipt: true, approvedBy: 'Vikram Patel', journalRef: 'JV-2026-EXP-001' },
  { id: 'ec4', claimNumber: 'EXP-004', employeeId: 'e9', employeeName: 'Deepak Singh', empCode: 'SAP-009', date: '2026-05-20', category: 'travel', description: 'Field visit to Mysore warehouse', amount: 3200, status: 'rejected', receipt: false, approvedBy: 'Arjun Mehta', journalRef: null },
  { id: 'ec5', claimNumber: 'EXP-005', employeeId: 'e6', employeeName: 'Sneha Reddy', empCode: 'SAP-006', date: '2026-05-25', category: 'office_supplies', description: 'HR team whiteboard & markers', amount: 1800, status: 'submitted', receipt: true, approvedBy: null, journalRef: null },
];

export default function Expenses() {
  const [claims, setClaims] = useState<ExpenseClaim[]>(INITIAL_CLAIMS);
  const [showForm, setShowForm] = useState(false);
  const [viewClaim, setViewClaim] = useState<ExpenseClaim | null>(null);
  const [form] = Form.useForm();
  const { addNotification } = useNotifications();

  const pending = claims.filter(c => c.status === 'submitted').length;
  const totalApproved = claims.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
  const totalReimbursed = claims.filter(c => c.status === 'reimbursed').reduce((s, c) => s + c.amount, 0);

  const handleApprove = (id: string) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' as const, approvedBy: 'Admin' } : c));
    const claim = claims.find(c => c.id === id);
    addNotification({
      title: 'Expense approved → Finance',
      message: `${claim?.claimNumber} (${formatINR(claim?.amount || 0)}) approved. A reimbursement journal entry will be created in Finance.`,
      type: 'success', module: 'finance',
    });
    message.success('Expense approved — journal entry queued for Finance');
  };

  const handleReimburse = (id: string) => {
    const claim = claims.find(c => c.id === id);
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'reimbursed' as const, journalRef: `JV-2026-EXP-${Date.now().toString().slice(-3)}` } : c));
    addNotification({
      title: 'Expense reimbursed',
      message: `${claim?.claimNumber} for ${claim?.employeeName} (${formatINR(claim?.amount || 0)}) reimbursed. Journal posted: Dr Expense, Cr Cash/Bank.`,
      type: 'success', module: 'finance',
    });
    message.success('Reimbursed — journal entry posted to ledger');
  };

  const handleReject = (id: string) => {
    Modal.confirm({
      title: 'Reject expense claim?', okText: 'Reject', okButtonProps: { danger: true },
      onOk: () => {
        setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' as const, approvedBy: 'Admin' } : c));
        message.success('Expense rejected');
      },
    });
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const emp = MOCK_EMPLOYEES.find(e => e.id === values.employeeId);
      const newClaim: ExpenseClaim = {
        id: 'ec_' + Date.now(),
        claimNumber: `EXP-${String(claims.length + 1).padStart(3, '0')}`,
        employeeId: values.employeeId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        empCode: emp?.empCode || '',
        date: new Date().toISOString().split('T')[0],
        category: values.category,
        description: values.description,
        amount: Number(values.amount),
        status: 'submitted',
        receipt: true,
        approvedBy: null,
        journalRef: null,
      };
      setClaims(prev => [newClaim, ...prev]);
      setShowForm(false);
      form.resetFields();
      message.success('Expense claim submitted');
    });
  };

  const columns = [
    {
      title: 'Claim', key: 'claim',
      render: (_: unknown, r: ExpenseClaim) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6D00' }}>{r.claimNumber}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      ),
    },
    {
      title: 'Employee', key: 'employee',
      render: (_: unknown, r: ExpenseClaim) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, color: '#FF6D00' }}>
            {r.employeeName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.employeeName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.empCode}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Category', key: 'category',
      render: (_: unknown, r: ExpenseClaim) => (
        <span style={{ fontSize: 11, fontWeight: 600, color: categoryCfg[r.category] || '#64748B', background: `${categoryCfg[r.category] || '#64748B'}12`, padding: '3px 10px', borderRadius: 6, textTransform: 'capitalize' as const }}>
          {r.category.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      title: 'Description', dataIndex: 'description', key: 'desc',
      render: (v: string) => <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{v.length > 40 ? v.slice(0, 40) + '…' : v}</span>,
    },
    {
      title: 'Amount', key: 'amount',
      render: (_: unknown, r: ExpenseClaim) => <span style={{ fontSize: 14, fontWeight: 700 }}>{formatINR(r.amount)}</span>,
      sorter: (a: ExpenseClaim, b: ExpenseClaim) => a.amount - b.amount,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: ExpenseClaim) => <Tag color={statusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{statusCfg[r.status]?.label}</Tag>,
    },
    {
      title: 'Finance Link', key: 'journal',
      render: (_: unknown, r: ExpenseClaim) => r.journalRef
        ? <Tag color="purple" style={{ fontSize: 11, borderRadius: 6 }}>{r.journalRef}</Tag>
        : <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      title: '', key: 'actions', width: 160,
      render: (_: unknown, r: ExpenseClaim) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setViewClaim(r)} style={{ color: 'var(--color-text-secondary)' }} />
          {r.status === 'submitted' && (
            <>
              <Button size="small" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)} style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Approve</Button>
              <Button size="small" icon={<CloseOutlined />} onClick={() => handleReject(r.id)} style={{ borderRadius: 6, fontSize: 11 }} danger>Reject</Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleReimburse(r.id)} style={{ background: '#6366F1', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Reimburse</Button>
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
            Expense Claims
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: 10, verticalAlign: 'middle' }}>HRMS ↔ Finance</span>
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Employee expense claims auto-post journal entries to Finance when reimbursed.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)} style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          New Claim
        </Button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPI label="Pending Approval" value={String(pending)} color="#FF8F00" />
        <KPI label="Approved (Unpaid)" value={formatINR(totalApproved)} color="#0EA5E9" />
        <KPI label="Reimbursed" value={formatINR(totalReimbursed)} color="#10B981" />
        <KPI label="Total Claims" value={String(claims.length)} color="#8B5CF6" />
      </div>

      {/* Cross-product info banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', marginBottom: 20, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 12 }}>
        <SwapOutlined style={{ color: '#6366F1', fontSize: 16 }} />
        <span style={{ fontSize: 13, color: '#6366F1', fontWeight: 600 }}>
          Cross-product: Approved claims create "Dr Expense Account, Cr Salary Payable/Cash" journal entries in Finance automatically.
        </span>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={claims} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
      </div>

      {/* New claim modal */}
      <Modal open={showForm} onCancel={() => setShowForm(false)} onOk={handleSubmit}
        title={<span style={{ fontWeight: 700 }}>Submit Expense Claim</span>}
        okText="Submit" okButtonProps={{ style: { background: '#FF6D00', border: 'none', fontWeight: 600 } }}>
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}>
            <Select placeholder="Select employee" showSearch optionFilterProp="children">
              {MOCK_EMPLOYEES.filter(e => e.status !== 'terminated').map(e => (
                <Option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.empCode})</Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="category" label="Category" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select category">
                {Object.keys(categoryCfg).map(k => <Option key={k} value={k}>{k.replace(/_/g, ' ')}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input type="number" placeholder="4500" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Brief description of the expense" />
          </Form.Item>
        </Form>
      </Modal>

      {/* View drawer */}
      <Drawer open={!!viewClaim} onClose={() => setViewClaim(null)} width={400} title={<span style={{ fontWeight: 700 }}>{viewClaim?.claimNumber}</span>}>
        {viewClaim && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row label="Employee" value={`${viewClaim.employeeName} (${viewClaim.empCode})`} />
            <Row label="Date" value={new Date(viewClaim.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
            <Row label="Category" value={viewClaim.category.replace(/_/g, ' ')} />
            <Row label="Description" value={viewClaim.description} />
            <Row label="Amount" value={formatINR(viewClaim.amount)} />
            <Row label="Status" value={statusCfg[viewClaim.status]?.label || viewClaim.status} />
            <Row label="Receipt Attached" value={viewClaim.receipt ? 'Yes' : 'No'} />
            <Row label="Approved By" value={viewClaim.approvedBy || '—'} />
            {viewClaim.journalRef && (
              <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.04)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.12)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6366F1', marginBottom: 4 }}>Finance Integration</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Journal Ref: {viewClaim.journalRef}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Dr Travel Expense · Cr Cash/Bank</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
