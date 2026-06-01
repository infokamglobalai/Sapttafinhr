import { useState, useMemo } from 'react';
import { Button, Select, Tabs, Alert } from 'antd';
import { DownloadOutlined, BarChartOutlined, PieChartOutlined, LineChartOutlined, FileTextOutlined } from '@ant-design/icons';
import { MOCK_PNL, MOCK_INVOICES, MOCK_PARTIES, formatINR } from '../../data/finance-mock';
import { useApiResource, asList } from '../../hooks/useApiResource';

const { Option } = Select;

const pnlNum = (v: unknown): number => Number(v ?? 0) || 0;
const agNum = (v: unknown): number => Number(v ?? 0) || 0;

// /reports/ar-aging/ row: per-customer outstanding split into aging buckets.
interface ApiAgingRow {
  customer_id: number; customer_name: string; total: string | number;
  '0-30': string | number; '31-60': string | number; '61-90': string | number; '90+': string | number;
}

// /reports/balance-sheet/ — flat account rows per section + totals.
interface ApiBSRow { code: string; name: string; amount: string | number }
interface ApiBalanceSheet {
  as_of: string;
  assets?: ApiBSRow[]; liabilities?: ApiBSRow[]; equity?: ApiBSRow[];
  current_period_pl?: number; total_assets?: number; total_liabilities?: number;
  total_equity?: number; is_balanced?: boolean;
}

// Live PnL API → the page's grouped {category, items, total} shape. The API
// returns flat per-account rows; we present income/expense as one group each.
interface ApiPnLRow { name: string; code: string; amount: string | number }
interface ApiPnL { income?: ApiPnLRow[]; expense?: ApiPnLRow[] }
function groupRows(rows: ApiPnLRow[], category: string) {
  const items = rows.map(r => ({ name: r.name, amount: pnlNum(r.amount) }));
  return { category, items, total: items.reduce((s, i) => s + i.amount, 0) };
}

export default function Reports() {
  const [tab, setTab] = useState('pnl');
  const [period, setPeriod] = useState('apr2026');

  // Live P&L from the FIN tenant API (needs a company id).
  const companies = useApiResource<unknown>('/masters/companies/');
  const companyId = useMemo(() => asList<{ id: number }>(companies.data)[0]?.id ?? null, [companies.data]);
  const pnlRes = useApiResource<ApiPnL>(companyId ? `/reports/pnl/?company=${companyId}` : null);

  const livePnl = useMemo(() => {
    const inc = pnlRes.data?.income ?? [];
    const exp = pnlRes.data?.expense ?? [];
    if (inc.length === 0 && exp.length === 0) return null;
    return {
      income: inc.length ? [groupRows(inc, 'Income')] : [],
      expenses: exp.length ? [groupRows(exp, 'Expenses')] : [],
    };
  }, [pnlRes.data]);

  const usingLivePnl = !!livePnl;
  const pnl = livePnl ?? MOCK_PNL;

  const totalIncome = pnl.income.reduce((s, c) => s + c.total, 0);
  const totalExpenses = pnl.expenses.reduce((s, c) => s + c.total, 0);
  const netProfit = totalIncome - totalExpenses;

  // Live AR-aging from /reports/ar-aging/?company=.
  const agingRes = useApiResource<{ rows?: ApiAgingRow[] }>(companyId ? `/reports/ar-aging/?company=${companyId}` : null);
  const liveAgingRows = useMemo(() => agingRes.data?.rows ?? [], [agingRes.data]);
  const usingLiveAging = !agingRes.loading && !agingRes.error && liveAgingRows.length > 0;

  // Live Balance Sheet from /reports/balance-sheet/?company=.
  const bsRes = useApiResource<ApiBalanceSheet>(companyId ? `/reports/balance-sheet/?company=${companyId}` : null);
  const bs = bsRes.data;
  const usingLiveBs = !bsRes.loading && !bsRes.error && !!bs &&
    ((bs.assets?.length ?? 0) + (bs.liabilities?.length ?? 0) + (bs.equity?.length ?? 0)) > 0;

  const receivables = MOCK_INVOICES.filter(i => i.balanceDue > 0 && i.status !== 'cancelled');
  const mockAgingBuckets = [
    { label: '0–30 days', key: '0-30', color: '#10B981', amount: receivables.filter(i => daysSince(i.dueDate) <= 30).reduce((s, i) => s + i.balanceDue, 0) },
    { label: '31–60 days', key: '31-60', color: '#F59E0B', amount: receivables.filter(i => { const d = daysSince(i.dueDate); return d > 30 && d <= 60; }).reduce((s, i) => s + i.balanceDue, 0) },
    { label: '61–90 days', key: '61-90', color: '#FF6D00', amount: receivables.filter(i => { const d = daysSince(i.dueDate); return d > 60 && d <= 90; }).reduce((s, i) => s + i.balanceDue, 0) },
    { label: '90+ days', key: '90+', color: '#EF4444', amount: receivables.filter(i => daysSince(i.dueDate) > 90).reduce((s, i) => s + i.balanceDue, 0) },
  ];
  // Prefer live AR-aging when available (computed below from the API).
  const agingBuckets = usingLiveAging
    ? ([
        { label: '0–30 days', key: '0-30', color: '#10B981' },
        { label: '31–60 days', key: '31-60', color: '#F59E0B' },
        { label: '61–90 days', key: '61-90', color: '#FF6D00' },
        { label: '90+ days', key: '90+', color: '#EF4444' },
      ] as const).map(b => ({
        ...b,
        amount: liveAgingRows.reduce((s, r) => s + agNum((r as any)[b.key]), 0),
      }))
    : mockAgingBuckets;

  const reportCards = [
    { label: 'Profit & Loss', icon: <BarChartOutlined />, color: '#10B981', desc: 'Income vs expenses by account group' },
    { label: 'Balance Sheet', icon: <PieChartOutlined />, color: '#6366F1', desc: 'Assets, liabilities, equity snapshot' },
    { label: 'Cash Flow', icon: <LineChartOutlined />, color: '#0EA5E9', desc: 'Operating, investing, financing flows' },
    { label: 'AR Aging', icon: <FileTextOutlined />, color: '#FF6D00', desc: 'Receivables by aging bucket' },
    { label: 'Day Book', icon: <FileTextOutlined />, color: '#8B5CF6', desc: 'All journal entries by date' },
    { label: 'Sales Register', icon: <FileTextOutlined />, color: '#EC4899', desc: 'GST outward supply register' },
    { label: 'HSN Summary', icon: <FileTextOutlined />, color: '#F59E0B', desc: 'HSN-wise outward supply summary' },
    { label: 'GSTR-1', icon: <FileTextOutlined />, color: '#EF4444', desc: 'GST return JSON for portal filing' },
    { label: 'GSTR-3B', icon: <FileTextOutlined />, color: '#EF4444', desc: 'Summary return with ITC' },
    { label: 'Audit Log', icon: <FileTextOutlined />, color: '#64748B', desc: 'Full edit history of records' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Reports</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Financial reports, GST returns & compliance exports</p>
        </div>
        <Select value={period} onChange={setPeriod} style={{ minWidth: 180 }}>
          <Option value="apr2026">April 2026</Option>
          <Option value="may2026">May 2026</Option>
          <Option value="fy2026">FY 2025–26</Option>
        </Select>
      </div>

      {/* Quick report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 32 }}>
        {reportCards.map(rc => (
          <div key={rc.label} style={{
            background: '#FFFFFF', borderRadius: 14, padding: '16px 18px',
            border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(10,17,40,0.06)'; e.currentTarget.style.borderColor = rc.color; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${rc.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rc.color, fontSize: 15, flexShrink: 0 }}>
              {rc.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{rc.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{rc.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'pnl',
          label: 'Profit & Loss',
          children: (
            <div>
              {usingLivePnl ? (
                <Alert type="success" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                  message={<span style={{ fontSize: 13 }}><strong>Live</strong> — Profit &amp; Loss computed from posted journal entries in your workspace.</span>} />
              ) : (
                <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                  message={<span style={{ fontSize: 13 }}>{pnlRes.loading ? 'Loading P&L from your workspace…' : 'Showing demo data — post journal entries to see your real P&L.'}</span>} />
              )}

              {/* P&L Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <SummaryCard label="Total Income" value={formatINR(totalIncome)} color="#10B981" />
                <SummaryCard label="Total Expenses" value={formatINR(totalExpenses)} color="#EF4444" />
                <SummaryCard label={netProfit >= 0 ? 'Net Profit' : 'Net Loss'} value={formatINR(Math.abs(netProfit))} color={netProfit >= 0 ? '#10B981' : '#EF4444'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Income */}
                <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', padding: '24px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginBottom: 16 }}>Income</div>
                  {pnl.income.map(cat => (
                    <div key={cat.category} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{cat.category}</div>
                      {cat.items.map(item => (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatINR(item.amount)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--color-border)', marginTop: 4, fontSize: 13 }}>
                        <span style={{ fontWeight: 700 }}>Subtotal</span>
                        <span style={{ fontWeight: 700, color: '#10B981' }}>{formatINR(cat.total)}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--color-border)', marginTop: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>Total Income</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#10B981' }}>{formatINR(totalIncome)}</span>
                  </div>
                </div>

                {/* Expenses */}
                <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', padding: '24px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 16 }}>Expenses</div>
                  {pnl.expenses.map(cat => (
                    <div key={cat.category} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{cat.category}</div>
                      {cat.items.map(item => (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatINR(item.amount)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--color-border)', marginTop: 4, fontSize: 13 }}>
                        <span style={{ fontWeight: 700 }}>Subtotal</span>
                        <span style={{ fontWeight: 700, color: '#EF4444' }}>{formatINR(cat.total)}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--color-border)', marginTop: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>Total Expenses</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#EF4444' }}>{formatINR(totalExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Net result */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 28px', marginTop: 20, borderRadius: 14,
                background: netProfit >= 0 ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                border: `1px solid ${netProfit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                </span>
                <span style={{ fontSize: 28, fontWeight: 900, color: netProfit >= 0 ? '#10B981' : '#EF4444', letterSpacing: '-1px' }}>
                  {formatINR(Math.abs(netProfit))}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Download PDF</Button>
                <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Download CSV</Button>
              </div>
            </div>
          ),
        },
        {
          key: 'balance',
          label: 'Balance Sheet',
          children: (
            <div>
              {usingLiveBs ? (
                <Alert type={bs?.is_balanced ? 'success' : 'warning'} showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                  message={<span style={{ fontSize: 13 }}><strong>Live</strong> — balance sheet as of {bs?.as_of}.{bs?.is_balanced === false ? ' Imbalance detected.' : ''}</span>} />
              ) : (
                <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                  message={<span style={{ fontSize: 13 }}>{bsRes.loading ? 'Loading balance sheet…' : 'No posted entries yet — the balance sheet will populate once you post journal entries.'}</span>} />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <SummaryCard label="Total Assets" value={formatINR(agNum(bs?.total_assets))} color="#10B981" />
                <SummaryCard label="Total Liabilities" value={formatINR(agNum(bs?.total_liabilities))} color="#EF4444" />
                <SummaryCard label="Total Equity" value={formatINR(agNum(bs?.total_equity))} color="#6366F1" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <BalanceColumn title="Assets" color="#10B981" rows={bs?.assets ?? []} total={agNum(bs?.total_assets)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <BalanceColumn title="Liabilities" color="#EF4444" rows={bs?.liabilities ?? []} total={agNum(bs?.total_liabilities)} />
                  <BalanceColumn title="Equity" color="#6366F1" rows={bs?.equity ?? []} total={agNum(bs?.total_equity)}
                    extra={bs?.current_period_pl != null ? { name: 'Current Period P&L', amount: agNum(bs.current_period_pl) } : undefined} />
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'aging',
          label: 'AR Aging',
          children: (
            <div>
              {usingLiveAging ? (
                <Alert type="success" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                  message={<span style={{ fontSize: 13 }}><strong>Live</strong> — receivables aging for {liveAgingRows.length} customer{liveAgingRows.length !== 1 ? 's' : ''} from your workspace.</span>} />
              ) : (
                <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
                  message={<span style={{ fontSize: 13 }}>{agingRes.loading ? 'Loading receivables aging…' : 'Showing demo data — post invoices to see real aging.'}</span>} />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                {agingBuckets.map(b => (
                  <div key={b.label} style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{b.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: b.color }}>{formatINR(b.amount)}</div>
                  </div>
                ))}
              </div>

              {/* Aging bar */}
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', padding: '24px', marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Aging Distribution</div>
                <div style={{ display: 'flex', height: 32, borderRadius: 8, overflow: 'hidden' }}>
                  {agingBuckets.map(b => {
                    const totalAR = agingBuckets.reduce((s, x) => s + x.amount, 0);
                    const pct = totalAR > 0 ? (b.amount / totalAR) * 100 : 0;
                    return pct > 0 ? (
                      <div key={b.label} style={{ width: `${pct}%`, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: pct > 10 ? 'auto' : 0 }}>
                        {pct > 15 && <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{Math.round(pct)}%</span>}
                      </div>
                    ) : null;
                  })}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                  {agingBuckets.map(b => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: b.color }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer-wise aging */}
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontSize: 14, fontWeight: 700 }}>Customer-wise Outstanding</div>
                {usingLiveAging
                  ? liveAgingRows.map(r => (
                    <div key={r.customer_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F5F5F5' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.customer_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          0–30: {formatINR(agNum(r['0-30']))} · 31–60: {formatINR(agNum(r['31-60']))} · 61–90: {formatINR(agNum(r['61-90']))} · 90+: {formatINR(agNum(r['90+']))}
                        </div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#EF4444' }}>{formatINR(agNum(r.total))}</span>
                    </div>
                  ))
                  : MOCK_PARTIES.filter(p => p.type === 'customer' && p.balance > 0).map(party => (
                    <div key={party.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F5F5F5' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{party.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{party.city}, {party.state}</div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#EF4444' }}>{formatINR(party.balance)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ),
        },
        {
          key: 'gst',
          label: 'GST Returns',
          children: (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <GSTCard
                  title="GSTR-1"
                  description="Outward supply details. Upload to GST portal for filing."
                  period="April 2026"
                  invoiceCount={MOCK_INVOICES.filter(i => i.status !== 'draft' && i.status !== 'cancelled').length}
                  totalTaxable={MOCK_INVOICES.filter(i => i.status !== 'draft' && i.status !== 'cancelled').reduce((s, i) => s + i.subtotal, 0)}
                  totalTax={MOCK_INVOICES.filter(i => i.status !== 'draft' && i.status !== 'cancelled').reduce((s, i) => s + i.totalTax, 0)}
                />
                <GSTCard
                  title="GSTR-3B"
                  description="Summary return with ITC. File monthly with payment."
                  period="April 2026"
                  invoiceCount={MOCK_INVOICES.filter(i => i.status !== 'draft' && i.status !== 'cancelled').length}
                  totalTaxable={MOCK_INVOICES.filter(i => i.status !== 'draft' && i.status !== 'cancelled').reduce((s, i) => s + i.subtotal, 0)}
                  totalTax={MOCK_INVOICES.filter(i => i.status !== 'draft' && i.status !== 'cancelled').reduce((s, i) => s + i.totalTax, 0)}
                />
              </div>
            </div>
          ),
        },
      ]} />
    </div>
  );
}

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)));
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: `${color}08`, borderRadius: '50%' }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  );
}

function BalanceColumn({ title, color, rows, total, extra }: {
  title: string; color: string;
  rows: { code: string; name: string; amount: string | number }[];
  total: number;
  extra?: { name: string; amount: number };
}) {
  const n = (v: string | number) => Number(v ?? 0) || 0;
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', padding: '24px' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 16 }}>{title}</div>
      {rows.length === 0 && !extra ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0' }}>No balances.</div>
      ) : (
        <>
          {rows.map(r => (
            <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)', marginRight: 8 }}>{r.code}</span>
                {r.name}
              </span>
              <span style={{ fontWeight: 600 }}>{formatINR(n(r.amount))}</span>
            </div>
          ))}
          {extra && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{extra.name}</span>
              <span style={{ fontWeight: 600 }}>{formatINR(extra.amount)}</span>
            </div>
          )}
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--color-border)', marginTop: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>Total {title}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color }}>{formatINR(total)}</span>
      </div>
    </div>
  );
}

function GSTCard({ title, description, period, invoiceCount, totalTaxable, totalTax }: {
  title: string; description: string; period: string; invoiceCount: number; totalTaxable: number; totalTax: number;
}) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{description}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Period</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{period}</div>
        </div>
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Invoices</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{invoiceCount}</div>
        </div>
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tax</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>{formatINR(totalTax)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, flex: 1, fontWeight: 600 }}>Download JSON</Button>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, flex: 1, fontWeight: 600 }}>Download PDF</Button>
      </div>
    </div>
  );
}
