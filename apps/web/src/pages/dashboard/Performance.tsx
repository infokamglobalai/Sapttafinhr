import { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, Progress, Tabs, message } from 'antd';
import { PlusOutlined, StarFilled, TrophyOutlined, AimOutlined, EditOutlined } from '@ant-design/icons';
import { MOCK_EMPLOYEES } from '../../data/hrms-mock';

const { Option } = Select;
const { TextArea } = Input;

interface Review {
  id: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  period: string;
  reviewer: string;
  status: 'pending' | 'self_review' | 'manager_review' | 'completed';
  selfRating: number | null;
  managerRating: number | null;
  overallRating: number | null;
  strengths: string;
  improvements: string;
}

interface Goal {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  category: 'individual' | 'team' | 'company';
  progress: number;
  dueDate: string;
  status: 'on_track' | 'at_risk' | 'completed' | 'overdue';
}

const reviewStatusCfg: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: 'Not Started' },
  self_review: { color: 'blue', label: 'Self Review' },
  manager_review: { color: 'orange', label: 'Manager Review' },
  completed: { color: 'green', label: 'Completed' },
};

const goalStatusCfg: Record<string, { color: string; label: string }> = {
  on_track: { color: '#10B981', label: 'On Track' },
  at_risk: { color: '#F59E0B', label: 'At Risk' },
  completed: { color: '#6366F1', label: 'Completed' },
  overdue: { color: '#EF4444', label: 'Overdue' },
};

const MOCK_REVIEWS: Review[] = [
  { id: 'rv1', employeeId: 'e1', employeeName: 'Rahul Sharma', empCode: 'SAP-001', period: 'H2 FY25-26', reviewer: 'Vikram Patel', status: 'completed', selfRating: 4.2, managerRating: 4.5, overallRating: 4.4, strengths: 'Strong technical leadership, mentors junior devs effectively', improvements: 'Could delegate more to grow team autonomy' },
  { id: 'rv2', employeeId: 'e2', employeeName: 'Priya Patel', empCode: 'SAP-002', period: 'H2 FY25-26', reviewer: 'Rahul Sharma', status: 'manager_review', selfRating: 4.0, managerRating: null, overallRating: null, strengths: 'Fast learner, reliable delivery', improvements: '' },
  { id: 'rv3', employeeId: 'e3', employeeName: 'Amit Kumar', empCode: 'SAP-003', period: 'H2 FY25-26', reviewer: 'Neha Gupta', status: 'completed', selfRating: 3.8, managerRating: 3.5, overallRating: 3.6, strengths: 'Good client relationships', improvements: 'Needs improvement in CRM usage and reporting' },
  { id: 'rv4', employeeId: 'e5', employeeName: 'Arjun Mehta', empCode: 'SAP-005', period: 'H2 FY25-26', reviewer: 'Vikram Patel', status: 'self_review', selfRating: null, managerRating: null, overallRating: null, strengths: '', improvements: '' },
  { id: 'rv5', employeeId: 'e6', employeeName: 'Sneha Reddy', empCode: 'SAP-006', period: 'H2 FY25-26', reviewer: 'Vikram Patel', status: 'completed', selfRating: 4.5, managerRating: 4.7, overallRating: 4.6, strengths: 'Excellent HR strategy, improved retention by 18%', improvements: 'Could be more data-driven in decision making' },
  { id: 'rv6', employeeId: 'e9', employeeName: 'Deepak Singh', empCode: 'SAP-009', period: 'H2 FY25-26', reviewer: 'Arjun Mehta', status: 'pending', selfRating: null, managerRating: null, overallRating: null, strengths: '', improvements: '' },
];

const MOCK_GOALS: Goal[] = [
  { id: 'g1', employeeId: 'e1', employeeName: 'Rahul Sharma', title: 'Ship v2.0 of billing module', description: 'Complete all billing module features with 90%+ test coverage', category: 'individual', progress: 85, dueDate: '2026-06-30', status: 'on_track' },
  { id: 'g2', employeeId: 'e1', employeeName: 'Rahul Sharma', title: 'Mentor 2 junior developers', description: 'Conduct weekly 1-on-1s and code reviews', category: 'individual', progress: 100, dueDate: '2026-05-31', status: 'completed' },
  { id: 'g3', employeeId: 'e3', employeeName: 'Amit Kumar', title: 'Close 15 enterprise deals', description: 'Achieve quarterly sales target of 15 enterprise accounts', category: 'individual', progress: 60, dueDate: '2026-06-30', status: 'at_risk' },
  { id: 'g4', employeeId: 'e6', employeeName: 'Sneha Reddy', title: 'Reduce attrition to <10%', description: 'Implement retention programs and exit interview feedback loops', category: 'company', progress: 78, dueDate: '2026-03-31', status: 'completed' },
  { id: 'g5', employeeId: 'e7', employeeName: 'Vikram Patel', title: 'Launch mobile app MVP', description: 'Ship Android + iOS app with attendance and leave features', category: 'company', progress: 40, dueDate: '2026-07-31', status: 'on_track' },
  { id: 'g6', employeeId: 'e5', employeeName: 'Arjun Mehta', title: 'Optimize warehouse fulfilment', description: 'Reduce order processing time by 30%', category: 'team', progress: 25, dueDate: '2026-05-15', status: 'overdue' },
];

export default function Performance() {
  const [tab, setTab] = useState('reviews');

  const completedReviews = MOCK_REVIEWS.filter(r => r.status === 'completed').length;
  const avgRating = MOCK_REVIEWS.filter(r => r.overallRating).reduce((s, r) => s + (r.overallRating || 0), 0) / (completedReviews || 1);

  const reviewColumns = [
    {
      title: 'Employee', key: 'name',
      render: (_: unknown, r: Review) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#FF6D00' }}>
            {r.employeeName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.employeeName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.empCode}</div>
          </div>
        </div>
      ),
    },
    { title: 'Period', dataIndex: 'period', key: 'period', render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: 'Reviewer', dataIndex: 'reviewer', key: 'reviewer', render: (v: string) => <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{v}</span> },
    {
      title: 'Self', key: 'self',
      render: (_: unknown, r: Review) => r.selfRating ? <RatingBadge value={r.selfRating} /> : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Manager', key: 'manager',
      render: (_: unknown, r: Review) => r.managerRating ? <RatingBadge value={r.managerRating} /> : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Overall', key: 'overall',
      render: (_: unknown, r: Review) => r.overallRating ? <RatingBadge value={r.overallRating} size="large" /> : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: Review) => <Tag color={reviewStatusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{reviewStatusCfg[r.status]?.label}</Tag>,
    },
  ];

  const goalColumns = [
    {
      title: 'Goal', key: 'goal',
      render: (_: unknown, r: Goal) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{r.title}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.employeeName} · Due {new Date(r.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
        </div>
      ),
    },
    {
      title: 'Category', key: 'category',
      render: (_: unknown, r: Goal) => (
        <Tag style={{ fontSize: 11, borderRadius: 6, textTransform: 'capitalize' as const }}>{r.category}</Tag>
      ),
    },
    {
      title: 'Progress', key: 'progress', width: 200,
      render: (_: unknown, r: Goal) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Progress percent={r.progress} size="small" strokeColor={goalStatusCfg[r.status]?.color} showInfo={false} style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: goalStatusCfg[r.status]?.color, minWidth: 36 }}>{r.progress}%</span>
        </div>
      ),
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: Goal) => (
        <span style={{ fontSize: 11, fontWeight: 600, color: goalStatusCfg[r.status]?.color, background: `${goalStatusCfg[r.status]?.color}12`, padding: '3px 10px', borderRadius: 6 }}>
          {goalStatusCfg[r.status]?.label}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Performance</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Reviews, KPIs, goals & appraisals</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Avg Rating</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StarFilled style={{ color: '#F59E0B', fontSize: 18 }} />
            <span style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B' }}>{avgRating.toFixed(1)}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>/ 5.0</span>
          </div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Reviews Done</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981' }}>{completedReviews}/{MOCK_REVIEWS.length}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Goals Completed</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#6366F1' }}>{MOCK_GOALS.filter(g => g.status === 'completed').length}/{MOCK_GOALS.length}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>At Risk</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#EF4444' }}>{MOCK_GOALS.filter(g => g.status === 'at_risk' || g.status === 'overdue').length}</div>
        </div>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'reviews',
          label: `Performance Reviews (${MOCK_REVIEWS.length})`,
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table dataSource={MOCK_REVIEWS} columns={reviewColumns} rowKey="id" pagination={false} size="middle" />
            </div>
          ),
        },
        {
          key: 'goals',
          label: `Goals & OKRs (${MOCK_GOALS.length})`,
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table dataSource={MOCK_GOALS} columns={goalColumns} rowKey="id" pagination={false} size="middle" />
            </div>
          ),
        },
      ]} />
    </div>
  );
}

function RatingBadge({ value, size = 'default' }: { value: number; size?: 'default' | 'large' }) {
  const color = value >= 4.0 ? '#10B981' : value >= 3.0 ? '#F59E0B' : '#EF4444';
  return (
    <span style={{
      fontSize: size === 'large' ? 15 : 13, fontWeight: size === 'large' ? 800 : 700, color,
      background: `${color}12`, padding: size === 'large' ? '4px 10px' : '2px 8px', borderRadius: 6,
      display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      <StarFilled style={{ fontSize: size === 'large' ? 12 : 10 }} />
      {value.toFixed(1)}
    </span>
  );
}
