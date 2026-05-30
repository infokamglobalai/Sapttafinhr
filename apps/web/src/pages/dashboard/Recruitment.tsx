import { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, Tabs, message, Drawer } from 'antd';
import { PlusOutlined, EyeOutlined, UserAddOutlined, CalendarOutlined, CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full_time' | 'part_time' | 'contract';
  status: 'open' | 'closed' | 'on_hold';
  applicants: number;
  shortlisted: number;
  postedDate: string;
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  jobTitle: string;
  status: 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected';
  appliedDate: string;
  resumeScore: number;
  interviewDate: string | null;
  notes: string;
}

const jobStatusCfg: Record<string, { color: string; label: string }> = {
  open: { color: 'green', label: 'Open' },
  closed: { color: 'default', label: 'Closed' },
  on_hold: { color: 'orange', label: 'On Hold' },
};

const applicantStatusCfg: Record<string, { color: string; label: string }> = {
  applied: { color: 'blue', label: 'Applied' },
  screening: { color: 'cyan', label: 'Screening' },
  interview: { color: 'orange', label: 'Interview' },
  offered: { color: 'purple', label: 'Offered' },
  hired: { color: 'green', label: 'Hired' },
  rejected: { color: 'red', label: 'Rejected' },
};

const MOCK_JOBS: JobPosting[] = [
  { id: 'j1', title: 'Senior Full Stack Developer', department: 'Engineering', location: 'Bengaluru (Hybrid)', type: 'full_time', status: 'open', applicants: 34, shortlisted: 8, postedDate: '2026-05-01' },
  { id: 'j2', title: 'Sales Executive', department: 'Sales', location: 'Mumbai', type: 'full_time', status: 'open', applicants: 22, shortlisted: 5, postedDate: '2026-05-10' },
  { id: 'j3', title: 'HR Executive', department: 'Human Resources', location: 'Bengaluru', type: 'full_time', status: 'on_hold', applicants: 15, shortlisted: 3, postedDate: '2026-04-20' },
  { id: 'j4', title: 'QA Engineer (Contract)', department: 'Engineering', location: 'Remote', type: 'contract', status: 'open', applicants: 12, shortlisted: 4, postedDate: '2026-05-15' },
  { id: 'j5', title: 'Accounts Manager', department: 'Finance', location: 'Bengaluru', type: 'full_time', status: 'closed', applicants: 28, shortlisted: 6, postedDate: '2026-03-15' },
];

const MOCK_APPLICANTS: Applicant[] = [
  { id: 'a1', name: 'Aditya Verma', email: 'aditya.v@gmail.com', phone: '9988776655', jobId: 'j1', jobTitle: 'Senior Full Stack Developer', status: 'interview', appliedDate: '2026-05-05', resumeScore: 92, interviewDate: '2026-05-30', notes: 'Strong React + Node.js. 6 YOE.' },
  { id: 'a2', name: 'Sanya Malik', email: 'sanya.m@outlook.com', phone: '9877665544', jobId: 'j1', jobTitle: 'Senior Full Stack Developer', status: 'screening', appliedDate: '2026-05-08', resumeScore: 78, interviewDate: null, notes: 'Good Django background. Needs frontend assessment.' },
  { id: 'a3', name: 'Rohan Joshi', email: 'rohan.j@yahoo.com', phone: '9766554433', jobId: 'j1', jobTitle: 'Senior Full Stack Developer', status: 'offered', appliedDate: '2026-05-03', resumeScore: 95, interviewDate: '2026-05-22', notes: 'Excellent. 8 YOE. Previous lead at Flipkart.' },
  { id: 'a4', name: 'Divya Nair', email: 'divya.n@gmail.com', phone: '9655443322', jobId: 'j2', jobTitle: 'Sales Executive', status: 'applied', appliedDate: '2026-05-18', resumeScore: 68, interviewDate: null, notes: '' },
  { id: 'a5', name: 'Karan Singh', email: 'karan.s@gmail.com', phone: '9544332211', jobId: 'j2', jobTitle: 'Sales Executive', status: 'interview', appliedDate: '2026-05-12', resumeScore: 82, interviewDate: '2026-05-28', notes: 'B2B SaaS sales experience. Good fit.' },
  { id: 'a6', name: 'Meghna Reddy', email: 'meghna.r@gmail.com', phone: '9433221100', jobId: 'j4', jobTitle: 'QA Engineer (Contract)', status: 'hired', appliedDate: '2026-05-16', resumeScore: 88, interviewDate: '2026-05-24', notes: 'Hired on 3-month contract. Start date: Jun 1.' },
  { id: 'a7', name: 'Ankit Patel', email: 'ankit.p@gmail.com', phone: '9322110099', jobId: 'j1', jobTitle: 'Senior Full Stack Developer', status: 'rejected', appliedDate: '2026-05-06', resumeScore: 45, interviewDate: null, notes: 'Insufficient experience with TypeScript.' },
];

export default function Recruitment() {
  const [tab, setTab] = useState('pipeline');
  const [applicants, setApplicants] = useState(MOCK_APPLICANTS);
  const [showJobForm, setShowJobForm] = useState(false);
  const [viewApplicant, setViewApplicant] = useState<Applicant | null>(null);
  const [jobForm] = Form.useForm();

  const pipeline = ['applied', 'screening', 'interview', 'offered', 'hired'];
  const pipelineCounts = pipeline.map(s => ({ status: s, ...applicantStatusCfg[s], count: applicants.filter(a => a.status === s).length }));

  const moveApplicant = (id: string, newStatus: string) => {
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as Applicant['status'] } : a));
    message.success(`Moved to ${applicantStatusCfg[newStatus]?.label}`);
  };

  const handlePostJob = () => {
    jobForm.validateFields().then(() => {
      setShowJobForm(false);
      jobForm.resetFields();
      message.success('Job posted successfully');
    });
  };

  const jobColumns = [
    {
      title: 'Position', key: 'title',
      render: (_: unknown, r: JobPosting) => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{r.title}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.department} · {r.location}</div>
        </div>
      ),
    },
    { title: 'Type', key: 'type', render: (_: unknown, r: JobPosting) => <Tag style={{ fontSize: 11, borderRadius: 6, textTransform: 'capitalize' as const }}>{r.type.replace('_', ' ')}</Tag> },
    { title: 'Applicants', dataIndex: 'applicants', key: 'applicants', render: (v: number) => <span style={{ fontSize: 14, fontWeight: 700 }}>{v}</span> },
    { title: 'Shortlisted', dataIndex: 'shortlisted', key: 'shortlisted', render: (v: number) => <span style={{ fontSize: 14, fontWeight: 700, color: '#10B981' }}>{v}</span> },
    { title: 'Posted', dataIndex: 'postedDate', key: 'posted', render: (d: string) => <span style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span> },
    { title: 'Status', key: 'status', render: (_: unknown, r: JobPosting) => <Tag color={jobStatusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{jobStatusCfg[r.status]?.label}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Recruitment</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Job postings, applicant tracking & interview scheduling</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowJobForm(true)} style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Post New Job
        </Button>
      </div>

      {/* Pipeline summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {pipelineCounts.map((p, i) => (
          <div key={p.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '10px 16px', border: '1px solid var(--color-border)', minWidth: 100, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: p.color }}>{p.count}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>{p.label}</div>
            </div>
            {i < pipelineCounts.length - 1 && <span style={{ color: 'var(--color-text-muted)', fontSize: 16 }}>→</span>}
          </div>
        ))}
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'pipeline',
          label: `Applicant Pipeline (${applicants.length})`,
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table dataSource={applicants} rowKey="id" pagination={{ pageSize: 10 }} size="middle" columns={[
                {
                  title: 'Candidate', key: 'name',
                  render: (_: unknown, r: Applicant) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#FF6D00' }}>
                        {r.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.email}</div>
                      </div>
                    </div>
                  ),
                },
                { title: 'Position', dataIndex: 'jobTitle', key: 'job', render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span> },
                {
                  title: 'AI Score', key: 'score',
                  render: (_: unknown, r: Applicant) => (
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.resumeScore >= 80 ? '#10B981' : r.resumeScore >= 60 ? '#F59E0B' : '#EF4444' }}>
                      {r.resumeScore}%
                    </span>
                  ),
                  sorter: (a: Applicant, b: Applicant) => a.resumeScore - b.resumeScore,
                },
                {
                  title: 'Stage', key: 'status',
                  render: (_: unknown, r: Applicant) => <Tag color={applicantStatusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{applicantStatusCfg[r.status]?.label}</Tag>,
                },
                {
                  title: 'Interview', key: 'interview',
                  render: (_: unknown, r: Applicant) => r.interviewDate
                    ? <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><CalendarOutlined style={{ color: '#FF6D00' }} /> {new Date(r.interviewDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>,
                },
                {
                  title: '', key: 'actions', width: 140,
                  render: (_: unknown, r: Applicant) => (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setViewApplicant(r)} style={{ color: '#FF6D00' }} />
                      {r.status === 'applied' && <Button size="small" onClick={() => moveApplicant(r.id, 'screening')} style={{ fontSize: 11, borderRadius: 6 }}>Screen</Button>}
                      {r.status === 'screening' && <Button size="small" onClick={() => moveApplicant(r.id, 'interview')} style={{ fontSize: 11, borderRadius: 6 }}>Schedule</Button>}
                      {r.status === 'interview' && <Button size="small" onClick={() => moveApplicant(r.id, 'offered')} style={{ fontSize: 11, borderRadius: 6, background: '#10B981', color: 'white', border: 'none' }}>Offer</Button>}
                      {r.status === 'offered' && <Button size="small" onClick={() => moveApplicant(r.id, 'hired')} style={{ fontSize: 11, borderRadius: 6, background: '#8B5CF6', color: 'white', border: 'none' }}>Hire</Button>}
                    </div>
                  ),
                },
              ]} />
            </div>
          ),
        },
        {
          key: 'jobs',
          label: `Job Postings (${MOCK_JOBS.length})`,
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table dataSource={MOCK_JOBS} columns={jobColumns} rowKey="id" pagination={false} size="middle" />
            </div>
          ),
        },
      ]} />

      {/* Post job modal */}
      <Modal open={showJobForm} onCancel={() => setShowJobForm(false)} onOk={handlePostJob}
        title={<span style={{ fontWeight: 700 }}>Post New Job</span>}
        okText="Post Job" okButtonProps={{ style: { background: '#FF6D00', border: 'none', fontWeight: 600 } }}>
        <Form form={jobForm} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Job Title" rules={[{ required: true }]}><Input placeholder="e.g. Senior Developer" /></Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="department" label="Department" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select">{['Engineering', 'Sales', 'HR', 'Finance', 'Operations'].map(d => <Option key={d} value={d}>{d}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select"><Option value="full_time">Full Time</Option><Option value="part_time">Part Time</Option><Option value="contract">Contract</Option></Select>
            </Form.Item>
          </div>
          <Form.Item name="location" label="Location" rules={[{ required: true }]}><Input placeholder="e.g. Bengaluru (Hybrid)" /></Form.Item>
          <Form.Item name="description" label="Job Description"><TextArea rows={3} placeholder="Role responsibilities, requirements..." /></Form.Item>
        </Form>
      </Modal>

      {/* Applicant drawer */}
      <Drawer open={!!viewApplicant} onClose={() => setViewApplicant(null)} width={400} title={<span style={{ fontWeight: 700 }}>{viewApplicant?.name}</span>}>
        {viewApplicant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6D00, #FFA000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20, margin: '0 auto 10px' }}>
                {viewApplicant.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{viewApplicant.name}</div>
              <Tag color={applicantStatusCfg[viewApplicant.status]?.color} style={{ marginTop: 6, borderRadius: 6 }}>{applicantStatusCfg[viewApplicant.status]?.label}</Tag>
            </div>
            <Row label="Position" value={viewApplicant.jobTitle} />
            <Row label="Email" value={viewApplicant.email} />
            <Row label="Phone" value={viewApplicant.phone} />
            <Row label="Applied" value={new Date(viewApplicant.appliedDate).toLocaleDateString('en-IN')} />
            <Row label="AI Resume Score" value={`${viewApplicant.resumeScore}%`} />
            {viewApplicant.interviewDate && <Row label="Interview" value={new Date(viewApplicant.interviewDate).toLocaleDateString('en-IN')} />}
            {viewApplicant.notes && (
              <div style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{viewApplicant.notes}</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
