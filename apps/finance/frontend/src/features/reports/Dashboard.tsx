import { AlertTriangle, ArrowDown, ArrowUp, FileText, Receipt, Wallet, type LucideIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useDashboard } from './api';
import { formatINR } from '@/lib/money';
import ProfileBanner from '@/components/ProfileBanner';

interface KpiProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  subtitle?: string;
}

function Kpi({ label, value, icon: Icon, tone = 'default', subtitle }: KpiProps) {
  const toneCls = {
    default: 'bg-slate-50 text-slate-700',
    positive: 'bg-emerald-50 text-emerald-700',
    negative: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
  }[tone];
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
        </div>
        <div className={`rounded-lg p-2 ${toneCls}`}>
          <Icon size={20} />
        </div>
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
    return <div className="text-slate-500">Loading dashboard…</div>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const isEmpty = data.recent_invoices.length === 0 && data.recent_receipts.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{greeting} 👋</h1>
        <p className="text-sm text-slate-500">
          Here's how <strong>{company?.name ?? 'your business'}</strong> is doing as of {data.as_of}.
        </p>
      </div>

      <ProfileBanner onGo={(r) => onGo(r)} />

      {isEmpty && (
        <div className="card bg-gradient-to-r from-brand-50 to-emerald-50">
          <div className="text-base font-semibold text-slate-900">Get started in 4 steps</div>
          <p className="mt-1 text-sm text-slate-600">Once you've done these, the dashboard fills up with live numbers.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Step n={1} title="Add a customer" desc="People you sell to." cta="Go to Customers" onClick={() => onGo('parties')} />
            <Step n={2} title="Add an item" desc="Products / services you sell." cta="Go to Items" onClick={() => onGo('items')} />
            <Step n={3} title="Create an invoice" desc="GST splits automatically." cta="New Invoice" onClick={() => onGo('invoices')} />
            <Step n={4} title="Record a receipt" desc="Mark it as paid." cta="New Receipt" onClick={() => onGo('receipts')} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Cash & Bank" value={formatINR(data.cash_balance)} icon={Wallet}
             tone={Number(data.cash_balance) >= 0 ? 'positive' : 'negative'}
             subtitle="Money you actually have" />
        <Kpi label="Money owed to you" value={formatINR(data.accounts_receivable)} icon={ArrowDown}
             subtitle="By customers" />
        <Kpi label="Money you owe" value={formatINR(data.accounts_payable)} icon={ArrowUp}
             subtitle="To vendors" />
        <Kpi label="Overdue invoices" value={formatINR(data.overdue_amount)} icon={AlertTriangle}
             tone={Number(data.overdue_amount) > 0 ? 'warning' : 'default'}
             subtitle={`${data.overdue_count} invoice(s) past due`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Kpi label="This month — Income" value={formatINR(data.mtd_income)} icon={ArrowDown} tone="positive" />
          <Kpi label="This month — Expense" value={formatINR(data.mtd_expense)} icon={ArrowUp} tone="negative" />
          <Kpi label="This month — Net Profit" value={formatINR(data.mtd_net)}
               icon={Number(data.mtd_net) >= 0 ? ArrowDown : ArrowUp}
               tone={Number(data.mtd_net) >= 0 ? 'positive' : 'negative'} />
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Income vs Expense (MTD)</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Income', value: Math.max(Number(data.mtd_income), 0) },
                  { name: 'Expense', value: Math.max(Number(data.mtd_expense), 0) },
                ]}
                cx="50%" cy="50%" innerRadius={32} outerRadius={56} dataKey="value"
              >
                <Cell fill="#059669" />
                <Cell fill="#dc2626" />
              </Pie>
              <Tooltip formatter={(v: number) => formatINR(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Recent Invoices</div>
            <button onClick={() => onGo('invoices')} className="text-xs text-brand-600 hover:underline">View all →</button>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              {data.recent_invoices.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-sm text-slate-500">
                  No invoices yet. <button onClick={() => onGo('invoices')} className="text-brand-600 hover:underline">Create your first →</button>
                </td></tr>
              )}
              {data.recent_invoices.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-brand-600">{i.invoice_no}</td>
                  <td className="px-4 py-2 text-slate-500">{i.date}</td>
                  <td className="px-4 py-2">{i.customer}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Recent Receipts</div>
            <button onClick={() => onGo('receipts')} className="text-xs text-brand-600 hover:underline">View all →</button>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              {data.recent_receipts.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-sm text-slate-500">
                  No receipts yet. <button onClick={() => onGo('receipts')} className="text-brand-600 hover:underline">Record one →</button>
                </td></tr>
              )}
              {data.recent_receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-brand-600">{r.receipt_no}</td>
                  <td className="px-4 py-2 text-slate-500">{r.date}</td>
                  <td className="px-4 py-2">{r.customer}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickCard icon={FileText} title="New Tax Invoice" desc="GST auto-split by place of supply." onClick={() => onGo('invoices')} />
        <QuickCard icon={Receipt} title="Record Receipt" desc="Allocate against open invoices." onClick={() => onGo('receipts')} />
        <QuickCard icon={ArrowDown} title="See P&L" desc="Live, from posted entries." onClick={() => onGo('pnl')} />
      </div>
    </div>
  );
}

function Step({ n, title, desc, cta, onClick }: { n: number; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-400 hover:shadow-md">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{n}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
      <div className="mt-2 text-xs font-medium text-brand-600">{cta} →</div>
    </button>
  );
}

function QuickCard({ icon: Icon, title, desc, onClick }: { icon: LucideIcon; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card text-left transition hover:shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-600">
        <Icon size={16} /> {title}
      </div>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>
    </button>
  );
}
