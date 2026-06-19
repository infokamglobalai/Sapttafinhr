import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AccountRow { account_id: number; code: string; name: string; amount: string; }

export interface PnL {
  period: { start: string; end: string };
  income: AccountRow[];
  expense: AccountRow[];
  total_income: string;
  total_expense: string;
  net_profit: string;
}

export interface BalanceSheet {
  as_of: string;
  assets: AccountRow[];
  liabilities: AccountRow[];
  equity: AccountRow[];
  current_period_pl: string;
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  is_balanced: boolean;
}

export interface PartyLedgerRow {
  date: string; voucher_no: string; account: string; narration: string;
  debit: string; credit: string; running_balance: string;
}

export interface PartyLedger {
  party_id: number;
  rows: PartyLedgerRow[];
  closing_balance: string;
}

export interface AgingRow {
  customer_id: number; customer_name: string;
  '0-30': string; '31-60': string; '61-90': string; '90+': string; total: string;
}

export interface ARAging { as_of: string; rows: AgingRow[]; grand_total: string; }

export interface SalesRegisterRow {
  id: number; date: string; invoice_no: string; customer_name: string; gstin: string;
  place_of_supply: string; taxable_amount: string; cgst: string; sgst: string; igst: string;
  grand_total: string; amount_paid: string; balance_due: string;
}

export interface SalesRegister {
  period: { start: string; end: string };
  rows: SalesRegisterRow[];
  totals: { taxable_amount: string; cgst: string; sgst: string; igst: string; grand_total: string };
}

export interface DashboardData {
  as_of: string;
  cash_balance: string;
  accounts_receivable: string;
  accounts_payable: string;
  mtd_income: string;
  mtd_expense: string;
  mtd_net: string;
  overdue_count: number;
  overdue_amount: string;
  gst_dues: { cgst: string; sgst: string; igst: string; total: string };
  revenue_trend: { month: string; income: string; expense: string; net: string }[];
  cashflow_forecast: { date: string; label: string; balance: string }[];
  top_customers: { customer: string; amount: string }[];
  top_overdue_invoices: {
    id: number; invoice_no: string; date: string; due_date: string;
    customer: string; customer_email: string; amount: string;
    balance_due: string; days_overdue: number;
  }[];
  recent_invoices: { id: number; invoice_no: string; date: string; customer: string; amount: string; balance_due: string; }[];
  recent_receipts: { id: number; receipt_no: string; date: string; customer: string; amount: string; }[];
}

export const useDashboard = (company?: number) =>
  useQuery({
    queryKey: ['dashboard', company],
    enabled: company != null,
    queryFn: async () => (await api.get<DashboardData>('/reports/dashboard/', { params: { company } })).data,
  });

export const usePnL = (company?: number, start?: string, end?: string) =>
  useQuery({
    queryKey: ['pnl', company, start, end],
    enabled: company != null,
    queryFn: async () => (await api.get<PnL>('/reports/pnl/', { params: { company, start, end } })).data,
  });

export const useBalanceSheet = (company?: number, asOf?: string) =>
  useQuery({
    queryKey: ['balance-sheet', company, asOf],
    enabled: company != null,
    queryFn: async () => (await api.get<BalanceSheet>('/reports/balance-sheet/', { params: { company, as_of: asOf } })).data,
  });

export const usePartyLedger = (company?: number, party?: number, start?: string, end?: string) =>
  useQuery({
    queryKey: ['party-ledger', company, party, start, end],
    enabled: company != null && party != null,
    queryFn: async () => (await api.get<PartyLedger>('/reports/party-ledger/', { params: { company, party, start, end } })).data,
  });

export const useARAging = (company?: number, asOf?: string) =>
  useQuery({
    queryKey: ['ar-aging', company, asOf],
    enabled: company != null,
    queryFn: async () => (await api.get<ARAging>('/reports/ar-aging/', { params: { company, as_of: asOf } })).data,
  });

export const useSalesRegister = (company?: number, start?: string, end?: string) =>
  useQuery({
    queryKey: ['sales-register', company, start, end],
    enabled: company != null,
    queryFn: async () => (await api.get<SalesRegister>('/reports/sales-register/', { params: { company, start, end } })).data,
  });

export interface VatReturn {
  period: { start: string; end: string };
  output: {
    standard_taxable: string;
    zero_rated_taxable: string;
    exempt_taxable: string;
    output_vat: string;
    reverse_charge_vat: string;
    credit_note_vat: string;
  };
  input: { input_vat: string };
  net_vat_payable: string;
}

export const useVatReturn = (company?: number, start?: string, end?: string) =>
  useQuery({
    queryKey: ['vat-return', company, start, end],
    enabled: company != null,
    queryFn: async () => (await api.get<VatReturn>('/reports/vat-return/', { params: { company, start, end } })).data,
  });
