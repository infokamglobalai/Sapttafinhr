import { useState } from 'react';
import { Table, Button, Input, Tag, Modal, Form, Select, message, Drawer } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS, type Employee } from '../../data/hrms-mock';

const { Option } = Select;

const statusColors: Record<string, string> = {
  active: 'green', on_leave: 'orange', terminated: 'red', probation: 'blue',
};
const statusLabels: Record<string, string> = {
  active: 'Active', on_leave: 'On Leave', terminated: 'Terminated', probation: 'Probation',
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [form] = Form.useForm();

  const filtered = employees.filter(e => {
    const matchSearch = !search || `${e.firstName} ${e.lastName} ${e.empCode} ${e.email}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const handleAdd = () => {
    setEditingEmployee(null);
    form.resetFields();
    setShowForm(true);
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    form.setFieldsValue(emp);
    setShowForm(true);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      if (editingEmployee) {
        setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, ...values } : e));
        message.success('Employee updated');
      } else {
        const newEmp: Employee = {
          ...values,
          id: 'e_' + Date.now(),
          empCode: `SAP-${String(employees.length + 1).padStart(3, '0')}`,
          status: 'probation',
          bankAccount: '', pan: '', aadhaar: '', pfNumber: '', esiNumber: '',
          shift: 'General (09:00-18:00)',
        };
        setEmployees(prev => [...prev, newEmp]);
        message.success('Employee added');
      }
      setShowForm(false);
    });
  };

  const handleDelete = (emp: Employee) => {
    Modal.confirm({
      title: `Terminate ${emp.firstName} ${emp.lastName}?`,
      content: 'This will mark the employee as terminated. This action can be reversed.',
      okText: 'Terminate',
      okButtonProps: { danger: true },
      onOk: () => {
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: 'terminated' as const } : e));
        message.success('Employee terminated');
      },
    });
  };

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const columns = [
    {
      title: 'Employee',
      key: 'name',
      render: (_: unknown, r: Employee) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6D00, #FFA000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {r.firstName[0]}{r.lastName[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{r.firstName} {r.lastName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.empCode} · {r.email}</div>
          </div>
        </div>
      ),
      sorter: (a: Employee, b: Employee) => a.firstName.localeCompare(b.firstName),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (d: string) => <span style={{ fontSize: 13 }}>{d}</span>,
      filters: MOCK_DEPARTMENTS.map(d => ({ text: d.name, value: d.name })),
      onFilter: (value: unknown, record: Employee) => record.department === value,
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      render: (d: string) => <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{d}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColors[s]} style={{ fontSize: 11, borderRadius: 6 }}>{statusLabels[s]}</Tag>,
    },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      render: (s: number) => <span style={{ fontSize: 13, fontWeight: 600 }}>{formatINR(s)}</span>,
      sorter: (a: Employee, b: Employee) => a.salary - b.salary,
    },
    {
      title: 'Joined',
      dataIndex: 'dateOfJoining',
      key: 'dateOfJoining',
      render: (d: string) => <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
      sorter: (a: Employee, b: Employee) => new Date(a.dateOfJoining).getTime() - new Date(b.dateOfJoining).getTime(),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, r: Employee) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setViewEmployee(r)} style={{ color: 'var(--color-text-secondary)' }} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} style={{ color: '#FF6D00' }} />
          {r.status !== 'terminated' && (
            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r)} style={{ color: '#EF4444' }} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Employees</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {employees.filter(e => e.status !== 'terminated').length} active employees · {employees.filter(e => e.status === 'probation').length} on probation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Export CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
            style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
          placeholder="Search by name, code, or email..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300, borderRadius: 8 }}
          allowClear
        />
        <Select placeholder="Department" allowClear value={deptFilter} onChange={setDeptFilter} style={{ minWidth: 150, borderRadius: 8 }}>
          {MOCK_DEPARTMENTS.map(d => <Option key={d.name} value={d.name}>{d.name}</Option>)}
        </Select>
        <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ minWidth: 130, borderRadius: 8 }}>
          {Object.entries(statusLabels).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
        </Select>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} employees` }}
          size="middle"
          style={{ fontSize: 13 }}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        title={<span style={{ fontWeight: 700 }}>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</span>}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={editingEmployee ? 'Update' : 'Add Employee'}
        okButtonProps={{ style: { background: '#FF6D00', border: 'none', fontWeight: 600 } }}
        width={600}
      >
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Rahul" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Sharma" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]} style={{ flex: 1 }}>
              <Input placeholder="rahul@company.com" />
            </Form.Item>
            <Form.Item name="phone" label="Phone" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="9876543210" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="department" label="Department" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select department">
                {MOCK_DEPARTMENTS.map(d => <Option key={d.name} value={d.name}>{d.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="designation" label="Designation" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Senior Developer" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="salary" label="Monthly CTC (₹)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input type="number" placeholder="85000" />
            </Form.Item>
            <Form.Item name="dateOfJoining" label="Date of Joining" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input type="date" />
            </Form.Item>
          </div>
          <Form.Item name="reportingTo" label="Reporting To">
            <Input placeholder="Manager name" />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Employee Drawer */}
      <Drawer
        open={!!viewEmployee}
        onClose={() => setViewEmployee(null)}
        title={<span style={{ fontWeight: 700 }}>{viewEmployee?.firstName} {viewEmployee?.lastName}</span>}
        width={420}
      >
        {viewEmployee && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center', paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6D00, #FFA000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 22, margin: '0 auto 12px' }}>
                {viewEmployee.firstName[0]}{viewEmployee.lastName[0]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>{viewEmployee.firstName} {viewEmployee.lastName}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{viewEmployee.empCode} · {viewEmployee.designation}</div>
              <Tag color={statusColors[viewEmployee.status]} style={{ marginTop: 8, borderRadius: 6 }}>{statusLabels[viewEmployee.status]}</Tag>
            </div>

            <DetailSection title="Employment">
              <DetailRow label="Department" value={viewEmployee.department} />
              <DetailRow label="Designation" value={viewEmployee.designation} />
              <DetailRow label="Date of Joining" value={new Date(viewEmployee.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
              <DetailRow label="Reporting To" value={viewEmployee.reportingTo || '—'} />
              <DetailRow label="Shift" value={viewEmployee.shift} />
            </DetailSection>

            <DetailSection title="Compensation">
              <DetailRow label="Monthly CTC" value={formatINR(viewEmployee.salary)} />
              <DetailRow label="Annual CTC" value={formatINR(viewEmployee.salary * 12)} />
              <DetailRow label="Bank Account" value={viewEmployee.bankAccount} />
            </DetailSection>

            <DetailSection title="Statutory">
              <DetailRow label="PAN" value={viewEmployee.pan} />
              <DetailRow label="Aadhaar" value={viewEmployee.aadhaar} />
              <DetailRow label="PF Number" value={viewEmployee.pfNumber || '—'} />
              <DetailRow label="ESI Number" value={viewEmployee.esiNumber || '—'} />
            </DetailSection>

            <DetailSection title="Contact">
              <DetailRow label="Email" value={viewEmployee.email} />
              <DetailRow label="Phone" value={viewEmployee.phone} />
            </DetailSection>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}
