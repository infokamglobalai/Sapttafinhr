import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, message, Spin, Space, Row, Col, Statistic, InputNumber, Popconfirm, Typography, Tooltip, Empty
} from 'antd';
import { ReloadOutlined, DownloadOutlined, ArrowUpOutlined, ArrowDownOutlined, AlertOutlined } from '@ant-design/icons';
import {
  fetchRevenue, fetchDunning, remindSubscription, extendSubscription, downloadAdminCsv,
  type RevenueReport, type DunningRow
} from '../../lib/api';

const { Text } = Typography;
const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

export default function Revenue() {
  const navigate = useNavigate();
  const [rev, setRev] = useState<RevenueReport | null>(null);
  const [dunning, setDunning] = useState<DunningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extendDays, setExtendDays] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        fetchRevenue(),
        fetchDunning(14).then(x => x.results).catch(() => [] as DunningRow[]),
      ]);
      setRev(r);
      setDunning(d);
    } catch {
      message.error('Failed to load revenue data.');
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

  const dunningCols = [
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      render: (c: string, r: DunningRow) => (
        <div>
          <a
            style={{ fontWeight: 600, color: '#FF6D00' }}
            onClick={() => navigate(`/superadmin/companies/${r.schema}`)}
          >
            {c}
          </a>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Schema: <code>{r.schema}</code></div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'PAST_DUE' ? 'error' : 'warning'} style={{ fontWeight: 600, borderRadius: '4px' }}>
          {s}
        </Tag>
      )
    },
    { title: 'Current Plan', dataIndex: 'plan', key: 'plan', render: (p: string) => <span style={{ fontWeight: 500 }}>{p}</span> },
    { title: 'Period End', dataIndex: 'current_period_end', key: 'end', render: (d: string) => <span style={{ color: '#64748B' }}>{d}</span> },
    {
      title: 'Days Overdue',
      dataIndex: 'days_overdue',
      key: 'days',
      render: (d: number) => d > 0 ? (
        <span style={{ fontWeight: 700, color: '#EF4444' }}>{d} days</span>
      ) : (
        <span style={{ color: '#64748B' }}>{d} days</span>
      )
    },
    {
      title: 'Dunning Controls',
      key: 'actions',
      render: (_: unknown, r: DunningRow) => (
        <Space size="middle">
          <Button size="small" icon={<AlertOutlined />} onClick={() => act('Reminder sent to client', () => remindSubscription(r.id))} style={{ borderRadius: '6px' }}>
            Remind Client
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <InputNumber
              size="small"
              min={1}
              style={{ width: 64, borderRadius: '6px' }}
              placeholder="30"
              value={extendDays[r.id]}
              onChange={(v) => setExtendDays(s => ({ ...s, [r.id]: Number(v) || 30 }))}
            />
            <Popconfirm
              title={`Extend subscription period?`}
              description={`Extend access by ${extendDays[r.id] || 30} days?`}
              onConfirm={() => act('Subscription period extended', () => extendSubscription(r.id, extendDays[r.id] || 30))}
              okText="Extend"
              cancelText="Cancel"
            >
              <Button size="small" type="primary" style={{ borderRadius: '6px' }}>Extend</Button>
            </Popconfirm>
          </div>
        </Space>
      )
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top action header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Revenue &amp; Dunning Metrics</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0' }}>Monitor platform MRR, download tax reports, and manage late billing queue.</p>
        </div>
        <Space size="small" wrap>
          <Button
            type="dashed"
            icon={<DownloadOutlined />}
            onClick={() => downloadAdminCsv('/saas/admin/exports/invoices.csv', 'saas_invoices.csv').catch(() => message.error('Export failed'))}
            style={{ borderRadius: '8px' }}
          >
            Export Invoices CSV
          </Button>
          <Button
            type="dashed"
            icon={<DownloadOutlined />}
            onClick={() => downloadAdminCsv('/saas/admin/exports/gst.csv', 'saas_gst_summary.csv').catch(() => message.error('Export failed'))}
            style={{ borderRadius: '8px' }}
          >
            Export GST CSV
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load} style={{ borderRadius: '8px' }}>Refresh</Button>
        </Space>
      </div>

      {loading && !rev ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Calculating platform revenue models..." />
        </div>
      ) : (
        <>
          {/* Revenue KPI Cards */}
          <Row gutter={[16, 16]}>
            {[
              { t: 'Monthly Recurring (MRR)', v: inr(rev?.mrr ?? 0), icon: <ArrowUpOutlined style={{ color: '#10B981' }} />, color: '#D1FAE5' },
              { t: 'Annual Recurring (ARR)', v: inr(rev?.arr ?? 0), icon: <ArrowUpOutlined style={{ color: '#10B981' }} />, color: '#D1FAE5' },
              { t: 'Paid Revenue Total', v: inr(rev?.paid_revenue ?? 0), icon: null, color: '#F1F5F9' },
              { t: 'GST Tax Collected', v: inr(rev?.gst_collected ?? 0), icon: null, color: '#F1F5F9' },
              { t: 'Platform Churn Rate', v: (rev?.churn_rate ?? 0) + '%', icon: (rev?.churn_rate ?? 0) > 0 ? <ArrowDownOutlined style={{ color: '#EF4444' }} /> : null, color: '#FEE2E2' },
              { t: 'Cancelled This Month', v: rev?.cancelled_this_month ?? 0, icon: null, color: '#F1F5F9' },
            ].map(s => (
              <Col xs={24} sm={12} lg={8} xl={4} key={s.t}>
                <Card
                  bordered={false}
                  hoverable
                  style={{
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                  }}
                  bodyStyle={{ padding: '20px 16px' }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>{s.t}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{s.v}</span>
                    {s.icon}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Revenue growth Chart */}
          <Card
            title="SaaS Revenue Growth"
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
            headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700, fontSize: '15px' }}
          >
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '24px' }}>Paid subscriptions collections (last 12 months)</div>
            
            {/* Custom Green-themed Bar Chart */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '180px',
              paddingBottom: '20px',
              position: 'relative',
              borderBottom: '1px solid #E2E8F0',
            }}>
              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map(p => (
                <div key={p} style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${p}%`,
                  height: '1px',
                  borderBottom: '1px dashed #E2E8F0',
                  zIndex: 1
                }} />
              ))}

              {(() => {
                const data = rev?.revenue_by_month ?? [];
                const max = Math.max(1, ...data.map(m => Number(m.amount)));
                return data.map(m => {
                  const heightPercent = (Number(m.amount) / max) * 100;
                  return (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                      <Tooltip
                        title={
                          <div style={{ fontSize: '12px', padding: '2px' }}>
                            <strong style={{ color: '#34D399' }}>{m.month}</strong>
                            <div style={{ marginTop: '4px' }}>Paid Collection: <strong>{inr(m.amount)}</strong></div>
                          </div>
                        }
                      >
                        <div style={{
                          width: '60%',
                          height: '140px',
                          display: 'flex',
                          alignItems: 'flex-end',
                          cursor: 'pointer',
                        }}>
                          <div
                            style={{
                              width: '100%',
                              background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                              borderRadius: '6px 6px 0 0',
                              height: `${heightPercent}%`,
                              minHeight: Number(m.amount) ? '4px' : '0',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}
                          />
                        </div>
                      </Tooltip>
                      <span style={{ fontSize: '10px', color: '#64748B', marginTop: '8px', fontWeight: 500 }}>
                        {m.month.slice(5)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </Card>

          {/* Dunning queue */}
          <Card
            title={`Active Dunning & Expiring Accounts Queue (${dunning.length})`}
            bordered={false}
            style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
            headStyle={{ borderBottom: '1px solid #F1F5F9', fontWeight: 700, fontSize: '15px' }}
            bodyStyle={{ padding: '8px 20px 20px' }}
          >
            <Table
              rowKey="id"
              size="middle"
              columns={dunningCols as never}
              dataSource={dunning}
              pagination={{ pageSize: 10, style: { marginTop: '16px' } }}
              locale={{ emptyText: <Empty description="Queue is currently empty — all subscription payments current" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
