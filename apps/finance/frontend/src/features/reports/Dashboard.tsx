import {
  AlertTriangle, ArrowDown, ArrowUp, FileText, Receipt, Wallet,
  TrendingUp, Users, BadgeIndianRupee, type LucideIcon,
  ShieldAlert, Clock, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useDashboard } from './api';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/money';
import ProfileBanner from '@/components/ProfileBanner';

interface GSTAlert {
  type: string; severity: 'high' | 'medium' | 'low';
  title: string; message: string; action: string; due_date?: string;
}

function GSTAlertsPanel({ companyId }: { companyId: number }) {
  const { data, isLoading, refetch, isFetching } = useQuery<{ alerts: GSTAlert[]; count: number }>({
    queryKey: ['gst-alerts', companyId],
    queryFn: async () => (await api.get('/ai/gst-alerts/', { params: { company_id: companyId } })).data,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return null;
  if (!data || data.count === 0) return null;

  const sevColor = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-amber-300 bg-amber-50',
    low: 'border-blue-200 bg-blue-50',
  };
  const sevText = { high: 'text-red-700', medium: 'text-amber-700', low: 'text-blue-700' };
  const sevBadge = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
          <ShieldAlert size={13} /> GST Compliance Alerts ({data.count})
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {data.alerts.map((alert, i) => (
          <div key={i} className={`flex items-start gap-3 border-l-4 px-4 py-3 ${sevColor[alert.severity]}`}>
            <Clock size={15} className={`mt-0.5 shrink-0 ${sevText[alert.severity]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${sevText[alert.severity]}`}>{alert.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${sevBadge[alert.severity]}`}>
                  {alert.severity}
                </span>
                {alert.due_date && (
                  <span className="text-xs text-slate-500">Due: {alert.due_date}</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-600">{alert.message}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">→ {alert.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface KpiProps {
  label: string; value: string; icon: LucideIcon;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  subtitle?: string;
}

function Kpi({ label, value, icon: Icon, tone = 'default', subtitle }: KpiProps) {
  const toneCls = {
    default: 'bg-slate-50 text-slate-600',
    positive: 'bg-emerald-50 text-emerald-700',
    negative: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
  }[tone];
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
          {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${toneCls}`}><Icon size={20} /></div>
      </div>
    </div>
  );
}

interface DashboardProps { onGo: (r: string) => void; }

export default function Dashboard({ onGo }: DashboardProps) {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const { data, isLoading } = useDashboard(companyId);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const isEmpty = data.recent_invoices.length === 0 && data.recent_receipts.length === 0;

  const maxRevenue = Math.max(...(data.revenue_trend?.map(t => Number(t.income)) ?? [1]));
  const forecastData = data.cashflow_forecast ?? [];
  const hasForecast = forecastData.some(d => Number(d.balance) !== Number(data.cash_balance));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{greeting} 👋</h1>
        <p className="text-sm text-slate-500">
          <strong>{company?.name ?? 'Your business'}</strong> · as of {data.as_of}
        </p>
      </div>

      <ProfileBanner onGo={(r) => onGo(r)} />

      {isEmpty && (
        <div className="card bg-gradient-to-r from-brand-50 to-emerald-50">
          <div className="text-base font-semibold text-slate-900">Get started in 4 steps</div>
          <p className="mt-1 text-sm text-slate-600">Once done, the dashboard fills up with live numbers.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Step n={1} title="Add a customer" desc="People you sell to." cta="Go" onClick={() => onGo('parties')} />
            <Step n={2} title="Add an item" desc="Products / services." cta="Go" onClick={() => onGo('items')} />
            <Step n={3} title="Create invoice" desc="GST auto-split." cta="Go" onClick={() => onGo('invoices')} />
            <Step n={4} title="Record receipt" desc="Mark as paid." cta="Go" onClick={() => onGo('receipts')} />
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Cash & Bank" value={formatINR(data.cash_balance)} icon={Wallet}
             tone={Number(data.cash_balance) >= 0 ? 'positive' : 'negative'} subtitle="Current balance" />
        <Kpi label="Receivables" value={formatINR(data.accounts_receivable)} icon={ArrowDown} subtitle="Owed by customers" />
        <Kpi label="Payables" value={formatINR(data.accounts_payable)} icon={ArrowUp} subtitle="Owed to vendors" />
        <Kpi label="Overdue" value={formatINR(data.overdue_amount)} icon={AlertTriangle}
             tone={Number(data.overdue_amount) > 0 ? 'warning' : 'default'}
             subtitle={`${data.overdue_count} invoice(s) past due`} />
      </div>

      {/* MTD + GST */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Income (MTD)" value={formatINR(data.mtd_income)} icon={TrendingUp} tone="positive" />
        <Kpi label="Expense (MTD)" value={formatINR(data.mtd_expense)} icon={ArrowUp} tone="negative" />
        <Kpi label="Net Profit (MTD)" value={formatINR(data.mtd_net)} icon={BadgeIndianRupee}
             tone={Number(data.mtd_net) >= 0 ? 'positive' : 'negative'} />
        {data.gst_dues && (
          <Kpi label="GST Due (MTD)" value={formatINR(data.gst_dues.total)} icon={FileText}
               tone="warning" subtitle={`CGST ${formatINR(data.gst_dues.cgst)} · SGST ${formatINR(data.gst_dues.sgst)}`} />
        )}
      </div>

      {/* Revenue Trend + Cash Flow Forecast */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Revenue Trend (6 months) */}
        {data.revenue_trend?.length > 0 && (
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800">Revenue Trend</div>
                <div className="text-xs text-slate-500">Last 6 months — income vs expense</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.revenue_trend} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                       tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="income" name="Income" fill="#059669" radius={[3, 3, 0, 0]}>
                  {data.revenue_trend.map((_, i) => (
                    <Cell key={i} fill={Number(data.revenue_trend[i].income) === maxRevenue ? '#047857' : '#059669'} />
                  ))}
                </Bar>
                <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[3, 3, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cash Flow Forecast */}
        {hasForecast && (
          <div className="card">
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-800">Cash Flow Forecast</div>
              <div className="text-xs text-slate-500">Projected 60-day balance from invoices & bills</div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                       tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatINR(v)} labelFormatter={(l) => `On ${l}`} />
                <Line type="monotone" dataKey="balance" name="Projected Balance"
                      stroke="#0284c7" strokeWidth={2} dot={false}
                      activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Overdue Invoices + Top Customers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Top overdue invoices */}
        {data.top_overdue_invoices?.length > 0 && (
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <AlertTriangle size={13} /> Overdue Invoices
              </div>
              <button onClick={() => onGo('invoices')} className="text-xs text-brand-600 hover:underline">View all →</button>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {data.top_overdue_invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{inv.customer}</div>
                      <div className="text-xs text-slate-400">{inv.invoice_no}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        {inv.days_overdue}d overdue
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="font-semibold text-slate-800">{formatINR(inv.balance_due)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Top customers */}
        {data.top_customers?.length > 0 && (
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Users size={13} /> Top Customers (MTD)
              </div>
              <button onClick={() => onGo('parties')} className="text-xs text-brand-600 hover:underline">View all →</button>
            </div>
            <div className="divide-y divide-slate-100">
              {data.top_customers.map((c, i) => {
                const max = Number(data.top_customers[0].amount);
                const pct = max > 0 ? (Number(c.amount) / max) * 100 : 0;
                return (
                  <div key={i} className="px-4 py-2.5">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 truncate">{c.customer}</span>
                      <span className="ml-2 shrink-0 font-semibold">{formatINR(c.amount)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Invoices</div>
            <button onClick={() => onGo('invoices')} className="text-xs text-brand-600 hover:underline">View all →</button>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.recent_invoices.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-slate-500 text-sm">
                  No invoices yet. <button onClick={() => onGo('invoices')} className="text-brand-600 hover:underline">Create →</button>
                </td></tr>
              )}
              {data.recent_invoices.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-brand-600">{i.invoice_no}</div>
                    <div className="text-xs text-slate-400">{i.date}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{i.customer}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatINR(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Receipts</div>
            <button onClick={() => onGo('receipts')} className="text-xs text-brand-600 hover:underline">View all →</button>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.recent_receipts.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-slate-500 text-sm">
                  No receipts yet. <button onClick={() => onGo('receipts')} className="text-brand-600 hover:underline">Record →</button>
                </td></tr>
              )}
              {data.recent_receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-emerald-600">{r.receipt_no}</div>
                    <div className="text-xs text-slate-400">{r.date}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{r.customer}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatINR(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST Compliance Alerts */}
      {companyId != null && <GSTAlertsPanel companyId={companyId} />}

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickCard icon={FileText} title="New Tax Invoice" desc="GST auto-split by supply state." onClick={() => onGo('invoices')} />
        <QuickCard icon={Receipt} title="Record Receipt" desc="Allocate against open invoices." onClick={() => onGo('receipts')} />
        <QuickCard icon={TrendingUp} title="View P&L" desc="Live profit & loss statement." onClick={() => onGo('pnl')} />
      </div>
    </div>
  );
}

function Step({ n, title, desc, cta, onClick }: { n: number; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-400 hover:shadow-sm">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{n}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
      <div className="mt-2 text-xs font-medium text-brand-600">{cta} →</div>
    </button>
  );
}

function QuickCard({ icon: Icon, title, desc, onClick }: { icon: LucideIcon; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex items-start gap-4 text-left transition hover:border-brand-300 hover:shadow-sm">
      <div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Icon size={18} /></div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
      </div>
    </button>
  );
}
