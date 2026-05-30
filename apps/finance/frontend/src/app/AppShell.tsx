import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, FileText, FilePlus2, LayoutDashboard, LogOut, type LucideIcon,
  Package, Receipt, Scale, TrendingUp, Users, FileMinus, Wallet, BookText,
  ShoppingCart, Truck, FileInput, Landmark, Calendar, Warehouse, Boxes,
  Building2, ReceiptText, CalendarDays, Settings, FileCheck2,
  BarChart3, Briefcase, BookCopy, ChevronRight, Plus, Menu, X as XIcon, Webhook,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/cn';
import { Toaster } from '@/components/Toaster';

import Dashboard from '@/features/reports/Dashboard';
import TrialBalancePage from '@/features/ledger/TrialBalancePage';
import ManualEntryPage from '@/features/ledger/ManualEntryPage';
import PartiesPage from '@/features/masters/PartiesPage';
import ItemsPage from '@/features/masters/ItemsPage';
import InvoicesPage from '@/features/billing/InvoicesPage';
import CreditNotesPage from '@/features/billing/CreditNotesPage';
import QuotationsPage from '@/features/billing/QuotationsPage';
import SalesOrdersPage from '@/features/billing/SalesOrdersPage';
import ReceiptsPage from '@/features/payments/ReceiptsPage';
import POsPage from '@/features/procurement/POsPage';
import VendorBillsPage from '@/features/procurement/VendorBillsPage';
import VendorPaymentsPage from '@/features/procurement/VendorPaymentsPage';
import BankAccountsPage from '@/features/banking/BankAccountsPage';
import PDCsPage from '@/features/banking/PDCsPage';
import WarehousesPage from '@/features/inventory/WarehousesPage';
import StockMovementsPage from '@/features/inventory/StockMovementsPage';
import StockSummaryPage from '@/features/inventory/StockSummaryPage';
import FixedAssetsPage from '@/features/assets/FixedAssetsPage';
import ClaimsPage from '@/features/expenses/ClaimsPage';
import PnLPage from '@/features/reports/PnLPage';
import BalanceSheetPage from '@/features/reports/BalanceSheetPage';
import PartyLedgerPage from '@/features/reports/PartyLedgerPage';
import AgingPage from '@/features/reports/AgingPage';
import SalesRegisterPage from '@/features/reports/SalesRegisterPage';
import CashFlowPage from '@/features/reports/CashFlowPage';
import DayBookPage from '@/features/reports/DayBookPage';
import SettingsPage from '@/features/settings/SettingsPage';
import CompanyProfilePage from '@/features/settings/CompanyProfilePage';
import CostCentersPage from '@/features/settings/CostCentersPage';
import ProjectsPage from '@/features/settings/ProjectsPage';
import APIKeysPage from '@/features/settings/APIKeysPage';
import WebhooksPage from '@/features/settings/WebhooksPage';
import RecurringInvoicesPage from '@/features/billing/RecurringInvoicesPage';
import ReconciliationPage from '@/features/banking/ReconciliationPage';
import HSNSummaryPage from '@/features/reports/HSNSummaryPage';
import GSTRExportPage from '@/features/reports/GSTRExportPage';
import AuditLogPage from '@/features/reports/AuditLogPage';
import BudgetVsActualPage from '@/features/reports/BudgetVsActualPage';
import CostCenterPnLPage from '@/features/reports/CostCenterPnLPage';
import ConsolidationPage from '@/features/reports/ConsolidationPage';

type RouteId =
  | 'dashboard'
  | 'parties' | 'items' | 'cost-centers' | 'projects'
  | 'quotations' | 'sales-orders' | 'invoices' | 'credit-notes' | 'receipts' | 'recurring-invoices'
  | 'purchase-orders' | 'vendor-bills' | 'vendor-payments'
  | 'bank-accounts' | 'pdcs' | 'reconciliation'
  | 'warehouses' | 'stock-movements' | 'stock-summary'
  | 'fixed-assets' | 'expense-claims'
  | 'manual' | 'trial-balance'
  | 'pnl' | 'balance-sheet' | 'cash-flow' | 'day-book' | 'party-ledger'
  | 'ar-aging' | 'sales-register' | 'hsn-summary' | 'gstr-export' | 'audit-log'
  | 'budget-vs-actual' | 'cost-center-pnl' | 'consolidation'
  | 'settings' | 'company-profile' | 'api-keys' | 'webhooks';

interface SubItem { id: RouteId; label: string; icon: LucideIcon; description?: string; }

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  direct?: RouteId;
  children?: SubItem[];
}

const SECTIONS: Section[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, direct: 'dashboard' },

  { id: 'masters', label: 'Masters', icon: BookCopy, children: [
    { id: 'parties', label: 'Customers & Vendors', icon: Users, description: 'People you sell to and buy from' },
    { id: 'items', label: 'Items', icon: Package, description: 'Products and services you trade' },
    { id: 'cost-centers', label: 'Cost Centers', icon: BookCopy, description: 'Tag JE lines for cost slicing' },
    { id: 'projects', label: 'Projects', icon: Briefcase, description: 'Group expenses + revenue by project' },
  ]},

  { id: 'sales', label: 'Sales', icon: TrendingUp, children: [
    { id: 'quotations', label: 'Quotations', icon: FileCheck2, description: 'Estimates sent to customers' },
    { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, description: 'Confirmed customer orders' },
    { id: 'invoices', label: 'Tax Invoices', icon: FileText, description: 'GST invoices with CGST/SGST/IGST' },
    { id: 'credit-notes', label: 'Credit Notes', icon: FileMinus, description: 'Reverse a posted invoice' },
    { id: 'receipts', label: 'Customer Receipts', icon: Receipt, description: 'Money received from customers' },
    { id: 'recurring-invoices', label: 'Recurring Invoices', icon: FileCheck2, description: 'Auto-generate invoices on a schedule' },
  ]},

  { id: 'purchase', label: 'Purchase', icon: Briefcase, children: [
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, description: 'POs to vendors' },
    { id: 'vendor-bills', label: 'Vendor Bills', icon: ReceiptText, description: 'Bills received from vendors' },
    { id: 'vendor-payments', label: 'Vendor Payments', icon: Truck, description: 'Money paid to vendors' },
  ]},

  { id: 'banking', label: 'Banking', icon: Landmark, children: [
    { id: 'bank-accounts', label: 'Bank Accounts', icon: Landmark, description: 'Bank and cash accounts' },
    { id: 'pdcs', label: 'Post-Dated Cheques', icon: CalendarDays, description: 'Track PDCs in and out' },
    { id: 'reconciliation', label: 'Reconciliation', icon: Landmark, description: 'Match statement lines to ledger' },
  ]},

  { id: 'inventory', label: 'Inventory', icon: Warehouse, children: [
    { id: 'warehouses', label: 'Warehouses', icon: Warehouse, description: 'Stock locations' },
    { id: 'stock-movements', label: 'Stock Movements', icon: FileInput, description: 'Every stock in/out' },
    { id: 'stock-summary', label: 'Stock on Hand', icon: Boxes, description: 'Live inventory snapshot' },
  ]},

  { id: 'assets', label: 'Assets', icon: Building2, direct: 'fixed-assets' },
  { id: 'expenses', label: 'Expenses', icon: FileInput, direct: 'expense-claims' },

  { id: 'ledger', label: 'Ledger', icon: BookOpen, children: [
    { id: 'manual', label: 'Manual Journal Entry', icon: FilePlus2, description: 'Hand-post a JE' },
    { id: 'trial-balance', label: 'Trial Balance', icon: BookOpen, description: 'Live balance from all entries' },
  ]},

  { id: 'reports', label: 'Reports', icon: BarChart3, children: [
    { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp, description: 'Income vs Expense' },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale, description: 'Assets vs Liabilities + Equity' },
    { id: 'cash-flow', label: 'Cash Flow', icon: Wallet, description: 'Net change in cash + bank' },
    { id: 'day-book', label: 'Day Book', icon: Calendar, description: 'All entries on one day' },
    { id: 'party-ledger', label: 'Party Statement', icon: BookText, description: 'Per-customer / vendor ledger' },
    { id: 'ar-aging', label: 'Receivables Aging', icon: Wallet, description: 'Who owes you and for how long' },
    { id: 'sales-register', label: 'Sales Register', icon: FileText, description: 'GST-style invoice register' },
    { id: 'hsn-summary', label: 'HSN Summary', icon: BarChart3, description: 'GSTR-1 HSN-wise outward summary' },
    { id: 'cost-center-pnl', label: 'P&L by Cost Center', icon: BarChart3, description: 'Income / expense by cost center' },
    { id: 'budget-vs-actual', label: 'Budget vs Actual', icon: TrendingUp, description: 'Variance per account' },
    { id: 'consolidation', label: 'Consolidation', icon: BarChart3, description: 'Multi-company P&L sum' },
    { id: 'audit-log', label: 'Audit Log', icon: BookText, description: 'Edits to financial records' },
    { id: 'gstr-export', label: 'GSTR-1 / 3B Export', icon: FileText, description: 'Download JSON for offline filing' },
  ]},

  { id: 'settings', label: 'Settings', icon: Settings, children: [
    { id: 'company-profile', label: 'Company Profile', icon: Settings, description: 'GSTIN, address, branding' },
    { id: 'api-keys', label: 'API Keys', icon: Settings, description: 'Programmatic access tokens' },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook, description: 'Push events to your URL' },
    { id: 'settings', label: 'Books Closing & Export', icon: Settings, description: 'Period lock, full data export' },
  ]},
];

// Common quick-create actions for the global "+" menu
const QUICK_ACTIONS: { id: RouteId; label: string; icon: LucideIcon }[] = [
  { id: 'invoices', label: 'New Tax Invoice', icon: FileText },
  { id: 'receipts', label: 'Record Receipt', icon: Receipt },
  { id: 'vendor-bills', label: 'New Vendor Bill', icon: ReceiptText },
  { id: 'vendor-payments', label: 'Pay a Vendor', icon: Truck },
  { id: 'purchase-orders', label: 'New Purchase Order', icon: ShoppingCart },
  { id: 'quotations', label: 'New Quotation', icon: FileCheck2 },
  { id: 'parties', label: 'New Customer / Vendor', icon: Users },
  { id: 'items', label: 'New Item', icon: Package },
];

const ALL_ROUTES: RouteId[] = SECTIONS.flatMap((s) =>
  s.direct ? [s.direct] : (s.children?.map((c) => c.id) ?? []),
);

function findSectionForRoute(routeId: RouteId): Section | undefined {
  return SECTIONS.find((s) => s.direct === routeId || s.children?.some((c) => c.id === routeId));
}

function findSubItem(routeId: RouteId): SubItem | undefined {
  for (const s of SECTIONS) {
    if (s.children) {
      const m = s.children.find((c) => c.id === routeId);
      if (m) return m;
    }
  }
  return undefined;
}

function readRoute(): RouteId {
  const h = window.location.hash.replace('#/', '') as RouteId;
  return (ALL_ROUTES.includes(h) ? h : 'dashboard');
}

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const [route, setRoute] = useState<RouteId>(readRoute());
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const initial = readRoute();
    return findSectionForRoute(initial)?.id ?? 'dashboard';
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const r = readRoute();
      setRoute(r);
      const s = findSectionForRoute(r);
      if (s) setActiveSectionId(s.id);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const activeSection = useMemo(
    () => SECTIONS.find((s) => s.id === activeSectionId),
    [activeSectionId],
  );

  const go = (r: RouteId) => { window.location.hash = `/${r}`; setQuickOpen(false); setMobileNavOpen(false); };

  const onSectionClick = (section: Section) => {
    setActiveSectionId(section.id);
    if (section.direct) {
      go(section.direct);
    } else if (section.children && section.children.length > 0) {
      const currentInSection = section.children.some((c) => c.id === route);
      if (!currentInSection) go(section.children[0].id);
    }
  };

  const showSecondary = !!activeSection && !activeSection.direct && (activeSection.children?.length ?? 0) > 0;
  const currentSub = findSubItem(route);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* PRIMARY: labeled icon rail */}
      <aside className="hidden w-24 shrink-0 flex-col items-stretch border-r border-slate-200 bg-white py-3 md:flex">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">fs</div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSectionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSectionClick(s)}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] leading-tight transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                )}
              >
                <Icon size={18} />
                <span className="text-center">{s.label}</span>
              </button>
            );
          })}
        </nav>
        <button onClick={logout}
          className="mx-2 mt-2 flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-red-600">
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      {/* SECONDARY: section panel */}
      {showSecondary && (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Section</div>
            <div className="text-base font-semibold text-slate-900">{activeSection!.label}</div>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 text-sm">
            {activeSection!.children!.map((child) => {
              const Icon = child.icon;
              const active = route === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => go(child.id)}
                  title={child.description}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left',
                    active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <div className="truncate" title={user?.email}>{user?.email}</div>
          </div>
        </aside>
      )}

      {/* MAIN with TOP BAR */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar: breadcrumb + quick create */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-md p-2 text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <Breadcrumb sectionLabel={activeSection?.label} subLabel={currentSub?.label} />
          </div>
          <div className="relative">
            <button
              onClick={() => setQuickOpen((o) => !o)}
              className="btn-primary inline-flex items-center gap-1"
            >
              <Plus size={16} /> Quick Create
            </button>
            {quickOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setQuickOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {QUICK_ACTIONS.map((q) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.id}
                        onClick={() => go(q.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <Icon size={15} className="text-slate-400" />
                        {q.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8">
          {route === 'dashboard' && <Dashboard onGo={(r) => go(r as RouteId)} />}
          {route === 'parties' && <PartiesPage />}
          {route === 'items' && <ItemsPage />}
          {route === 'quotations' && <QuotationsPage />}
          {route === 'sales-orders' && <SalesOrdersPage />}
          {route === 'invoices' && <InvoicesPage />}
          {route === 'credit-notes' && <CreditNotesPage />}
          {route === 'receipts' && <ReceiptsPage />}
          {route === 'purchase-orders' && <POsPage />}
          {route === 'vendor-bills' && <VendorBillsPage />}
          {route === 'vendor-payments' && <VendorPaymentsPage />}
          {route === 'bank-accounts' && <BankAccountsPage />}
          {route === 'pdcs' && <PDCsPage />}
          {route === 'warehouses' && <WarehousesPage />}
          {route === 'stock-movements' && <StockMovementsPage />}
          {route === 'stock-summary' && <StockSummaryPage />}
          {route === 'fixed-assets' && <FixedAssetsPage />}
          {route === 'expense-claims' && <ClaimsPage />}
          {route === 'manual' && <ManualEntryPage />}
          {route === 'trial-balance' && <TrialBalancePage />}
          {route === 'pnl' && <PnLPage />}
          {route === 'balance-sheet' && <BalanceSheetPage />}
          {route === 'cash-flow' && <CashFlowPage />}
          {route === 'day-book' && <DayBookPage />}
          {route === 'party-ledger' && <PartyLedgerPage />}
          {route === 'ar-aging' && <AgingPage />}
          {route === 'sales-register' && <SalesRegisterPage />}
          {route === 'settings' && <SettingsPage />}
          {route === 'company-profile' && <CompanyProfilePage />}
          {route === 'cost-centers' && <CostCentersPage />}
          {route === 'projects' && <ProjectsPage />}
          {route === 'api-keys' && <APIKeysPage />}
          {route === 'webhooks' && <WebhooksPage />}
          {route === 'recurring-invoices' && <RecurringInvoicesPage />}
          {route === 'reconciliation' && <ReconciliationPage />}
          {route === 'hsn-summary' && <HSNSummaryPage />}
          {route === 'gstr-export' && <GSTRExportPage />}
          {route === 'audit-log' && <AuditLogPage />}
          {route === 'budget-vs-actual' && <BudgetVsActualPage />}
          {route === 'cost-center-pnl' && <CostCenterPnLPage />}
          {route === 'consolidation' && <ConsolidationPage />}
        </main>
      </div>

      {/* MOBILE DRAWER */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-600 text-xs font-bold text-white">fs</div>
                <div className="text-sm font-semibold">fin-saptta</div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                <XIcon size={16} />
              </button>
            </div>
            <nav className="p-2 text-sm">
              {SECTIONS.map((s) => {
                if (s.direct) {
                  const Icon = s.icon;
                  const active = route === s.direct;
                  return (
                    <button key={s.id} onClick={() => go(s.direct!)}
                      className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left',
                        active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-100')}>
                      <Icon size={15} /> {s.label}
                    </button>
                  );
                }
                return (
                  <div key={s.id} className="mb-2">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</div>
                    {s.children?.map((child) => {
                      const ChildIcon = child.icon;
                      const cActive = route === child.id;
                      return (
                        <button key={child.id} onClick={() => go(child.id)}
                          className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left',
                            cActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-100')}>
                          <ChildIcon size={14} /> {child.label}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <button onClick={logout}
                className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-slate-500 hover:bg-red-50 hover:text-red-700">
                <LogOut size={14} /> Sign out
              </button>
            </nav>
            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">{user?.email}</div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}

function Breadcrumb({ sectionLabel, subLabel }: { sectionLabel?: string; subLabel?: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500">
      <span>{sectionLabel ?? 'Home'}</span>
      {subLabel && (
        <>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-medium text-slate-900">{subLabel}</span>
        </>
      )}
    </nav>
  );
}
