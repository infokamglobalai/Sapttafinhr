import { useState } from 'react';
import { Table, Tag, Select, Input, Button } from 'antd';
import { SearchOutlined, DownloadOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { MOCK_ATTENDANCE, MOCK_DEPARTMENTS, type AttendanceRecord } from '../../data/hrms-mock';

const { Option } = Select;

const statusConfig: Record<string, { color: string; label: string }> = {
  present: { color: 'green', label: 'Present' },
  absent: { color: 'red', label: 'Absent' },
  half_day: { color: 'orange', label: 'Half Day' },
  late: { color: 'gold', label: 'Late' },
  on_leave: { color: 'blue', label: 'On Leave' },
  holiday: { color: 'purple', label: 'Holiday' },
  week_off: { color: 'default', label: 'Week Off' },
};

const methodConfig: Record<string, { color: string; label: string }> = {
  biometric: { color: '#10B981', label: 'Biometric' },
  geo: { color: '#FF6D00', label: 'Geo-fence' },
  mobile: { color: '#6366F1', label: 'Mobile' },
  manual: { color: '#64748B', label: 'Manual' },
};

export default function Attendance() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const data = MOCK_ATTENDANCE;
  const present = data.filter(a => a.status === 'present' || a.status === 'late').length;
  const absent = data.filter(a => a.status === 'absent').length;
  const late = data.filter(a => a.status === 'late').length;
  const halfDay = data.filter(a => a.status === 'half_day').length;

  const filtered = data.filter(a => {
    const matchSearch = !search || a.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, r: AttendanceRecord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: statusConfig[r.status]?.color === 'green' ? '#E8F5E9' : statusConfig[r.status]?.color === 'red' ? '#FFEBEE' : '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: r.status === 'present' ? '#2E7D32' : r.status === 'absent' ? '#C62828' : '#E65100', flexShrink: 0 }}>
            {r.employeeName.split(' ').map(n => n[0]).join('')}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.employeeName}</span>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (s: string) => <Tag color={statusConfig[s]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{statusConfig[s]?.label}</Tag>,
    },
    {
      title: 'Punch In',
      key: 'punchIn',
      render: (_: unknown, r: AttendanceRecord) => (
        <span style={{ fontSize: 13, fontWeight: r.punchIn ? 600 : 400, color: r.punchIn ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          {r.punchIn || '—'}
        </span>
      ),
    },
    {
      title: 'Punch Out',
      key: 'punchOut',
      render: (_: unknown, r: AttendanceRecord) => (
        <span style={{ fontSize: 13, fontWeight: r.punchOut ? 600 : 400, color: r.punchOut ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          {r.punchOut || '—'}
        </span>
      ),
    },
    {
      title: 'Hours',
      key: 'hours',
      render: (_: unknown, r: AttendanceRecord) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: r.hoursWorked >= 8 ? '#10B981' : r.hoursWorked > 0 ? '#FF8F00' : 'var(--color-text-muted)' }}>
          {r.hoursWorked > 0 ? `${r.hoursWorked}h` : '—'}
        </span>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_: unknown, r: AttendanceRecord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <EnvironmentOutlined style={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.location}</span>
        </div>
      ),
    },
    {
      title: 'Method',
      key: 'method',
      render: (_: unknown, r: AttendanceRecord) => {
        const m = methodConfig[r.method];
        return (
          <span style={{ fontSize: 11, fontWeight: 600, color: m?.color, background: `${m?.color}15`, padding: '2px 8px', borderRadius: 6 }}>
            {m?.label}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Attendance</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{today}</p>
        </div>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Export Report</Button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <SummaryCard label="Present" value={present} total={data.length} color="#10B981" />
        <SummaryCard label="Absent" value={absent} total={data.length} color="#EF4444" />
        <SummaryCard label="Late" value={late} total={data.length} color="#F59E0B" />
        <SummaryCard label="Half Day" value={halfDay} total={data.length} color="#FF6D00" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
          placeholder="Search employee..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 260, borderRadius: 8 }} allowClear
        />
        <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ minWidth: 130 }}>
          {Object.entries(statusConfig).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
        </Select>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: '-0.5px' }}>{value}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>/ {total} ({pct}%)</span>
      </div>
      <div style={{ height: 4, background: '#F1F3F5', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}
