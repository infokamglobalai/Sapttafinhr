import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  Button, Card, Table, Tag, message, Spin, Space, Row, Col, Statistic, InputNumber, Popconfirm, Typography,
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { SapttaLogo } from '../../components/layout/Navbar';
import {
  fetchRevenue, fetchDunning, remindSubscription, extendSubscription, downloadAdminCsv,
  type RevenueReport, type DunningRow,
} from '../../lib/api';

const { Text } = Typography;
const inr = (v: string | number) => '₹' + Number(v || 0).toLocaleString('en-IN');

export default function Revenue() {
  const { user, logout } = useAuth();
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
      setRev(r); setDunning(d);
    } catch { message.error('Failed to load revenue data.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (user && !user.isSuperAdmin) return <Navigate to="/app" replace />;

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); message.success(label); await load(); }
    catch (e) { message.error((e as Error)?.message || 'Action failed.'); }
  };

  const dunningCols = [
    { title: 'Company', dataIndex: 'company', key: 'company', render: (c: string, r: DunningRow) => (
      <a onClick={() => navigate(`/superadmin/companies/${r.schema}`)}>{c}</a>
    ) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'PAST_DUE' ? 'volcano' : 'green'}>{s}</Tag> },
    { title: 'Plan', dataIndex: 'plan', key: 'plan' },
    { title: 'Period end', dataIndex: 'current_period_end', key: 'end' },
    { title: 'Days overdue', dataIndex: 'days_overdue', key: 'days', render: (d: number) => d > 0 ? <Text type="danger">{d}</Text> : <Text type="secondary">{d}</Text> },
    { title: 'Actions', key: 'actions', render: (_: unknown, r: DunningRow) => (
      <Space>
        <Button size="small" onClick={() => act('Reminder sent', () => remindSubscription(r.id))}>Remind</Button>
        <InputNumber size="small" min={1} style={{ width: 64 }} placeholder="30"
          value={extendDays[r.id]} onChange={(v) => setExtendDays(s => ({ ...s, [r.id]: Number(v) || 30 }))} />
        <Popconfirm title={`Extend by ${extendDays[r.id] || 30} days?`}
          onConfirm={() => act('Period extended', () => extendSubscription(r.id, extendDays[r.id] || 30))}>
          <Button size="small" type="primary">Extend</Button>
        </Popconfirm>
      </Space>
    ) },
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 16px' }}>Revenue</h1>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={() => downloadAdminCsv('/saas/admin/exports/invoices.csv', 'saas_invoices.csv').catch(() => message.error('Export failed'))}>Invoices CSV</Button>
            <Button icon={<DownloadOutlined />} onClick={() => downloadAdminCsv('/saas/admin/exports/gst.csv', 'saas_gst_summary.csv').catch(() => message.error('Export failed'))}>GST CSV</Button>
          </Space>
        </div>

        {loading && !rev ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {[
                { t: 'MRR', v: inr(rev?.mrr ?? 0) }, { t: 'ARR', v: inr(rev?.arr ?? 0) },
                { t: 'Paid revenue', v: inr(rev?.paid_revenue ?? 0) }, { t: 'GST collected', v: inr(rev?.gst_collected ?? 0) },
                { t: 'Churn (mo)', v: (rev?.churn_rate ?? 0) + '%' }, { t: 'Cancelled (mo)', v: rev?.cancelled_this_month ?? 0 },
              ].map(s => (
                <Col xs={12} md={8} lg={4} key={s.t}><Card size="small" style={{ borderRadius: 14 }}>
                  <Statistic title={s.t} value={s.v} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                </Card></Col>
              ))}
            </Row>

            <Card title="Paid revenue (last 12 months)" style={{ borderRadius: 16, marginBottom: 24 }} styles={{ header: { fontWeight: 700 } }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
                {(() => {
                  const data = rev?.revenue_by_month ?? [];
                  const max = Math.max(1, ...data.map(m => Number(m.amount)));
                  return data.map(m => (
                    <div key={m.month} style={{ flex: 1, textAlign: 'center' }} title={`${m.month}: ${inr(m.amount)}`}>
                      <div style={{ height: 110, display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ width: '100%', background: '#16a34a', borderRadius: '4px 4px 0 0',
                          height: `${(Number(m.amount) / max) * 110}px`, minHeight: Number(m.amount) ? 3 : 0 }} />
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(10,17,40,0.4)' }}>{m.month.slice(5)}</div>
                    </div>
                  ));
                })()}
              </div>
            </Card>

            <Card title={`Dunning queue — past due & expiring (${dunning.length})`} style={{ borderRadius: 16 }} styles={{ header: { fontWeight: 700 } }}>
              <Table rowKey="id" size="middle" columns={dunningCols as never} dataSource={dunning}
                pagination={{ pageSize: 10 }} locale={{ emptyText: 'Nothing due — all subscriptions current.' }} />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
