import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, FileText, FilePlus2, LayoutDashboard, LogOut, type LucideIcon,
  Package, Receipt, Scale, TrendingUp, Users, FileMinus, Wallet, BookText,
  ShoppingCart, Truck, FileInput, Landmark, Calendar, Warehouse, Boxes,
  Building2, ReceiptText, CalendarDays, Settings, FileCheck2,
  BarChart3, Briefcase, BookCopy, Plus, Menu, X as XIcon, Webhook, Share2, Hash, UserCircle2,
  Search, LayoutGrid, AlertTriangle, Globe, Layers, Zap, ScrollText, Kanban,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/cn';
import { setDisplayCurrency } from '@/lib/money';
import { Toaster } from '@/components/Toaster';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fetchOwnedProducts, platformBillingUrl, switchToHrApp } from '@/lib/products';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import type { TaxRegime } from '@/features/masters/api';

import Dashboard from '@/features/reports/Dashboard';
import TrialBalancePage from '@/features/ledger/TrialBalancePage';
import ManualEntryPage from '@/features/ledger/ManualEntryPage';
import PartiesPage from '@/features/masters/PartiesPage';
import ItemsPage from '@/features/masters/ItemsPage';
import InvoicesPage from '@/features/billing/InvoicesPage';
import CreditNotesPage from '@/features/billing/CreditNotesPage';
import QuotationsPage from '@/features/billing/QuotationsPage';
import SalesOrdersPage from '@/features/billing/SalesOrdersPage';
import ClientDocumentsPage from '@/features/billing/ClientDocumentsPage';
import SalesCrmPage from '@/features/crm/SalesCrmPage';
import ReceiptsPage from '@/features/payments/ReceiptsPage';
import POsPage from '@/features/procurement/POsPage';
import GRNsPage from '@/features/procurement/GRNsPage';
import VendorBillsPage from '@/features/procurement/VendorBillsPage';
import VendorPaymentsPage from '@/features/procurement/VendorPaymentsPage';
import BankAccountsPage from '@/features/banking/BankAccountsPage';
import PDCsPage from '@/features/banking/PDCsPage';
import WarehousesPage from '@/features/inventory/WarehousesPage';
import StockMovementsPage from '@/features/inventory/StockMovementsPage';
import InventoryTrackingPage from '@/features/inventory/InventoryTrackingPage';
import StockSummaryPage from '@/features/inventory/StockSummaryPage';
import FixedAssetsPage from '@/features/assets/FixedAssetsPage';
import ClaimsPage from '@/features/expenses/ClaimsPage';
import PettyCashPage from '@/features/expenses/PettyCashPage';
import BudgetsPage from '@/features/expenses/BudgetsPage';
import PnLPage from '@/features/reports/PnLPage';
import BalanceSheetPage from '@/features/reports/BalanceSheetPage';
import PartyLedgerPage from '@/features/reports/PartyLedgerPage';
import AgingPage from '@/features/reports/AgingPage';
import SalesRegisterPage from '@/features/reports/SalesRegisterPage';
import CashFlowPage from '@/features/reports/CashFlowPage';
import DayBookPage from '@/features/reports/DayBookPage';
import SettingsPage from '@/features/settings/SettingsPage';
import CompanyProfilePage from '@/features/settings/CompanyProfilePage';
import TaxJurisdictionPage from '@/features/settings/TaxJurisdictionPage';
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
import VatReturnPage from '@/features/reports/VatReturnPage';
import DirectTaxPage from '@/features/reports/DirectTaxPage';
import PortalAccessPage from '@/features/portal/PortalAccessPage';
import NotificationBell from '@/features/notifications/NotificationBell';
import NumberSeriesPage from '@/features/settings/NumberSeriesPage';
import TeamPage from '@/features/team/TeamPage';
import TDSPage from '@/features/taxation/TDSPage';
import GSTR2BPage from '@/features/taxation/GSTR2BPage';
import AutomationRulesPage from '@/features/settings/AutomationRulesPage';
import UncategorizedPage from '@/features/ledger/UncategorizedPage';

type RouteId =
  | 'dashboard'
  | 'parties' | 'items' | 'cost-centers' | 'projects'
  | 'quotations' | 'sales-crm' | 'sales-orders' | 'client-documents' | 'invoices' | 'credit-notes' | 'receipts' | 'recurring-invoices' | 'portal-access'
  | 'purchase-orders' | 'grns' | 'vendor-bills' | 'vendor-payments'
  | 'bank-accounts' | 'pdcs' | 'reconciliation'
  | 'warehouses' | 'stock-movements' | 'stock-summary' | 'inventory-tracking'
  | 'fixed-assets' | 'expense-claims' | 'petty-cash' | 'budgets'
  | 'manual' | 'trial-balance'
  | 'pnl' | 'balance-sheet' | 'cash-flow' | 'day-book' | 'party-ledger'
  | 'ar-aging' | 'sales-register' | 'hsn-summary' | 'gstr-export' | 'gstr-2b' | 'audit-log'
  | 'budget-vs-actual' | 'cost-center-pnl' | 'consolidation' | 'vat-return' | 'direct-tax'
  | 'settings' | 'company-profile' | 'tax-jurisdiction' | 'api-keys' | 'webhooks' | 'number-series' | 'automation'
  | 'team' | 'tds' | 'uncategorized';

interface SubItem { id: RouteId; label: string; icon: LucideIcon; description?: string; regimes?: TaxRegime[]; }

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  direct?: RouteId;
  children?: SubItem[];
}

const SECTIONS: Section[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, direct: 'dashboard' },
  { id: 'day-book', label: 'Day Book', icon: Calendar, direct: 'day-book' },

  {
    id: 'masters', label: 'Masters', icon: BookCopy, children: [
      { id: 'parties', label: 'Customers & Vendors', icon: Users, description: 'People you sell to and buy from' },
      { id: 'items', label: 'Items', icon: Package, description: 'Products and services you trade' },
      { id: 'cost-centers', label: 'Cost Centers', icon: BookCopy, description: 'Tag JE lines for cost slicing' },
      { id: 'projects', label: 'Projects', icon: Briefcase, description: 'Group expenses + revenue by project' },
    ]
  },

  {
    id: 'sales', label: 'Sales', icon: TrendingUp, children: [
      { id: 'sales-crm', label: 'Sales CRM', icon: Kanban, description: 'Lead pipeline & follow-ups (owner)' },
      { id: 'quotations', label: 'Quotations', icon: FileCheck2, description: 'Estimates sent to customers' },
      { id: 'client-documents', label: 'Client Contracts', icon: ScrollText, description: 'SOW, MSA, NDA from quotations' },
      { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, description: 'Confirmed customer orders' },
      { id: 'invoices', label: 'Tax Invoices', icon: FileText, description: 'GST invoices with CGST/SGST/IGST' },
      { id: 'credit-notes', label: 'Credit Notes', icon: FileMinus, description: 'Reverse a posted invoice' },
      { id: 'receipts', label: 'Customer Receipts', icon: Receipt, description: 'Money received from customers' },
      { id: 'recurring-invoices', label: 'Recurring Invoices', icon: FileCheck2, description: 'Auto-generate invoices on a schedule' },
      { id: 'portal-access', label: 'Customer Portal', icon: Share2, description: 'Private links for customers to view their invoices' },
    ]
  },

  {
    id: 'purchase', label: 'Purchase', icon: Briefcase, children: [
      { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, description: 'POs to vendors' },
      { id: 'grns', label: 'Goods Receipt (GRN)', icon: Package, description: 'Record goods received against POs' },
      { id: 'vendor-bills', label: 'Vendor Bills', icon: ReceiptText, description: 'Bills received from vendors' },
      { id: 'vendor-payments', label: 'Vendor Payments', icon: Truck, description: 'Money paid to vendors' },
    ]
  },

  {
    id: 'banking', label: 'Banking', icon: Landmark, children: [
      { id: 'bank-accounts', label: 'Bank Accounts', icon: Landmark, description: 'Bank and cash accounts' },
      { id: 'pdcs', label: 'Post-Dated Cheques', icon: CalendarDays, description: 'Track PDCs in and out' },
      { id: 'reconciliation', label: 'Reconciliation', icon: Landmark, description: 'Match statement lines to ledger' },
    ]
  },

  {
    id: 'inventory', label: 'Inventory', icon: Warehouse, children: [
      { id: 'warehouses', label: 'Warehouses', icon: Warehouse, description: 'Stock locations' },
      { id: 'stock-movements', label: 'Stock Movements', icon: FileInput, description: 'Every stock in/out' },
      { id: 'stock-summary', label: 'Stock on Hand', icon: Boxes, description: 'Live inventory snapshot' },
      { id: 'inventory-tracking', label: 'Bins / Batches / Serials', icon: Layers, description: 'Advanced tracking' },
    ]
  },

  { id: 'assets', label: 'Assets', icon: Building2, direct: 'fixed-assets' },
  {
    id: 'expenses', label: 'Expenses', icon: FileInput, children: [
      { id: 'expense-claims', label: 'Expense Claims', icon: FileInput, description: 'Employee reimbursement' },
      { id: 'petty-cash', label: 'Petty Cash', icon: Wallet, description: 'Imprest floats & transactions' },
      { id: 'budgets', label: 'Budgets', icon: TrendingUp, description: 'Budget lines by account' },
    ],
  },

  {
    id: 'ledger', label: 'Ledger', icon: BookOpen, children: [
      { id: 'manual', label: 'Manual Journal Entry', icon: FilePlus2, description: 'Hand-post a JE' },
      { id: 'trial-balance', label: 'Trial Balance', icon: BookOpen, description: 'Live balance from all entries' },
    ]
  },

  {
    id: 'reports', label: 'Reports', icon: BarChart3, children: [
      { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp, description: 'Income vs Expense' },
      { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale, description: 'Assets vs Liabilities + Equity' },
      { id: 'cash-flow', label: 'Cash Flow', icon: Wallet, description: 'Net change in cash + bank' },
      { id: 'party-ledger', label: 'Party Statement', icon: BookText, description: 'Per-customer / vendor ledger' },
      { id: 'ar-aging', label: 'Receivables Aging', icon: Wallet, description: 'Who owes you and for how long' },
      { id: 'sales-register', label: 'Sales Register', icon: FileText, description: 'Register of all posted invoices' },
      { id: 'vat-return', label: 'VAT Return', icon: FileText, description: 'GCC output/input VAT and net payable', regimes: ['GCC_VAT'] },
      { id: 'direct-tax', label: 'Direct Tax', icon: BarChart3, description: 'UAE corporate tax / KSA Zakat estimate', regimes: ['GCC_VAT'] },
      { id: 'hsn-summary', label: 'HSN Summary', icon: BarChart3, description: 'GSTR-1 HSN-wise outward summary', regimes: ['INDIA_GST'] },
      { id: 'cost-center-pnl', label: 'P&L by Cost Center', icon: BarChart3, description: 'Income / expense by cost center' },
      { id: 'budget-vs-actual', label: 'Budget vs Actual', icon: TrendingUp, description: 'Variance per account' },
      { id: 'consolidation', label: 'Consolidation', icon: BarChart3, description: 'Multi-company P&L sum' },
      { id: 'audit-log', label: 'Audit Log', icon: BookText, description: 'Edits to financial records' },
      { id: 'gstr-export', label: 'GSTR-1 / 3B Export', icon: FileText, description: 'Download JSON for offline filing', regimes: ['INDIA_GST'] },
      { id: 'gstr-2b', label: 'GSTR-2B Reconcile', icon: FileText, description: 'ITC match against vendor bills', regimes: ['INDIA_GST'] },
    ]
  },

  { id: 'team', label: 'Team', icon: UserCircle2, direct: 'team' },
  { id: 'tds', label: 'TDS', icon: FileText, direct: 'tds' },
  { id: 'uncategorized', label: 'Uncategorized', icon: AlertTriangle, direct: 'uncategorized' },

  {
    id: 'settings', label: 'Settings', icon: Settings, children: [
      { id: 'company-profile', label: 'Company Profile', icon: Settings, description: 'GSTIN, address, branding' },
      { id: 'tax-jurisdiction', label: 'Region / Tax Jurisdiction', icon: Globe, description: 'Country tax regime: India GST or GCC VAT' },
      { id: 'number-series', label: 'Number Series', icon: Hash, description: 'Document number prefixes & sequences' },
      { id: 'api-keys', label: 'API Keys', icon: Settings, description: 'Programmatic access tokens' },
      { id: 'webhooks', label: 'Webhooks', icon: Webhook, description: 'Push events to your URL' },
      { id: 'automation', label: 'Automation Rules', icon: Zap, description: 'Triggers for email, webhooks, alerts' },
      { id: 'settings', label: 'Books Closing & Export', icon: Settings, description: 'Period lock, full data export' },
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

/** A nav item shows only if it has no regime restriction or matches the active one. */
function childVisible(child: SubItem, regime: TaxRegime): boolean {
  return !child.regimes || child.regimes.includes(regime);
}

function readRoute(): RouteId {
  const h = window.location.hash.replace('#/', '') as RouteId;
  return (ALL_ROUTES.includes(h) ? h : 'dashboard');
}

export default function AppShell() {
  const { user } = useAuthStore();
  const [route, setRoute] = useState<RouteId>(readRoute());
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const initial = readRoute();
    return findSectionForRoute(initial)?.id ?? 'dashboard';
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { companyId, companies } = useActiveCompany();
  const activeCompany = companies?.find((c) => c.id === companyId);
  const activeRegime: TaxRegime = activeCompany?.tax_regime ?? 'INDIA_GST';
  // Drive the app-wide money formatter from the active company's base currency.
  // Set during render (before child pages format their amounts) so the very
  // first paint already uses the right currency for GCC tenants.
  setDisplayCurrency(activeCompany?.base_currency);
  const { data: uncategorizedCount = 0 } = useQuery({
    queryKey: ['uncategorized-count', companyId],
    enabled: companyId != null,
    queryFn: async () => {
      const res = await api.get('/ledger/entries/', {
        params: { company: companyId, category: 'uncategorized', page_size: 1 },
      });
      return res.data.count || 0;
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const onHash = () => {
      const r = readRoute();
      setRoute(r);
      const s = findSectionForRoute(r);
      if (s) {
        setActiveSectionId((prev) => {
          if (s.id !== prev) setSearchQuery('');
          return s.id;
        });
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const activeSection = useMemo(
    () => SECTIONS.find((s) => s.id === activeSectionId),
    [activeSectionId],
  );

  const go = (r: RouteId) => { window.location.hash = `/${r}`; setQuickOpen(false); setMobileNavOpen(false); };

  const { data: ownedProducts = ['FIN'] } = useQuery({
    queryKey: ['owned-products'],
    queryFn: fetchOwnedProducts,
    staleTime: 60_000,
  });
  const hasHrProduct = ownedProducts.includes('HR');

  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const switchToHr = () => { void switchToHrApp(); };
  const openBilling = () => window.location.assign(platformBillingUrl());
  const signOut = () => {
    const PLATFORM = (import.meta.env.VITE_PLATFORM_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
    // Full logout: drop THIS product's session (its own origin), then end the
    // platform session via /logout. Removing the persisted key directly avoids
    // re-rendering into the "no session → bounce to login" path before we leave.
    try { localStorage.removeItem('finsaptta-auth'); } catch { /* ignore */ }
    window.location.assign(`${PLATFORM}/logout`);
  };

  const appMenu = (
    <>
      <div className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-brand-600">Products</div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-ink-950 bg-brand-50/50">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        fin-saptta
        <span className="ml-auto text-[10px] text-ink-500 font-normal">current</span>
      </div>
      <button onClick={hasHrProduct ? switchToHr : openBilling} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-ink-700 hover:bg-ink-100 hover:text-ink-950 transition-colors">
        <Users size={14} className="text-ink-500" /> Saptta HR
        {!hasHrProduct && <span className="ml-auto text-[10px] text-amber-600 font-semibold">Upgrade</span>}
      </button>
      <div className="my-1 border-t border-ink-150" />
      <button onClick={openBilling} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-ink-700 hover:bg-ink-100 hover:text-ink-950 transition-colors">
        <Settings size={14} className="text-ink-500" /> Account &amp; Billing
      </button>
      <button onClick={signOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
        <LogOut size={14} /> Sign out
      </button>
    </>
  );

  const onSectionClick = (section: Section) => {
    if (section.id !== activeSectionId) setSearchQuery('');
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
    <div className="flex h-screen w-screen overflow-hidden bg-ink-50">
      {/* PRIMARY: labeled icon rail */}
      <aside className="group/sidebar relative z-20 hidden w-[84px] hover:w-[220px] shrink-0 flex-col items-center hover:items-stretch border-r border-slate-100 bg-white py-6 md:flex transition-[width] duration-300 ease-in-out overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="mb-8 flex items-center px-[22px] w-full">
          <div className="relative flex shrink-0 h-10 w-10 group-hover/sidebar:w-full items-center justify-center group-hover/sidebar:justify-start rounded-xl bg-slate-50 group-hover/sidebar:bg-transparent border border-slate-100 group-hover/sidebar:border-transparent transition-all duration-300">
            <img src="/logo.png" alt="Saptta Fin" className="h-6 group-hover/sidebar:h-10 w-auto object-contain transition-all duration-300" />
            <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 group-hover/sidebar:hidden"></div>
          </div>
        </div>
        <nav className="flex-1 w-full flex flex-col items-center hover:items-stretch px-3 gap-2 mt-2 overflow-x-hidden overflow-y-hidden hover:overflow-y-auto custom-scrollbar">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSectionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSectionClick(s)}
                title={s.label}
                className={cn(
                  'group relative flex h-[48px] w-[48px] group-hover/sidebar:w-full items-center rounded-2xl transition-all duration-300 outline-none',
                  active 
                    ? 'text-brand-600 bg-brand-50 shadow-inner' 
                    : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 hover:-translate-y-1 hover:shadow-md',
                )}
              >
                <div className="flex h-full w-[48px] shrink-0 items-center justify-center">
                  <Icon size={22} className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110 group-hover:-translate-y-0.5")} />
                </div>
                <span className="font-semibold text-[13px] whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 tracking-wide text-left flex-1 pr-4">
                  {s.label}
                </span>
                
                {s.id === 'uncategorized' && uncategorizedCount > 0 && (
                  <span className="absolute right-0 top-0 group-hover/sidebar:right-3 group-hover/sidebar:top-1/2 group-hover/sidebar:-translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white transition-all duration-300">
                    {uncategorizedCount > 99 ? '99+' : uncategorizedCount}
                  </span>
                )}
                {active && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-brand-500 rounded-r-full transition-all duration-300 opacity-0 group-hover/sidebar:opacity-100" />
                )}
                {active && (
                  <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-500 rounded-full animate-in fade-in zoom-in group-hover/sidebar:opacity-0 transition-opacity duration-300" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="relative mt-auto pt-4 w-full px-3 flex justify-center group-hover/sidebar:justify-start">
          <button
            onClick={() => setAppMenuOpen((v) => !v)}
            title="Products & account"
            className="group flex h-[48px] w-[48px] group-hover/sidebar:w-full items-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300"
          >
            <div className="flex h-full w-[48px] shrink-0 items-center justify-center">
              <LayoutGrid size={22} className="transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
            </div>
            <span className="font-semibold text-[13px] whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 tracking-wide text-left flex-1">
              Account & Apps
            </span>
          </button>
        </div>
      </aside>

      {/* Products / account menu — portaled to <body> so it isn't clipped by the
          rail's overflow-hidden or mis-anchored by its hover-expand width.
          Both the rail button and the secondary-panel user card toggle it. */}
      {appMenuOpen && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/10" onClick={() => setAppMenuOpen(false)} />
          <div className="fixed bottom-4 left-4 z-50 w-60 rounded-2xl border border-ink-200 bg-white py-2 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200">
            {appMenu}
          </div>
        </>,
        document.body,
      )}

      {/* SECONDARY: section panel */}
      {showSecondary && (
        <aside className="relative z-10 hidden w-[260px] shrink-0 flex-col border-r border-slate-100 bg-slate-50/50 py-8 md:flex animate-slide-in-left">
          <div className="px-6 pb-5 border-b border-transparent mb-2 flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              {activeSection!.label}
            </div>
          </div>
          
          {/* Menu Search */}
          <div className="relative mx-4 mb-6 group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menus..."
              className="w-full pl-9 pr-8 py-2.5 text-[13px] font-medium bg-transparent rounded-full text-slate-900 border border-slate-200 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all duration-300 placeholder-slate-400"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600 hover:bg-slate-300 hover:text-slate-900 transition-colors">✕</button>
            )}
          </div>

          <nav className="flex-1 overflow-y-hidden hover:overflow-y-auto px-4 space-y-0.5 text-[13px] font-medium custom-scrollbar">
            {activeSection!.children!
              .filter((child) => childVisible(child, activeRegime))
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
                      'group flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-left transition-all duration-300 relative',
                      active 
                        ? 'text-brand-700 bg-white shadow-sm ring-1 ring-slate-200/50' 
                        : 'text-slate-500 hover:text-brand-600 hover:bg-white hover:shadow-sm hover:translate-x-1',
                    )}
                  >
                    {active && <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-500 rounded-full"></span>}
                    <Icon size={16} className={cn("shrink-0 transition-transform duration-300", active ? "text-brand-600" : "opacity-60 group-hover:scale-110")} />
                    <span className="truncate">{child.label}</span>
                  </button>
                );
              })}
          </nav>
          
          {/* User / Status Bottom Area */}
          <div className="mt-4 mx-4 pt-4 border-t border-slate-200/60">
            <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setAppMenuOpen(true)}>
              <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                {user?.email?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold text-slate-800 text-xs" title={user?.email}>{user?.email?.split('@')[0]}</div>
                <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span> Online
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* MAIN with TOP BAR */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar: breadcrumb + quick create */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 md:px-8 z-20 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <Breadcrumb sectionLabel={activeSection?.label} subLabel={currentSub?.label} />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setQuickOpen((o) => !o)}
                className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-brand-500 hover:text-brand-600 active:scale-95 shadow-sm"
              >
                <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
                <span>Create</span>
              </button>
              {quickOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setQuickOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-ink-150 bg-white/95 backdrop-blur-md py-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    {QUICK_ACTIONS.map((q) => {
                      const Icon = q.icon;
                      return (
                        <button
                          key={q.id}
                          onClick={() => go(q.id)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        >
                          <Icon size={15} className="text-brand-500/70" />
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

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8 bg-ink-50/30">
          <div key={route} className="animate-fade-in">
            {route === 'dashboard' && <Dashboard onGo={(r) => go(r as RouteId)} />}
            {route === 'parties' && <PartiesPage />}
            {route === 'items' && <ItemsPage />}
            {route === 'quotations' && <QuotationsPage />}
            {route === 'sales-crm' && <SalesCrmPage />}
            {route === 'client-documents' && <ClientDocumentsPage />}
            {route === 'sales-orders' && <SalesOrdersPage />}
            {route === 'invoices' && <InvoicesPage />}
            {route === 'credit-notes' && <CreditNotesPage />}
            {route === 'receipts' && <ReceiptsPage />}
            {route === 'purchase-orders' && <POsPage />}
            {route === 'grns' && <GRNsPage />}
            {route === 'vendor-bills' && <VendorBillsPage />}
            {route === 'vendor-payments' && <VendorPaymentsPage />}
            {route === 'bank-accounts' && <BankAccountsPage />}
            {route === 'pdcs' && <PDCsPage />}
            {route === 'warehouses' && <WarehousesPage />}
            {route === 'stock-movements' && <StockMovementsPage />}
            {route === 'stock-summary' && <StockSummaryPage />}
            {route === 'inventory-tracking' && <InventoryTrackingPage />}
            {route === 'fixed-assets' && <FixedAssetsPage />}
            {route === 'expense-claims' && <ClaimsPage />}
            {route === 'petty-cash' && <PettyCashPage />}
            {route === 'budgets' && <BudgetsPage />}
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
            {route === 'tax-jurisdiction' && <TaxJurisdictionPage />}
            {route === 'number-series' && <NumberSeriesPage />}
            {route === 'cost-centers' && <CostCentersPage />}
            {route === 'projects' && <ProjectsPage />}
            {route === 'api-keys' && <APIKeysPage />}
            {route === 'webhooks' && <WebhooksPage />}
            {route === 'automation' && <AutomationRulesPage />}
            {route === 'recurring-invoices' && <RecurringInvoicesPage />}
            {route === 'portal-access' && <PortalAccessPage />}
            {route === 'reconciliation' && <ReconciliationPage />}
            {route === 'hsn-summary' && <HSNSummaryPage />}
            {route === 'gstr-export' && <GSTRExportPage />}
            {route === 'gstr-2b' && <GSTR2BPage />}
            {route === 'audit-log' && <AuditLogPage />}
            {route === 'budget-vs-actual' && <BudgetVsActualPage />}
            {route === 'cost-center-pnl' && <CostCenterPnLPage />}
            {route === 'consolidation' && <ConsolidationPage />}
            {route === 'vat-return' && <VatReturnPage />}
            {route === 'direct-tax' && <DirectTaxPage />}
            {route === 'team' && <TeamPage />}
            {route === 'tds' && <TDSPage />}
            {route === 'uncategorized' && <UncategorizedPage />}
          </div>
        </main>
      </div>

      {/* MOBILE DRAWER */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-2xl rounded-r-2xl border-r border-ink-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Saptta" className="h-7 w-auto object-contain" />
                <div className="text-sm font-bold tracking-tight">fin-saptta</div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100">
                <XIcon size={16} />
              </button>
            </div>
            <nav className="p-4 text-xs font-semibold space-y-1">
              {SECTIONS.map((s) => {
                if (s.direct) {
                  const Icon = s.icon;
                  const active = route === s.direct;
                  return (
                    <button key={s.id} onClick={() => go(s.direct!)}
                      className={cn('relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all',
                        active ? 'bg-brand-50 text-brand-600 font-bold' : 'text-ink-600 hover:bg-slate-100 hover:text-ink-900')}>
                      <Icon size={15} /> {s.label}
                      {s.id === 'uncategorized' && uncategorizedCount > 0 && (
                        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {uncategorizedCount}
                        </span>
                      )}
                    </button>
                  );
                }
                return (
                  <div key={s.id} className="mb-4">
                    <div className="px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-brand-600">{s.label}</div>
                    {s.children?.filter((child) => childVisible(child, activeRegime)).map((child) => {
                      const ChildIcon = child.icon;
                      const cActive = route === child.id;
                      return (
                        <button key={child.id} onClick={() => go(child.id)}
                          className={cn('flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all',
                            cActive ? 'bg-brand-50 text-brand-600 font-bold' : 'text-ink-600 hover:bg-slate-100 hover:text-ink-900')}>
                          <ChildIcon size={14} /> {child.label}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div className="mt-4 border-t border-slate-200 pt-4 space-y-1">
                <button onClick={hasHrProduct ? switchToHr : openBilling}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-ink-600 hover:bg-slate-100 hover:text-ink-900">
                  <Users size={14} /> Saptta HR
                  {!hasHrProduct && <span className="ml-auto text-[10px] text-amber-600 font-semibold">Upgrade</span>}
                </button>
                <button onClick={openBilling}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-ink-600 hover:bg-slate-100 hover:text-ink-900">
                  <Settings size={14} /> Account &amp; Billing
                </button>
                <button onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50 hover:text-red-700 font-bold">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </nav>
            <div className="border-t border-slate-200 px-6 py-4 text-xs font-semibold text-slate-500">{user?.email}</div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}

function Breadcrumb({ sectionLabel, subLabel }: { sectionLabel?: string; subLabel?: string }) {
  return (
    <nav className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-slate-400">
      <span className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">{sectionLabel ?? 'Home'}</span>
      {subLabel && (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">{subLabel}</span>
        </>
      )}
    </nav>
  );
}

