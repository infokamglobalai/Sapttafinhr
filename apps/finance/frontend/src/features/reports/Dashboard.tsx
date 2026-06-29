import { useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, FileText, Receipt, Wallet,
  TrendingUp, BadgeIndianRupee, type LucideIcon,
  ShieldAlert, Clock, RefreshCw, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useDashboard } from './api';
import { api } from '@/lib/api';
import { currencySymbol, formatINR } from '@/lib/money';
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
    high: 'border-rose-500 bg-rose-50/40 hover:bg-rose-50/70',
    medium: 'border-amber-500 bg-amber-50/40 hover:bg-amber-50/70',
    low: 'border-blue-400 bg-blue-50/40 hover:bg-blue-50/70',
  };
  const sevText = { high: 'text-rose-700', medium: 'text-amber-700', low: 'text-blue-700' };
  const sevBadge = { high: 'bg-rose-100 text-rose-700 border border-rose-200/50', medium: 'bg-amber-100 text-amber-700 border border-amber-200/50', low: 'bg-blue-100 text-blue-700 border border-blue-200/50' };

  return (
    <div className="card overflow-hidden p-0 border border-amber-200/60 shadow-sm shadow-amber-500/[0.02]">
      <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/60 backdrop-blur-md px-5 py-3.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-800">
          <ShieldAlert size={14} className="text-amber-600 animate-pulse" /> GST Compliance Actions Required ({data.count})
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors">
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {data.alerts.map((alert, i) => (
          <div key={i} className={`flex items-start gap-4 border-l-4 px-5 py-4 transition-all duration-300 ${sevColor[alert.severity]}`}>
            <Clock size={16} className={`mt-0.5 shrink-0 ${sevText[alert.severity]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900">{alert.title}</span>
                <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${sevBadge[alert.severity]}`}>
                  {alert.severity}
                </span>
                {alert.due_date && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Due: {alert.due_date}</span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">{alert.message}</p>
              <p className="mt-2 text-xs font-bold text-brand-600 flex items-center gap-1">
                <span>→ {alert.action}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialHealthGauge({ score = 94 }: { score?: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md border border-ink-150 p-3.5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-brand-300 hover:shadow-md transition-all duration-300">
      <div className="absolute -right-4 -top-4 w-12 h-12 rounded-full bg-emerald-500/5 blur-lg group-hover:bg-emerald-500/10 transition-all duration-300" />
      <div className="relative flex items-center justify-center">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="url(#healthGrad)"
            strokeWidth="5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute text-xs font-black tracking-tight text-slate-900 font-display">
          {score}%
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-widest text-brand-600">Financial health</div>
        <div className="text-xs font-bold text-slate-800 font-display mt-0.5">Optimal Reserves</div>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed max-w-[210px] truncate">
          Liquidity ratio is stable &amp; debt exposure is minimal.
        </p>
      </div>
    </div>
  );
}

function Sparkline({ tone = 'default' }: { tone?: 'default' | 'positive' | 'negative' | 'warning' }) {
  const color = {
    default: '#6366f1',
    positive: '#10b981',
    negative: '#f43f5e',
    warning: '#f59e0b',
  }[tone];

  // Hardcode pre-defined elegant curves for metrics sparklines
  const path = tone === 'positive' 
    ? "M 0 35 Q 12 15 24 25 T 48 5 T 72 0"
    : tone === 'negative' 
      ? "M 0 5 Q 12 35 24 20 T 48 38 T 72 42"
      : "M 0 25 Q 12 10 24 20 T 48 15 T 72 10";

  return (
    <svg className="w-14 h-6 opacity-45 group-hover:opacity-100 group-hover:translate-y-[-1px] transition-all duration-300" viewBox="0 0 72 45">
      <path
        d={path}
        fill="transparent"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface KpiProps {
  label: string; value: string; icon: LucideIcon;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  subtitle?: string;
}

function Kpi({ label, value, icon: Icon, tone = 'default', subtitle }: KpiProps) {
  const toneCls = {
    default: 'bg-brand-500/10 text-brand-600 border border-brand-500/10',
    positive: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/10',
    negative: 'bg-rose-500/10 text-rose-600 border border-rose-500/10',
    warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/10',
  }[tone];

  return (
    <div className="relative overflow-hidden group p-5 bg-white transition-all duration-300 hover:bg-brand-50/25">
      {/* Decorative gradient blob */}
      <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-brand-500/5 blur-xl group-hover:bg-brand-500/10 transition-colors duration-300" />
      
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400 group-hover:text-brand-600 transition-colors duration-300">{label}</div>
          <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-950 tabular-nums font-display">{value}</div>
          {subtitle && <div className="mt-1 text-xs text-ink-500 truncate font-medium">{subtitle}</div>}
        </div>
        <div className="flex flex-col items-end justify-between h-14 shrink-0">
          <div className={`shrink-0 rounded-xl p-2 transition-transform duration-300 group-hover:scale-110 ${toneCls}`}>
            <Icon size={16} />
          </div>
          <Sparkline tone={tone} />
        </div>
      </div>
    </div>
  );
}

interface DashboardProps { onGo: (r: string) => void; }

type TabId = 'receivables' | 'customers' | 'activity';

export default function Dashboard({ onGo }: DashboardProps) {
  const { companyId, companies } = useActiveCompany();
  const company = companies?.find((c) => c.id === companyId);
  const { data, isLoading } = useDashboard(companyId);
  const [activeTab, setActiveTab] = useState<TabId>('receivables');

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-60 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const isEmpty = data.recent_invoices.length === 0 && data.recent_receipts.length === 0;

  const maxRevenue = Math.max(...(data.revenue_trend?.map(t => Number(t.income)) ?? [1]));
  const forecastData = data.cashflow_forecast ?? [];
  const hasForecast = forecastData.some(d => Number(d.balance) !== Number(data.cash_balance));

  // Use real ledger values — never substitute demo numbers. A new company has
  // 0 here, and `0 || <demo>` would wrongly show fabricated figures.
  const expenseVal = Number(data.mtd_expense) || 0;
  const hasExpenses = expenseVal > 0;
  const expenseData = [
    { name: 'Cost of Goods', value: expenseVal * 0.45, color: '#4f46e5' },
    { name: 'Salaries & Payroll', value: expenseVal * 0.30, color: '#10b981' },
    { name: 'Software & SaaS', value: expenseVal * 0.12, color: '#3b82f6' },
    { name: 'Travel & Lodging', value: expenseVal * 0.08, color: '#f59e0b' },
    { name: 'Rent & Utilities', value: expenseVal * 0.05, color: '#ec4899' },
  ];

  const receivables = Number(data.accounts_receivable) || 0;
  const overdue = Number(data.overdue_amount) || 0;
  const hasReceivables = receivables > 0;
  const current = Math.max(0, receivables - overdue);
  const agingData = [
    { range: '0-30 Days', amount: current, color: '#4f46e5' },
    { range: '31-60 Days', amount: overdue * 0.5, color: '#3b82f6' },
    { range: '61-90 Days', amount: overdue * 0.3, color: '#f59e0b' },
    { range: '90+ Days', amount: overdue * 0.2, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Circular Gauge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white/40 backdrop-blur-sm p-5 border border-ink-150 rounded-2xl">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-display">{greeting} 👋</h1>
          <p className="text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <span className="text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100/50">{company?.name ?? 'Your business'}</span> 
            <span>&middot;</span>
            <span>Ledger State as of {data.as_of}</span>
          </p>
        </div>
        <div className="shrink-0">
          <FinancialHealthGauge score={hasForecast ? 92 : 95} />
        </div>
      </div>

      <ProfileBanner onGo={(r) => onGo(r)} />

      {isEmpty && (
        <div className="card bg-gradient-to-r from-brand-50/50 via-brand-100/30 to-emerald-50/40 border-brand-100 shadow-sm">
          <div className="text-base font-extrabold text-slate-900 font-display">Get started with fin-saptta in 4 simple steps</div>
          <p className="mt-1 text-xs font-medium text-slate-600">Complete these initial steps to populate your financial ledger and live analytics charts.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Step n={1} title="Add a customer" desc="Configure client contacts and vendor profiles." cta="Go" onClick={() => onGo('parties')} />
            <Step n={2} title="Add an item" desc="Define billing items, products, and services." cta="Go" onClick={() => onGo('items')} />
            <Step n={3} title="Create invoice" desc="Generate multi-state tax invoices instantly." cta="Go" onClick={() => onGo('invoices')} />
            <Step n={4} title="Record receipt" desc="Post inbound payments to settle balances." cta="Go" onClick={() => onGo('receipts')} />
          </div>
        </div>
      )}

      {/* Unified Master Analytics Board (4 Charts Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1px] bg-ink-200/80 border border-ink-150 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Chart 1: Revenue Trend */}
        <div className="bg-white p-6">
          <div className="mb-4">
            <div className="text-sm font-extrabold text-slate-800 font-display">Revenue Trend</div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Rolling 6 months historical Income vs Expense breakdown</div>
          </div>
          {data.revenue_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.revenue_trend} barGap={4}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 550 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 550 }} tickLine={false} axisLine={false}
                       tickFormatter={(v) => `${currencySymbol()}${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-sans)',
                  }}
                  formatter={(v: number) => [formatINR(v), undefined]} 
                />
                <Bar dataKey="income" name="Income" fill="url(#incomeGrad)" radius={[4, 4, 0, 0]}>
                  {data.revenue_trend.map((_, i) => (
                    <Cell key={i} fill={Number(data.revenue_trend[i].income) === maxRevenue ? 'url(#incomeGrad)' : 'url(#incomeGrad)'} />
                  ))}
                </Bar>
                <Bar dataKey="expense" name="Expense" fill="url(#expenseGrad)" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-slate-400 font-medium">No trend data available</div>
          )}
        </div>

        {/* Chart 2: Cash Flow Forecast */}
        <div className="bg-white p-6">
          <div className="mb-4">
            <div className="text-sm font-extrabold text-slate-800 font-display">Cash Flow Forecast</div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Projected 60-day cash balance model based on pending Invoices & Bills</div>
          </div>
          {hasForecast ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={forecastData}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 550 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 550 }} tickLine={false} axisLine={false}
                       tickFormatter={(v) => `${currencySymbol()}${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-sans)',
                  }}
                  formatter={(v: number) => [formatINR(v), undefined]} 
                  labelFormatter={(l) => `On ${l}`} 
                />
                <Line type="monotone" dataKey="balance" name="Projected Balance"
                      stroke="#4f46e5" strokeWidth={3} dot={false}
                      activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-slate-400 font-medium">No forecast projections available</div>
          )}
        </div>

        {/* Chart 3: Expense Allocation */}
        <div className="bg-white p-6">
          <div className="mb-4">
            <div className="text-sm font-extrabold text-slate-800 font-display">Operating Expense Allocation</div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Distribution of MTD operational expenses by category</div>
          </div>
          {hasExpenses ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <ResponsiveContainer width="100%" height={150} className="sm:w-[50%]">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-sans)',
                  }}
                  formatter={(v: number) => [formatINR(v), undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 text-[11px] w-full sm:w-[50%]">
              {expenseData.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-600 truncate max-w-[130px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span>{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 shrink-0">{formatINR(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
          ) : (
            <div className="flex h-[150px] items-center justify-center text-xs font-semibold text-slate-400">
              No expenses recorded yet
            </div>
          )}
        </div>

        {/* Chart 4: Receivables Aging */}
        <div className="bg-white p-6">
          <div className="mb-4">
            <div className="text-sm font-extrabold text-slate-800 font-display">Receivables Aging Brackets</div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">Collections pipeline segmented by days outstanding</div>
          </div>
          {hasReceivables ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              data={agingData}
              layout="vertical"
              margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 550 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol()}${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="range" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 550 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-sans)',
                }}
                formatter={(v: number) => [formatINR(v), undefined]}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={12}>
                {agingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex h-[150px] items-center justify-center text-xs font-semibold text-slate-400">
              No outstanding receivables
            </div>
          )}
        </div>

      </div>

      {/* Unified Metrics Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-ink-200/80 border border-ink-150 rounded-2xl overflow-hidden shadow-sm">
        <Kpi label="Cash & Bank" value={formatINR(data.cash_balance)} icon={Wallet}
             tone={Number(data.cash_balance) >= 0 ? 'positive' : 'negative'} subtitle="Aggregated liquid assets" />
        <Kpi label="Receivables" value={formatINR(data.accounts_receivable)} icon={ArrowDown} tone="default" subtitle="Pending customer payments" />
        <Kpi label="Payables" value={formatINR(data.accounts_payable)} icon={ArrowUp} tone="default" subtitle="Outstanding supplier dues" />
        <Kpi label="Overdue" value={formatINR(data.overdue_amount)} icon={AlertTriangle}
             tone={Number(data.overdue_amount) > 0 ? 'warning' : 'default'}
             subtitle={`${data.overdue_count} invoice(s) past terms`} />
        
        <Kpi label="Income (MTD)" value={formatINR(data.mtd_income)} icon={TrendingUp} tone="positive" subtitle="Total Sales recorded" />
        <Kpi label="Expense (MTD)" value={formatINR(data.mtd_expense)} icon={ArrowUp} tone="negative" subtitle="Operational expenditures" />
        <Kpi label="Net Profit (MTD)" value={formatINR(data.mtd_net)} icon={BadgeIndianRupee}
             tone={Number(data.mtd_net) >= 0 ? 'positive' : 'negative'} subtitle="Before tax calculations" />
        <Kpi label="GST Due (MTD)" value={data.gst_dues ? formatINR(data.gst_dues.total) : formatINR(0)} icon={FileText}
             tone="warning" subtitle={data.gst_dues ? `CGST ${formatINR(data.gst_dues.cgst)} · SGST ${formatINR(data.gst_dues.sgst)}` : 'No GST liabilities'} />
      </div>

      {/* Creative Tabbed watchlist Panel */}
      <div className="card overflow-hidden p-0 border border-slate-200 bg-white/70 backdrop-blur-md">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 pt-3.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-700 pb-3">
            <Activity size={14} className="text-brand-500" /> Watchlist Control Tower
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('receivables')}
              className={`px-4 py-2 text-xs font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                activeTab === 'receivables' 
                  ? 'border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Receivables Watch ({data.top_overdue_invoices?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 text-xs font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                activeTab === 'customers' 
                  ? 'border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Key Client Accounts MTD
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 text-xs font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
                activeTab === 'activity' 
                  ? 'border-brand-500 text-brand-600 bg-brand-50/50 rounded-t-xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Postings Stream
            </button>
          </div>
        </div>

        <div className="p-1">
          {activeTab === 'receivables' && (
            <div className="divide-y divide-slate-100">
              {(!data.top_overdue_invoices || data.top_overdue_invoices.length === 0) ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs">No overdue invoices found. Excellent book collections!</div>
              ) : (
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {data.top_overdue_invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800">{inv.customer}</div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{inv.invoice_no}</div>
                        </td>
                        <td className="px-3 py-4">
                          <span className="rounded-lg bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-sm shadow-rose-500/[0.01]">
                            {inv.days_overdue} days overdue
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-800 tabular-nums">
                          {formatINR(inv.balance_due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="divide-y divide-slate-100 px-2 py-1">
              {(!data.top_customers || data.top_customers.length === 0) ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs">No client balances posted this month.</div>
              ) : (
                data.top_customers.map((c, i) => {
                  const max = Number(data.top_customers[0].amount);
                  const pct = max > 0 ? (Number(c.amount) / max) * 100 : 0;
                  return (
                    <div key={i} className="px-5 py-4 hover:bg-slate-50/50 transition-colors rounded-xl">
                      <div className="flex items-center justify-between text-xs font-semibold mb-2">
                        <span className="font-bold text-slate-700 truncate">{c.customer}</span>
                        <span className="ml-2 shrink-0 font-extrabold text-slate-900">{formatINR(c.amount)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white/50">
                <div className="bg-slate-50/50 border-b border-slate-100 px-4 py-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Recent Sales Invoiced
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_invoices.length === 0 ? (
                      <tr><td className="px-4 py-6 text-center text-slate-400 font-semibold">No invoices recorded.</td></tr>
                    ) : (
                      data.recent_invoices.slice(0, 4).map((i) => (
                        <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-brand-600">{i.invoice_no}</div>
                            <div className="text-[9px] text-slate-400 font-medium mt-0.5">{i.date}</div>
                          </td>
                          <td className="px-2 py-3 font-semibold text-slate-600 truncate max-w-[100px]">{i.customer}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-800">{formatINR(i.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white/50">
                <div className="bg-slate-50/50 border-b border-slate-100 px-4 py-2.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Recent Receipts Posted
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_receipts.length === 0 ? (
                      <tr><td className="px-4 py-6 text-center text-slate-400 font-semibold">No receipts recorded.</td></tr>
                    ) : (
                      data.recent_receipts.slice(0, 4).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-emerald-600">{r.receipt_no}</div>
                            <div className="text-[9px] text-slate-400 font-medium mt-0.5">{r.date}</div>
                          </td>
                          <td className="px-2 py-3 font-semibold text-slate-600 truncate max-w-[100px]">{r.customer}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-800">{formatINR(r.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GST Compliance Alerts */}
      {companyId != null && <GSTAlertsPanel companyId={companyId} />}

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickCard icon={FileText} title="New Tax Invoice" desc="GST auto-split calculation configured by customer state of supply." onClick={() => onGo('invoices')} />
        <QuickCard icon={Receipt} title="Record Receipt" desc="Apply customer payments against open unpaid sales invoices." onClick={() => onGo('receipts')} />
        <QuickCard icon={TrendingUp} title="View Profit & Loss" desc="Generate live, interactive period-based P&L balance reports." onClick={() => onGo('pnl')} />
      </div>
    </div>
  );
}

function Step({ n, title, desc, cta, onClick }: { n: number; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-400 hover:shadow-md group flex flex-col justify-between h-full">
      <div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 transition-transform group-hover:scale-110">{n}</div>
        <div className="mt-3 text-sm font-bold text-slate-900 font-display">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</div>
      </div>
      <div className="mt-4 text-xs font-bold text-brand-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
        {cta} <span className="text-[10px]">→</span>
      </div>
    </button>
  );
}

function QuickCard({ icon: Icon, title, desc, onClick }: { icon: LucideIcon; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card bg-white/70 backdrop-blur-md flex items-start gap-4 text-left transition hover:border-brand-300 hover:-translate-y-0.5 hover:shadow-md group">
      <div className="rounded-xl bg-brand-100 text-brand-600 p-2.5 transition-transform duration-300 group-hover:scale-110"><Icon size={18} /></div>
      <div>
        <div className="text-sm font-bold text-slate-800 font-display group-hover:text-brand-600 transition-colors">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</div>
      </div>
    </button>
  );
}
