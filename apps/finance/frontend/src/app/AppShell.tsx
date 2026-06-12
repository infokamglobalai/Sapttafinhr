import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, FileText, FilePlus2, LayoutDashboard, LogOut, type LucideIcon,
  Package, Receipt, Scale, TrendingUp, Users, FileMinus, Wallet, BookText,
  ShoppingCart, Truck, FileInput, Landmark, Calendar, Warehouse, Boxes,
  Building2, ReceiptText, CalendarDays, Settings, FileCheck2,
  BarChart3, Briefcase, BookCopy, ChevronRight, Plus, Menu, X as XIcon, Webhook, Share2, Hash, UserCircle2,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/cn';
import { Toaster } from '@/components/Toaster';
import { api } from '@/lib/api';

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
import PortalAccessPage from '@/features/portal/PortalAccessPage';
import NotificationBell from '@/features/notifications/NotificationBell';
import NumberSeriesPage from '@/features/settings/NumberSeriesPage';
import TeamPage from '@/features/team/TeamPage';
import TDSPage from '@/features/taxation/TDSPage';

type RouteId =
  | 'dashboard'
  | 'parties' | 'items' | 'cost-centers' | 'projects'
  | 'quotations' | 'sales-orders' | 'invoices' | 'credit-notes' | 'receipts' | 'recurring-invoices' | 'portal-access'
  | 'purchase-orders' | 'vendor-bills' | 'vendor-payments'
  | 'bank-accounts' | 'pdcs' | 'reconciliation'
  | 'warehouses' | 'stock-movements' | 'stock-summary'
  | 'fixed-assets' | 'expense-claims'
  | 'manual' | 'trial-balance'
  | 'pnl' | 'balance-sheet' | 'cash-flow' | 'day-book' | 'party-ledger'
  | 'ar-aging' | 'sales-register' | 'hsn-summary' | 'gstr-export' | 'audit-log'
  | 'budget-vs-actual' | 'cost-center-pnl' | 'consolidation'
  | 'settings' | 'company-profile' | 'api-keys' | 'webhooks' | 'number-series'
  | 'team' | 'tds'
  // HRM routes:
  | 'employee-mgmt' | 'attendance' | 'payroll' | 'leave-mgmt' | 'recruitment' | 'hr-reports';

interface SubItem {
  id: RouteId;
  label: string;
  icon: LucideIcon;
  description?: string;
  module?: 'Accounting' | 'HRM';
  permission?: string;
}

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  direct?: RouteId;
  children?: SubItem[];
  module?: 'Accounting' | 'HRM';
  permission?: string;
}

const SECTIONS: Section[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, direct: 'dashboard' },

  {
    id: 'masters', label: 'Masters', icon: BookCopy, module: 'Accounting', children: [
      { id: 'parties', label: 'Customers & Vendors', icon: Users, description: 'People you sell to and buy from', module: 'Accounting', permission: 'view_invoices' },
      { id: 'items', label: 'Items', icon: Package, description: 'Products and services you trade', module: 'Accounting', permission: 'view_invoices' },
      { id: 'cost-centers', label: 'Cost Centers', icon: BookCopy, description: 'Tag JE lines for cost slicing', module: 'Accounting', permission: 'view_ledger' },
      { id: 'projects', label: 'Projects', icon: Briefcase, description: 'Group expenses + revenue by project', module: 'Accounting', permission: 'view_ledger' },
    ]
  },

  {
    id: 'sales', label: 'Sales', icon: TrendingUp, module: 'Accounting', children: [
      { id: 'quotations', label: 'Quotations', icon: FileCheck2, description: 'Estimates sent to customers', module: 'Accounting', permission: 'view_invoices' },
      { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, description: 'Confirmed customer orders', module: 'Accounting', permission: 'view_invoices' },
      { id: 'invoices', label: 'Tax Invoices', icon: FileText, description: 'GST invoices with CGST/SGST/IGST', module: 'Accounting', permission: 'view_invoices' },
      { id: 'credit-notes', label: 'Credit Notes', icon: FileMinus, description: 'Reverse a posted invoice', module: 'Accounting', permission: 'view_invoices' },
      { id: 'receipts', label: 'Customer Receipts', icon: Receipt, description: 'Money received from customers', module: 'Accounting', permission: 'view_invoices' },
      { id: 'recurring-invoices', label: 'Recurring Invoices', icon: FileCheck2, description: 'Auto-generate invoices on a schedule', module: 'Accounting', permission: 'view_invoices' },
      { id: 'portal-access', label: 'Customer Portal', icon: Share2, description: 'Private links for customers to view their invoices', module: 'Accounting', permission: 'view_invoices' },
    ]
  },

  {
    id: 'purchase', label: 'Purchase', icon: Briefcase, module: 'Accounting', children: [
      { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, description: 'POs to vendors', module: 'Accounting', permission: 'view_invoices' },
      { id: 'vendor-bills', label: 'Vendor Bills', icon: ReceiptText, description: 'Bills received from vendors', module: 'Accounting', permission: 'view_invoices' },
      { id: 'vendor-payments', label: 'Vendor Payments', icon: Truck, description: 'Money paid to vendors', module: 'Accounting', permission: 'view_ledger' },
    ]
  },

  {
    id: 'banking', label: 'Banking', icon: Landmark, module: 'Accounting', children: [
      { id: 'bank-accounts', label: 'Bank Accounts', icon: Landmark, description: 'Bank and cash accounts', module: 'Accounting', permission: 'view_banking' },
      { id: 'pdcs', label: 'Post-Dated Cheques', icon: CalendarDays, description: 'Track PDCs in and out', module: 'Accounting', permission: 'view_banking' },
      { id: 'reconciliation', label: 'Reconciliation', icon: Landmark, description: 'Match statement lines to ledger', module: 'Accounting', permission: 'view_banking' },
    ]
  },

  {
    id: 'inventory', label: 'Inventory', icon: Warehouse, module: 'Accounting', children: [
      { id: 'warehouses', label: 'Warehouses', icon: Warehouse, description: 'Stock locations', module: 'Accounting', permission: 'view_ledger' },
      { id: 'stock-movements', label: 'Stock Movements', icon: FileInput, description: 'Every stock in/out', module: 'Accounting', permission: 'view_ledger' },
      { id: 'stock-summary', label: 'Stock on Hand', icon: Boxes, description: 'Live inventory snapshot', module: 'Accounting', permission: 'view_ledger' },
    ]
  },

  { id: 'assets', label: 'Assets', icon: Building2, direct: 'fixed-assets', module: 'Accounting', permission: 'view_ledger' },
  { id: 'expenses', label: 'Expenses', icon: FileInput, direct: 'expense-claims', module: 'Accounting', permission: 'view_ledger' },

  {
    id: 'ledger', label: 'Ledger', icon: BookOpen, module: 'Accounting', children: [
      { id: 'manual', label: 'Manual Journal Entry', icon: FilePlus2, description: 'Hand-post a JE', module: 'Accounting', permission: 'view_ledger' },
      { id: 'trial-balance', label: 'Trial Balance', icon: BookOpen, description: 'Live balance from all entries', module: 'Accounting', permission: 'view_ledger' },
    ]
  },

  {
    id: 'reports', label: 'Reports', icon: BarChart3, module: 'Accounting', children: [
      { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp, description: 'Income vs Expense', module: 'Accounting', permission: 'view_reports' },
      { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale, description: 'Assets vs Liabilities + Equity', module: 'Accounting', permission: 'view_reports' },
      { id: 'cash-flow', label: 'Cash Flow', icon: Wallet, description: 'Net change in cash + bank', module: 'Accounting', permission: 'view_reports' },
      { id: 'day-book', label: 'Day Book', icon: Calendar, description: 'All entries on one day', module: 'Accounting', permission: 'view_reports' },
      { id: 'party-ledger', label: 'Party Statement', icon: BookText, description: 'Per-customer / vendor ledger', module: 'Accounting', permission: 'view_reports' },
      { id: 'ar-aging', label: 'Receivables Aging', icon: Wallet, description: 'Who owes you and for how long', module: 'Accounting', permission: 'view_reports' },
      { id: 'sales-register', label: 'Sales Register', icon: FileText, description: 'GST-style invoice register', module: 'Accounting', permission: 'view_reports' },
      { id: 'hsn-summary', label: 'HSN Summary', icon: BarChart3, description: 'GSTR-1 HSN-wise outward summary', module: 'Accounting', permission: 'view_reports' },
      { id: 'cost-center-pnl', label: 'P&L by Cost Center', icon: BarChart3, description: 'Income / expense by cost center', module: 'Accounting', permission: 'view_reports' },
      { id: 'budget-vs-actual', label: 'Budget vs Actual', icon: TrendingUp, description: 'Variance per account', module: 'Accounting', permission: 'view_reports' },
      { id: 'consolidation', label: 'Consolidation', icon: BarChart3, description: 'Multi-company P&L sum', module: 'Accounting', permission: 'view_reports' },
      { id: 'audit-log', label: 'Audit Log', icon: BookText, description: 'Edits to financial records', module: 'Accounting', permission: 'view_reports' },
      { id: 'gstr-export', label: 'GSTR-1 / 3B Export', icon: FileText, description: 'Download JSON for offline filing', module: 'Accounting', permission: 'view_reports' },
    ]
  },

  {
    id: 'hrm', label: 'HRM', icon: Users, module: 'HRM', children: [
      { id: 'employee-mgmt', label: 'Employee Directory', icon: Users, description: 'Manage employee profiles and files', module: 'HRM', permission: 'view_employees' },
      { id: 'attendance', label: 'Attendance Roster', icon: Calendar, description: 'Geofenced attendance & check-ins', module: 'HRM', permission: 'view_attendance' },
      { id: 'leave-mgmt', label: 'Leave Management', icon: CalendarDays, description: 'Leave balances, requests, and approvals', module: 'HRM', permission: 'view_leaves' },
      { id: 'payroll', label: 'Payroll & Compliance', icon: Wallet, description: 'Salary calculations, payslips, and compliance', module: 'HRM', permission: 'view_payroll' },
      { id: 'recruitment', label: 'Recruitment (ATS)', icon: Briefcase, description: 'Job openings, candidates, and pipelines', module: 'HRM', permission: 'view_recruitment' },
    ]
  },

  { id: 'team', label: 'Team', icon: UserCircle2, direct: 'team', permission: 'view_employees' },
  { id: 'tds', label: 'TDS', icon: FileText, direct: 'tds', module: 'Accounting', permission: 'view_reports' },

  {
    id: 'settings', label: 'Settings', icon: Settings, children: [
      { id: 'company-profile', label: 'Company Profile', icon: Settings, description: 'GSTIN, address, branding', permission: 'view_ledger' },
      { id: 'number-series', label: 'Number Series', icon: Hash, description: 'Document number prefixes & sequences', permission: 'view_ledger' },
      { id: 'api-keys', label: 'API Keys', icon: Settings, description: 'Programmatic access tokens', permission: 'view_ledger' },
      { id: 'webhooks', label: 'Webhooks', icon: Webhook, description: 'Push events to your URL', permission: 'view_ledger' },
      { id: 'settings', label: 'Books Closing & Export', icon: Settings, description: 'Period lock, full data export', permission: 'view_ledger' },
    ]
  },
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

const HR_PATHS: Record<string, string> = {
  'employee-mgmt': '/hr/employees/',
  'attendance': '/hr/attendance/',
  'payroll': '/hr/payroll/',
  'leave-mgmt': '/hr/leaves/',
  'recruitment': '/hr/recruitment/',
  'hr-reports': '/hr/hr/',
};

function HRMIframe({ targetPath }: { targetPath: string }) {
  const [loading, setLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    async function initSSO() {
      setLoading(true);
      try {
        const ws = localStorage.getItem('saptta_workspace') || '';
        const res = await api.post<{ token: string }>('/auth/hr-sso-token/', { workspace: ws });
        if (!active) return;
        const ssoUrl = `/hr/auth/sso/?token=${res.data.token}&next=${encodeURIComponent(targetPath)}`;
        setIframeUrl(ssoUrl);
      } catch (err) {
        console.error("SSO Handoff error", err);
        if (active) setIframeUrl(targetPath);
      } finally {
        if (active) setLoading(false);
      }
    }
    
    initSSO();
    return () => { active = false; };
  }, [targetPath]);

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center bg-slate-50 rounded-lg p-12 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin text-slate-400">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span className="text-sm font-medium">Connecting securely to Saptta HR...</span>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={iframeUrl || targetPath}
      className="h-[calc(100vh-10rem)] w-full border-none rounded-lg shadow-sm bg-white"
      title="HRMS Module"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
  );
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const visibleSections = useMemo(() => {
    const activeProducts = user?.products || [];
    const userPermissions = user?.permissions || [];
    const isSuperAdmin = user?.role === 'Super Admin' || userPermissions.includes('all');

    return SECTIONS.filter(s => {
      if (s.module === 'HRM' && !activeProducts.includes('hrms')) return false;
      if (s.module === 'Accounting' && !activeProducts.includes('finance')) return false;
      if (s.direct && s.permission && !isSuperAdmin && !userPermissions.includes(s.permission)) return false;
      return true;
    }).map(s => {
      if (s.children) {
        return {
          ...s,
          children: s.children.filter(c => {
            if (c.module === 'HRM' && !activeProducts.includes('hrms')) return false;
            if (c.module === 'Accounting' && !activeProducts.includes('finance')) return false;
            if (c.permission && !isSuperAdmin && !userPermissions.includes(c.permission)) return false;
            return true;
          })
        };
      }
      return s;
    }).filter(s => s.direct || (s.children && s.children.length > 0));
  }, [user]);

  const activeSection = useMemo(
    () => visibleSections.find((s) => s.id === activeSectionId),
    [activeSectionId, visibleSections],
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
    <div className="flex min-h-screen bg-ink-50">
      {/* PRIMARY: labeled icon rail */}
      <aside className="hidden w-[72px] shrink-0 flex-col items-center border-r border-ink-150 bg-white py-4 md:flex">
        <div className="mb-4 flex items-center justify-center border-b border-ink-100 pb-4 w-full">
          <img src="/logo.png" alt="Saptta" className="h-8 w-auto object-contain" />
        </div>
        <nav className="flex-1 w-full flex flex-col items-center gap-1 mt-2">
          {visibleSections.map((s) => {
            const Icon = s.icon;
            const active = activeSectionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSectionClick(s)}
                title={s.label}
                className={cn(
                  'relative flex w-[52px] h-[52px] flex-col items-center justify-center rounded-xl transition-all duration-150 outline-none',
                  active 
                    ? 'bg-ink-150 text-ink-950 font-semibold' 
                    : 'text-ink-500 hover:bg-ink-100 hover:text-ink-950',
                )}
              >
                <Icon size={20} className="opacity-75" />
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-ink-950 rounded-r-sm" />
                )}
              </button>
            );
          })}
        </nav>
        <button 
          onClick={logout}
          title="Sign out"
          className="flex w-[52px] h-[52px] items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={20} />
        </button>
      </aside>

      {/* SECONDARY: section panel */}
      {showSecondary && (
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-ink-150 bg-ink-50 py-5 md:flex">
          <div className="px-5 pb-3 border-b border-ink-100 mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{activeSection!.label}</div>
          </div>
          
          {/* Menu Search */}
          <div className="relative mx-3 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menus..."
              className="w-full pl-8 pr-8 py-1.5 text-xs font-normal bg-ink-100 rounded-md text-ink-950 border border-transparent outline-none focus:bg-white focus:border-ink-950 transition-all"
            />
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-500 hover:text-ink-950">✕</button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 text-xs">
            {activeSection!.children!
              .filter((child) => !searchQuery || child.label.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((child) => {
                const Icon = child.icon;
                const active = route === child.id;
                return (
                  <button
                    key={child.id}
                    onClick={() => go(child.id)}
                    title={child.description}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-all duration-150',
                      active 
                        ? 'bg-ink-150 text-ink-950 font-semibold' 
                        : 'text-ink-700 hover:bg-ink-100 hover:text-ink-950',
                    )}
                  >
                    <Icon size={14} className="shrink-0 opacity-60" />
                    <span className="truncate">{child.label}</span>
                  </button>
                );
              })}
          </nav>
          <div className="border-t border-ink-100 px-4 pt-3 text-[10px] text-ink-500">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
              System operational
            </div>
            <div className="truncate" title={user?.email}>{user?.email}</div>
          </div>
        </aside>
      )}

      {/* MAIN with TOP BAR */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar: breadcrumb + quick create */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-150 bg-white px-4 md:px-6">
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
          <div className="flex items-center gap-1">
            <NotificationBell />
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
          {route === 'number-series' && <NumberSeriesPage />}
          {route === 'cost-centers' && <CostCentersPage />}
          {route === 'projects' && <ProjectsPage />}
          {route === 'api-keys' && <APIKeysPage />}
          {route === 'webhooks' && <WebhooksPage />}
          {route === 'recurring-invoices' && <RecurringInvoicesPage />}
          {route === 'portal-access' && <PortalAccessPage />}
          {route === 'reconciliation' && <ReconciliationPage />}
          {route === 'hsn-summary' && <HSNSummaryPage />}
          {route === 'gstr-export' && <GSTRExportPage />}
          {route === 'audit-log' && <AuditLogPage />}
          {route === 'budget-vs-actual' && <BudgetVsActualPage />}
          {route === 'cost-center-pnl' && <CostCenterPnLPage />}
          {route === 'consolidation' && <ConsolidationPage />}
          {route === 'team' && <TeamPage />}
          {route === 'tds' && <TDSPage />}
          {['employee-mgmt', 'attendance', 'payroll', 'leave-mgmt', 'recruitment', 'hr-reports'].includes(route) && (
            <HRMIframe targetPath={HR_PATHS[route]} />
          )}
        </main>
      </div>

      {/* MOBILE DRAWER */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Saptta" className="h-7 w-auto object-contain" />
                <div className="text-sm font-semibold">fin-saptta</div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                <XIcon size={16} />
              </button>
            </div>
            <nav className="p-2 text-sm">
              {visibleSections.map((s) => {
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
