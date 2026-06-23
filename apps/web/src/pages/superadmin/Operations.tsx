import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, Tabs, message, Spin, Space, Row, Col, Statistic, Typography, Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchAdminHealth, fetchAdminActivity, fetchAdminPayments, fetchAdminJobs, runAdminJob,
  type HealthReport, type ActivityRow, type PaymentsLog, type JobsReport,
} from '../../lib/api';

const { Text } = Typography;
const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');
const SVC_LABEL: Record<string, string> = {
  postgres: 'PostgreSQL', redis: 'Redis', celery_worker: 'Celery worker',
  fin_backend: 'Finance API', hr_backend: 'HR backend',
};
const STATUS_COLOR: Record<string, string> = { PAID: 'green', OPEN: 'orange', VOID: 'default' };

export default function Operations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [payments, setPayments] = useState<PaymentsLog | null>(null);
  const [jobs, setJobs] = useState<JobsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, a, p, j] = await Promise.all([
        fetchAdminHealth(true),
        fetchAdminActivity({ limit: 200 }).then(r => r.results).catch(() => []),
        fetchAdminPayments().catch(() => null),
        fetchAdminJobs().catch(() => null),
      ]);
      setHealth(h); setActivity(a); setPayments(p); setJobs(j);
    } catch { message.error('Failed to load operations data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const runDunning = async () => {
    setRunning(true);
    try {
      const r = await runAdminJob('expire_overdue_subscriptions');
      message.success(`Dunning ran — ${r.changed} subscription(s) transitioned.`);
      await load();
    } catch (e) { message.error((e as Error)?.message || 'Failed.'); }
    finally { setRunning(false); }
  };

  const healthTab = (
    <>
      <div style={{ marginBottom: 16 }}>
        <Tag color={health?.overall === 'up' ? 'green' : 'orange'} style={{ fontWeight: 700, fontSize: 14, padding: '4px 12px' }}>
          {health?.overall === 'up' ? '● All systems operational' : '● Degraded'}
        </Tag>
      </div>
      <Row gutter={[16, 16]}>
        {health && Object.entries(health.services).map(([k, s]) => (
          <Col xs={24} sm={12} lg={8} key={k}>
            <Card size="small" style={{ borderRadius: 12, borderLeft: `4px solid ${s.status === 'up' ? '#16a34a' : '#dc2626'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{SVC_LABEL[k] ?? k}</strong>
                <Tag color={s.status === 'up' ? 'green' : 'red'}>{s.status.toUpperCase()}</Tag>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)', marginTop: 4 }}>{s.detail}</div>
              <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.4)' }}>{s.latency_ms} ms</div>
            </Card>
          </Col>
        ))}
      </Row>
      {health?.hr_headcount && (
        <Card size="small" style={{ borderRadius: 12, marginTop: 16 }} title="HR rollup (cached)">
          <Row gutter={16}>
            <Col><Statistic title="Total employees" value={health.hr_headcount.total_employees} /></Col>
            <Col><Statistic title="Tenants counted" value={health.hr_headcount.tenants_counted} /></Col>
            <Col><Statistic title="HR reachable" value={health.hr_headcount.reachable ? 'Yes' : 'No'} /></Col>
          </Row>
        </Card>
      )}
    </>
  );

  const activityCols = [
    { title: 'When', dataIndex: 'at', key: 'at', width: 180, render: (d: string) => new Date(d).toLocaleString() },
    { title: 'Source', dataIndex: 'source', key: 'source', render: (s: string) => <Tag color={s === 'console' ? 'blue' : 'purple'}>{s}</Tag> },
    { title: 'Actor', dataIndex: 'actor', key: 'actor' },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (a: string) => <Tag>{a}</Tag> },
    { title: 'Target', dataIndex: 'target', key: 'target', render: (t: string, r: ActivityRow) => t || r.label || '—' },
    { title: 'Detail', dataIndex: 'detail', key: 'detail', render: (d: object) => <Text code style={{ fontSize: 11 }}>{JSON.stringify(d)}</Text> },
  ];

  const invoiceCols = [
    { title: 'Invoice #', dataIndex: 'number', key: 'number', render: (n: string) => n || '—' },
    { title: 'Company', dataIndex: 'company', key: 'company' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: string) => inr(a) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag> },
    { title: 'Paid at', dataIndex: 'paid_at', key: 'paid_at', render: (d: string | null) => d ? new Date(d).toLocaleString() : '—' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#FAFAFC' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', background: '#fff', borderBottom: '1px solid rgba(10,17,40,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/superadmin"><SapttaLogo /></Link>
          <Tag color="purple" style={{ fontWeight: 700 }}>SUPER ADMIN</Tag>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <span style={{ fontSize: 13, color: 'rgba(10,17,40,0.5)' }}>{user?.email}</span>
          <Button onClick={() => { logout(); navigate('/'); }}>Sign Out</Button>
        </Space>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '24px' }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/superadmin')} style={{ paddingLeft: 0 }}>Back to overview</Button>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 16px' }}>Operations</h1>

        {loading && !health ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : (
          <Tabs
            defaultActiveKey="health"
            items={[
              { key: 'health', label: 'Health', children: healthTab },
              {
                key: 'activity', label: `Activity (${activity.length})`,
                children: (
                  <Card><Table rowKey={(r: ActivityRow) => `${r.source}-${r.at}-${r.action}-${r.target}`} size="small" columns={activityCols as never}
                    dataSource={activity} pagination={{ pageSize: 15 }} locale={{ emptyText: 'No activity yet.' }} /></Card>
                ),
              },
              {
                key: 'payments', label: 'Payments',
                children: (
                  <>
                    {payments && (
                      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[['Paid', payments.summary.paid], ['Open', payments.summary.open], ['Void', payments.summary.void], ['Webhook events', payments.summary.webhook_events]].map(([t, v]) => (
                          <Col xs={12} md={6} key={t as string}><Card size="small" style={{ borderRadius: 12 }}><Statistic title={t as string} value={v as number} /></Card></Col>
                        ))}
                      </Row>
                    )}
                    <Card title="SaaS invoices" style={{ marginBottom: 16 }}>
                      <Table rowKey="id" size="small" columns={invoiceCols as never} dataSource={payments?.invoices ?? []}
                        pagination={{ pageSize: 8 }} locale={{ emptyText: 'No invoices yet.' }} />
                    </Card>
                    <Card title="Inbound webhook events">
                      <Table rowKey="id" size="small"
                        columns={[
                          { title: 'Received', dataIndex: 'received_at', key: 'received_at', render: (d: string) => new Date(d).toLocaleString() },
                          { title: 'Event ID', dataIndex: 'event_id', key: 'event_id', render: (e: string) => <Text code>{e}</Text> },
                        ] as never}
                        dataSource={payments?.webhook_events ?? []} pagination={{ pageSize: 8 }}
                        locale={{ emptyText: 'No webhook events recorded.' }} />
                    </Card>
                  </>
                ),
              },
              {
                key: 'automation', label: 'Automation',
                children: (
                  <>
                    <Card style={{ marginBottom: 16 }} title="Lifecycle candidates"
                      extra={<Popconfirm title="Run the overdue-subscription job now?" onConfirm={runDunning}>
                        <Button type="primary" loading={running}>Run dunning now</Button>
                      </Popconfirm>}>
                      <Row gutter={16}>
                        <Col><Statistic title="Active but lapsed → PAST_DUE" value={jobs?.candidates.active_lapsed ?? 0} /></Col>
                        <Col><Statistic title="Past-due past grace → CANCELLED" value={jobs?.candidates.past_due_to_cancel ?? 0} /></Col>
                      </Row>
                    </Card>
                    <Card title="Scheduled jobs (Celery beat)">
                      <Table rowKey="name" size="small"
                        columns={[
                          { title: 'Name', dataIndex: 'name', key: 'name' },
                          { title: 'Task', dataIndex: 'task', key: 'task', render: (t: string) => <Text code style={{ fontSize: 11 }}>{t}</Text> },
                          { title: 'Schedule', dataIndex: 'schedule', key: 'schedule', render: (s: string) => <Text type="secondary" style={{ fontSize: 12 }}>{s}</Text> },
                        ] as never}
                        dataSource={jobs?.jobs ?? []} pagination={false} />
                    </Card>
                  </>
                ),
              },
            ]}
          />
        )}
      </main>
    </div>
  );
}
