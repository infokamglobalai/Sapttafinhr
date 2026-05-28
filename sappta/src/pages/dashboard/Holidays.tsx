import { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import { MOCK_HOLIDAYS, type Holiday } from '../../data/hrms-mock';

const { Option } = Select;

const typeConfig: Record<string, { color: string; label: string }> = {
  national: { color: 'red', label: 'National' },
  company: { color: 'orange', label: 'Company' },
  restricted: { color: 'blue', label: 'Restricted' },
};

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>(MOCK_HOLIDAYS);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form] = Form.useForm();

  const sorted = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter(h => new Date(h.date) >= new Date());
  const past = sorted.filter(h => new Date(h.date) < new Date());

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    setShowForm(true);
  };

  const handleEdit = (h: Holiday) => {
    setEditing(h);
    form.setFieldsValue(h);
    setShowForm(true);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      if (editing) {
        setHolidays(prev => prev.map(h => h.id === editing.id ? { ...h, ...values } : h));
        message.success('Holiday updated');
      } else {
        setHolidays(prev => [...prev, { id: 'h_' + Date.now(), ...values }]);
        message.success('Holiday added');
      }
      setShowForm(false);
    });
  };

  const handleDelete = (h: Holiday) => {
    Modal.confirm({
      title: `Remove ${h.name}?`, okText: 'Remove', okButtonProps: { danger: true },
      onOk: () => { setHolidays(prev => prev.filter(x => x.id !== h.id)); message.success('Holiday removed'); },
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  const columns = [
    {
      title: 'Holiday', key: 'name',
      render: (_: unknown, r: Holiday) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${typeConfig[r.type]?.color === 'red' ? '#FFEBEE' : typeConfig[r.type]?.color === 'orange' ? '#FFF3E0' : '#E3F2FD'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalendarOutlined style={{ color: typeConfig[r.type]?.color === 'red' ? '#C62828' : typeConfig[r.type]?.color === 'orange' ? '#E65100' : '#1565C0', fontSize: 16 }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.name}</span>
        </div>
      ),
    },
    {
      title: 'Date', dataIndex: 'date', key: 'date',
      render: (d: string) => <span style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(d)}</span>,
    },
    {
      title: 'Type', key: 'type',
      render: (_: unknown, r: Holiday) => <Tag color={typeConfig[r.type]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{typeConfig[r.type]?.label}</Tag>,
    },
    {
      title: 'Applicable', dataIndex: 'applicable', key: 'applicable',
      render: (v: string) => <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{v}</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, r: Holiday) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} style={{ color: '#FF6D00' }} />
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r)} style={{ color: '#EF4444' }} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Holiday Calendar</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {holidays.length} holidays in 2026 · {upcoming.length} upcoming
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
          style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Add Holiday
        </Button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(typeConfig).map(([key, cfg]) => {
          const count = holidays.filter(h => h.type === key).length;
          return (
            <div key={key} style={{ background: '#FFFFFF', borderRadius: 10, padding: '12px 20px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag color={cfg.color} style={{ fontSize: 11, borderRadius: 6, margin: 0 }}>{cfg.label}</Tag>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={sorted} columns={columns} rowKey="id" pagination={false} size="middle" />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showForm} onCancel={() => setShowForm(false)} onOk={handleSave}
        title={<span style={{ fontWeight: 700 }}>{editing ? 'Edit Holiday' : 'Add Holiday'}</span>}
        okText={editing ? 'Update' : 'Add'}
        okButtonProps={{ style: { background: '#FF6D00', border: 'none', fontWeight: 600 } }}
      >
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Holiday Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Diwali" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select type">
                <Option value="national">National</Option>
                <Option value="company">Company</Option>
                <Option value="restricted">Restricted</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="applicable" label="Applicable To" initialValue="All">
            <Input placeholder="e.g. All, Optional, Engineering only" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
