import { useState } from 'react';
import { Button, Input, Modal, Form, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { MOCK_DEPARTMENTS, type Department } from '../../data/hrms-mock';

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form] = Form.useForm();
  const [newDesignation, setNewDesignation] = useState('');
  const [designations, setDesignations] = useState<string[]>([]);

  const handleAdd = () => {
    setEditing(null);
    setDesignations([]);
    form.resetFields();
    setShowForm(true);
  };

  const handleEdit = (dept: Department) => {
    setEditing(dept);
    setDesignations(dept.designations);
    form.setFieldsValue({ name: dept.name, head: dept.head });
    setShowForm(true);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      if (editing) {
        setDepartments(prev => prev.map(d => d.id === editing.id ? { ...d, ...values, designations } : d));
        message.success('Department updated');
      } else {
        setDepartments(prev => [...prev, {
          id: 'd_' + Date.now(), ...values, employeeCount: 0, designations,
        }]);
        message.success('Department added');
      }
      setShowForm(false);
    });
  };

  const handleDelete = (dept: Department) => {
    if (dept.employeeCount > 0) {
      message.warning(`Cannot delete ${dept.name} — it has ${dept.employeeCount} employee(s). Reassign them first.`);
      return;
    }
    Modal.confirm({
      title: `Delete ${dept.name}?`,
      content: 'This department and all its designations will be removed.',
      okText: 'Delete', okButtonProps: { danger: true },
      onOk: () => {
        setDepartments(prev => prev.filter(d => d.id !== dept.id));
        message.success('Department deleted');
      },
    });
  };

  const addDesignation = () => {
    if (newDesignation.trim() && !designations.includes(newDesignation.trim())) {
      setDesignations([...designations, newDesignation.trim()]);
      setNewDesignation('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Departments</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {departments.length} departments · {departments.reduce((s, d) => s + d.employeeCount, 0)} total employees
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
          style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Add Department
        </Button>
      </div>

      {/* Department cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {departments.map(dept => (
          <div key={dept.id} style={{
            background: '#FFFFFF', borderRadius: 16, padding: '24px', border: '1px solid var(--color-border)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,17,40,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,109,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6D00', fontSize: 18 }}>
                  <TeamOutlined />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{dept.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Head: {dept.head}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(dept)} style={{ color: '#FF6D00' }} />
                <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(dept)} style={{ color: '#EF4444' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#FF6D00' }}>{dept.employeeCount}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>employees</span>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Designations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {dept.designations.map(d => (
                <Tag key={d} style={{ fontSize: 11, borderRadius: 6, background: '#F9FAFB', border: '1px solid var(--color-border)' }}>{d}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showForm} onCancel={() => setShowForm(false)} onOk={handleSave}
        title={<span style={{ fontWeight: 700 }}>{editing ? 'Edit Department' : 'Add Department'}</span>}
        okText={editing ? 'Update' : 'Add'}
        okButtonProps={{ style: { background: '#FF6D00', border: 'none', fontWeight: 600 } }}
      >
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Department Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Marketing" />
          </Form.Item>
          <Form.Item name="head" label="Department Head">
            <Input placeholder="e.g. Priya Sharma" />
          </Form.Item>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--color-text-primary)' }}>Designations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {designations.map(d => (
                <Tag key={d} closable onClose={() => setDesignations(prev => prev.filter(x => x !== d))} style={{ borderRadius: 6 }}>{d}</Tag>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="Add designation..." value={newDesignation} onChange={e => setNewDesignation(e.target.value)} onPressEnter={addDesignation} style={{ maxWidth: 250 }} />
              <Button icon={<PlusOutlined />} onClick={addDesignation}>Add</Button>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
