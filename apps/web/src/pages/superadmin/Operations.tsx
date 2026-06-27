import { useEffect, useState, useCallback } from 'react';
import {
  Button, Card, Table, Tag, Tabs, message, Spin, Space, Row, Col, Statistic, Typography, Popconfirm, Input, Empty, Tooltip
} from 'antd';
import { ReloadOutlined, DatabaseOutlined, SyncOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import {
  fetchAdminHealth, fetchAdminActivity, fetchAdminPayments, fetchAdminJobs, runAdminJob,
  invoiceAction,
  type HealthReport, type ActivityRow, type PaymentsLog, type JobsReport
} from '../../lib/api';

const { Text } = Typography;
const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

const SVC_LABEL: Record<string, string> = {
  postgres: 'PostgreSQL Database',
  redis: 'Redis Cache',
  celery_worker: 'Celery Task Queue',
  fin_backend: 'Finance REST API',
  hr_backend: 'HRM Microservice',
};

const STATUS_COLOR: Record<string, string> = { PAID: 'success', OPEN: 'warning', VOID: 'default', REFUNDED: 'purple' };

export default function Operations() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [payments, setPayments] = useState<PaymentsLog | null>(null);
  const [jobs, setJobs] = useState<JobsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Search & Filter local states for activity logs
  const [actorSearch, setActorSearch] = useState('');
  const [actionSearch, setActionSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, a, p, j] = await Promise.all([
        fetchAdminHealth(true),
        fetchAdminActivity({ limit: 200 }).then(r => r.results).catch(() => []),
        fetchAdminPayments().catch(() => null),
        fetchAdminJobs().catch(() => null),
      ]);
      setHealth(h);
      setActivity(a);
      setPayments(p);
      setJobs(j);
    } catch {
      message.error('Failed to load operations data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      message.success(label);
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Action failed.');
    }
  };

  const runDunning = async () => {
    setRunning(true);
    try {
      const r = await runAdminJob('expire_overdue_subscriptions');
      message.success(`Dunning ran — ${r.changed} subscription(s) transitioned.`);
      await load();
    } catch (e) {
      message.error((e as Error)?.message || 'Failed to run task.');
    } finally {
      setRunning(false);
    }
  };

  // Local filtering for audit activity logs
  const filteredActivity = activity.filter(r => {
    const actorMatch = r.actor.toLowerCase().includes(actorSearch.toLowerCase());
    const actionMatch = r.action.toLowerCase().includes(actionSearch.toLowerCase());
    return actorMatch && actionMatch;
  });

  const healthTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <Tag
          color={health?.overall === 'up' ? 'success' : 'warning'}
          style={{ fontWeight: 700, fontSize: '15px', padding: '6px 16px', borderRadius: '6px' }}
        >
          {health?.overall === 'up' ? '● All Platform Services Operational' : '● System Performance Degraded'}
        </Tag>
        <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '12px' }}>
          Last checked: {health ? new Date(health.checked_at).toLocaleTimeString() : '—'}
        </span>
      </div>

      <Row gutter={[16, 16]}>
        {health && Object.entries(health.services).map(([k, s]) => (
          <Col xs={24} sm={12} lg={8} key={k}>
            <Card
              bordered={false}
              style={{
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                borderLeft: `4px solid ${s.status === 'up' ? '#10B981' : '#EF4444'}`,
                background: '#FFFFFF'
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>{SVC_LABEL[k] ?? k}</span>
                <Tag color={s.status === 'up' ? 'success' : 'error'} style={{ fontWeight: 600, borderRadius: '4px' }}>
                  {s.status.toUpperCase()}
                </Tag>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 12px' }}>{s.detail}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8' }}>
                <span>Latency: <strong>{s.latency_ms} ms</strong></span>
                <span>Type: {k.includes('db') || k.includes('postgres') || k.includes('redis') ? 'Database/Cache' : 'Web Service'}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {health?.hr_headcount && (
        <Card
          title="HR Aggregated Statistics (Cached Rollup)"
          bordered={false}
          style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}
        >
          <Row gutter={24} style={{ padding: '8px 0' }}>
            <Col xs={12} md={8}>
              <Statistic title="Total Active Employees" value={health.hr_headcount.total_employees} valueStyle={{ fontWeight: 800 }} />
            </Col>
            <Col xs={12} md={8}>
              <Statistic title="Counted Tenants" value={health.hr_headcount.tenants_counted} valueStyle={{ fontWeight: 800 }} />
            </Col>
            <Col xs={24} md={8}>
              <Statistic title="HR Backend Reachable" value={health.hr_headcount.reachable ? 'Online' : 'Unreachable'} valueStyle={{ fontWeight: 800, color: health.hr_headcount.reachable ? '#10B981' : '#EF4444' }} />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );

  const activityCols = [
    { title: 'Timestamp', dataIndex: 'at', key: 'at', width: 180, render: (d: string) => <span style={{ color: '#64748B' }}>{new Date(d).toLocaleString()}</span> },
    { title: 'Source', dataIndex: 'source', key: 'source', render: (s: string) => <Tag color={s === 'console' ? 'blue' : 'purple'} style={{ borderRadius: '4px' }}>{s}</Tag> },
    { title: 'Actor', dataIndex: 'actor', key: 'actor', render: (a: string) => <span style={{ fontWeight: 600, color: '#334155' }}>{a}</span> },
    { title: 'Action Tag', dataIndex: 'action', key: 'action', render: (a: string) => <Tag style={{ fontWeight: 500, borderRadius: '4px' }}>{a}</Tag> },
    { title: 'Target', dataIndex: 'target', key: 'target', render: (t: string, r: ActivityRow) => t || r.label || <span style={{ color: '#94A3B8' }}>—</span> },
    {
      title: 'Context Details',
      dataIndex: 'detail',
      key: 'detail',
      render: (d: object) => (
        <Tooltip title={<pre style={{ color: '#FFF', fontSize: '10px', margin: 0 }}>{JSON.stringify(d, null, 2)}</pre>} overlayInnerStyle={{ maxWidth: '400px' }}>
          <Text code style={{ fontSize: '11px', cursor: 'pointer', maxWidth: '300px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {JSON.stringify(d)}
          </Text>
        </Tooltip>
      )
    },
  ];

  const invoiceCols = [
    { title: 'Invoice #', dataIndex: 'number', key: 'number', render: (n: string) => <span style={{ fontWeight: 600 }}>{n || '—'}</span> },
    { title: 'Client Company', dataIndex: 'company', key: 'company', render: (c: string, r: any) => <span style={{ color: '#334155' }}>{c} <span style={{ fontSize: '11px', color: '#94A3B8' }}>({r.schema})</span></span> },
    { title: 'Total Amount', dataIndex: 'amount', key: 'amount', render: (a: string) => inr(a) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'} style={{ borderRadius: '4px', fontWeight: 600 }}>{s}</Tag> },
    { title: 'Payment Date', dataIndex: 'paid_at', key: 'paid_at', render: (d: string | null) => d ? new Date(d).toLocaleString() : <span style={{ color: '#94A3B8' }}>Unpaid</span> },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, r: { id: number; status: string }) => r.status === 'PAID' ? (
        <Popconfirm
          title="Refund this payment?"
          description="Issues a Razorpay refund when payment ID is on file."
          onConfirm={() => act('Refund issued', () => invoiceAction(r.id, 'refund'))}
        >
          <Button size="small" danger type="link">Refund</Button>
        </Popconfirm>
      ) : null,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header operations row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Platform Operations Control</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0' }}>Configure scheduling, run lifecycles, and view live webhook event pipelines.</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load} style={{ borderRadius: '8px' }}>Force Refresh</Button>
      </div>

      {loading && !health ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Querying infrastructure status..." />
        </div>
      ) : (
        <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }} bodyStyle={{ padding: '16px 20px 24px' }}>
          <Tabs
            defaultActiveKey="health"
            items={[
              {
                key: 'health',
                label: <span><DatabaseOutlined /> System Health</span>,
                children: healthTab
              },
              {
                key: 'activity',
                label: <span><HistoryOutlined /> Audit Logs ({filteredActivity.length})</span>,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Log filter bar */}
                    <Space size="middle" wrap style={{ padding: '4px 0' }}>
                      <Input
                        placeholder="Filter by Actor Email"
                        value={actorSearch}
                        onChange={e => setActorSearch(e.target.value)}
                        prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        allowClear
                        style={{ width: '220px', borderRadius: '8px' }}
                      />
                      <Input
                        placeholder="Filter by Action Tag"
                        value={actionSearch}
                        onChange={e => setActionSearch(e.target.value)}
                        prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        allowClear
                        style={{ width: '220px', borderRadius: '8px' }}
                      />
                    </Space>
                    <Table
                      rowKey={(r: ActivityRow) => `${r.source}-${r.at}-${r.action}-${r.target}`}
                      size="small"
                      columns={activityCols as never}
                      dataSource={filteredActivity}
                      pagination={{ pageSize: 15, style: { marginTop: '16px' } }}
                      locale={{ emptyText: <Empty description="No matching activity logs" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                  </div>
                ),
              },
              {
                key: 'payments',
                label: <span><SyncOutlined /> Webhooks &amp; Billing</span>,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {payments && (
                      <Row gutter={[16, 16]}>
                        {[
                          ['Paid Revenue Items', payments.summary.paid, '#10B981', '#D1FAE5'],
                          ['Outstanding Open Invoices', payments.summary.open, '#F59E0B', '#FEF3C7'],
                          ['Voided Bills', payments.summary.void, '#64748B', '#F1F5F9'],
                          ['Gateway Webhook Logs', payments.summary.webhook_events, '#6366F1', '#E0E7FF']
                        ].map(([t, v, iconColor, bg]) => (
                          <Col xs={12} sm={6} key={t as string}>
                            <Card bordered={false} style={{ borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }} bodyStyle={{ padding: '16px' }}>
                              <Statistic
                                title={<span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600, color: '#64748B' }}>{t as string}</span>}
                                value={v as number}
                                valueStyle={{ fontWeight: 800, color: '#0F172A', fontSize: '20px', marginTop: '4px' }}
                              />
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}

                    <Card title="SaaS Subscriptions Invoices Log" bordered={false} style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }} headStyle={{ fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                      <Table
                        rowKey="id"
                        size="small"
                        columns={invoiceCols as never}
                        dataSource={payments?.invoices ?? []}
                        pagination={{ pageSize: 8, style: { marginTop: '16px' } }}
                        locale={{ emptyText: <Empty description="No invoices logged" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      />
                    </Card>

                    <Card title="Received Razorpay/Gateway Inbound Webhook History" bordered={false} style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }} headStyle={{ fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                      <Table
                        rowKey="id"
                        size="small"
                        columns={[
                          { title: 'Received At', dataIndex: 'received_at', key: 'received_at', render: (d: string) => <span>{new Date(d).toLocaleString()}</span> },
                          { title: 'Webhook Event ID', dataIndex: 'event_id', key: 'event_id', render: (e: string) => <Text code style={{ fontSize: '12px' }}>{e}</Text> },
                          { title: 'Action Status', key: 'status', render: () => <Tag color="success">PROCESSED</Tag> }
                        ] as never}
                        dataSource={payments?.webhook_events ?? []}
                        pagination={{ pageSize: 8, style: { marginTop: '16px' } }}
                        locale={{ emptyText: <Empty description="No webhook events recorded" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      />
                    </Card>
                  </div>
                ),
              },
              {
                key: 'automation',
                label: <span><SyncOutlined spin={running} /> Lifecycle Automation</span>,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Card
                      bordered={false}
                      style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}
                      bodyStyle={{ padding: '24px' }}
                      title={<span style={{ fontWeight: 700 }}>Cron Dunning &amp; Expirations Engine</span>}
                      extra={
                        <Popconfirm
                          title="Run Subscriptions Dunning?"
                          description="This will scan active lapsed accounts and mark them PAST_DUE. Continue?"
                          onConfirm={runDunning}
                          okText="Run Now"
                          cancelText="Cancel"
                        >
                          <Button type="primary" loading={running} style={{ borderRadius: '6px', background: '#FF6D00', borderColor: '#FF6D00' }}>
                            Trigger Manual Dunning Run
                          </Button>
                        </Popconfirm>
                      }
                    >
                      <p style={{ color: '#64748B', fontSize: '13px', marginTop: '-8px', marginBottom: '20px' }}>
                        The automated background process runs every night to check subscriptions validity. Click the trigger button to run the job immediately in the background task loop.
                      </p>
                      <Row gutter={24}>
                        <Col xs={24} sm={12}>
                          <Card bordered={false} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }} bodyStyle={{ padding: '16px' }}>
                            <Statistic
                              title="Active but Lapsed &rarr; Transition to PAST_DUE"
                              value={jobs?.candidates.active_lapsed ?? 0}
                              valueStyle={{ fontWeight: 800, color: '#D97706' }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Card bordered={false} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }} bodyStyle={{ padding: '16px' }}>
                            <Statistic
                              title="Past-Due / Grace Period Exceeded &rarr; Transition to CANCELLED"
                              value={jobs?.candidates.past_due_to_cancel ?? 0}
                              valueStyle={{ fontWeight: 800, color: '#EF4444' }}
                            />
                          </Card>
                        </Col>
                      </Row>
                    </Card>

                    <Card title="Scheduled Tasks Registry (Celery Beat)" bordered={false} style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }} headStyle={{ fontWeight: 700, borderBottom: '1px solid #E2E8F0' }}>
                      <Table
                        rowKey="name"
                        size="middle"
                        columns={[
                          { title: 'Job Registry Identifier', dataIndex: 'name', key: 'name', render: (n: string) => <span style={{ fontWeight: 600, color: '#334155' }}>{n}</span> },
                          { title: 'Celery Backend Task Path', dataIndex: 'task', key: 'task', render: (t: string) => <Text code style={{ fontSize: '11px' }}>{t}</Text> },
                          { title: 'Configured Cron Expression / Interval', dataIndex: 'schedule', key: 'schedule', render: (s: string) => <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>{s}</Text> },
                        ] as never}
                        dataSource={jobs?.jobs ?? []}
                        pagination={false}
                        locale={{ emptyText: <Empty description="No scheduled jobs registered" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                      />
                    </Card>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
