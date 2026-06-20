import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TaxRegime = 'INDIA_GST' | 'GCC_VAT' | 'NONE';

export interface Jurisdiction {
  country: string;
  name: string;
  tax_regime: TaxRegime;
  tax_id_label: string;
  currency: string;
  standard_vat_rate: string;
  reg_threshold: string;
  fiscal_year_start_month: number;
  einvoice_scheme: string;
}

export interface Company {
  id: number; name: string; legal_name?: string;
  gstin: string; pan?: string;
  state_code: string; base_currency: string;
  // Tax jurisdiction (Region setting)
  country?: string;
  tax_regime?: TaxRegime;
  tax_id?: string;
  standard_vat_rate?: string;
  tax_regime_display?: string;   // read-only
  tax_id_label?: string;         // read-only (GSTIN / TRN / …)
  jurisdiction?: Jurisdiction | null; // read-only rule set for country
  books_closed_until?: string | null;
  setup_complete?: boolean;
}
export interface FiscalYear { id: number; company: number; name: string; start_date: string; end_date: string; is_active: boolean; }
export interface Account { id: number; company: number; code: string; name: string; type: string; parent: number | null; is_postable: boolean; is_active: boolean; }
export interface Party {
  id: number; company: number; kind: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  name: string; legal_name: string; gstin: string; pan: string;
  email: string; phone: string; billing_address: string; state_code: string;
  credit_limit: string; is_active: boolean;
  bank_account_name: string; bank_account_number: string;
  bank_name: string; bank_ifsc: string; bank_branch: string;
  upi_id: string;
  has_bank_details?: boolean;
}
export interface HSNCode { id: number; company: number; code: string; description: string; default_tax_rate: string; }
export interface Item {
  id: number; company: number; sku: string; name: string; kind: 'GOODS' | 'SERVICE';
  description: string; hsn: number | null; hsn_code: string; unit: string;
  sale_price: string; purchase_price: string; tax_rate: string; effective_tax_rate: string;
  is_active: boolean;
}

interface Paginated<T> { results: T[]; count: number; }

export const useCompanies = () =>
  useQuery({
    queryKey: ['companies'],
    queryFn: async () => (await api.get<Paginated<Company>>('/masters/companies/')).data.results,
  });

export const useUpdateCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Company> & { id: number }) =>
      (await api.patch(`/masters/companies/${id}/`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
};

/** Per-country tax rule sets (India + GCC) for the Region / Tax Jurisdiction setting. */
export const useJurisdictions = () =>
  useQuery({
    queryKey: ['jurisdictions'],
    staleTime: Infinity,
    queryFn: async () =>
      (await api.get<{ jurisdictions: Jurisdiction[] }>('/masters/jurisdictions/')).data.jurisdictions,
  });

export const useFiscalYears = (company?: number) =>
  useQuery({
    queryKey: ['fiscal-years', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<FiscalYear>>('/masters/fiscal-years/', { params: { company, is_active: true } })).data.results,
  });

// ── First-run setup ────────────────────────────────────────────────────────
export interface SetupStatus {
  setup_complete: boolean;
  company_id: number | null;
  company_name?: string;
  missing: string[];
  has_fiscal_year?: boolean;
  has_bank_account?: boolean;
}
export const useSetupStatus = () =>
  useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => (await api.get<SetupStatus>('/masters/setup/status/')).data,
    staleTime: 0,
  });

export const useCreateFiscalYear = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<FiscalYear>) => (await api.post('/masters/fiscal-years/', data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-years'] }); qc.invalidateQueries({ queryKey: ['setup-status'] }); },
  });
};

export const useCreateBankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => (await api.post('/banking/bank-accounts/', data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); qc.invalidateQueries({ queryKey: ['setup-status'] }); },
  });
};

export const useCompleteSetup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/masters/setup/complete/', {})).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['setup-status'] }); qc.invalidateQueries({ queryKey: ['companies'] }); },
  });
};

export const usePostableAccounts = (company?: number) =>
  useQuery({
    queryKey: ['accounts', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<Account>>('/masters/accounts/', {
        params: { company, is_postable: true, is_active: true, page_size: 500 },
      })).data.results,
  });

export const useSeedAccounts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (company: number) =>
      (await api.post('/masters/accounts/seed_defaults/', { company })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};

export const useParties = (company?: number, kind?: 'CUSTOMER' | 'VENDOR') =>
  useQuery({
    queryKey: ['parties', company, kind],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<Party>>('/masters/parties/', {
        params: { company, kind, is_active: true, page_size: 500 },
      })).data.results,
  });

export const useCreateParty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Party>) => (await api.post('/masters/parties/', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parties'] }),
  });
};

export const useUpdateParty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Party> & { id: number }) =>
      (await api.patch(`/masters/parties/${id}/`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parties'] }),
  });
};

export const useDeleteParty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/masters/parties/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parties'] }),
  });
};

// ── Document number series ──────────────────────────────────────────────────
export type DocType =
  | 'invoice' | 'credit_note' | 'quotation' | 'sales_order'
  | 'purchase_order' | 'vendor_bill' | 'receipt' | 'vendor_payment';

export interface NumberSeries {
  id: number; company: number; doc_type: DocType; doc_type_display: string;
  prefix: string; padding: number; start_number: number; is_active: boolean;
  next_number: string;
}

export const useNumberSeries = (company?: number) =>
  useQuery({
    queryKey: ['number-series', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<NumberSeries>>('/masters/number-series/', {
        params: { company, page_size: 100 },
      })).data.results,
  });

export const useUpdateNumberSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<NumberSeries> & { id: number }) =>
      (await api.patch(`/masters/number-series/${id}/`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['number-series'] }),
  });
};

export const useSeedNumberSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (company: number) =>
      (await api.post('/masters/number-series/seed_defaults/', { company })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['number-series'] }),
  });
};

/** Suggest the next document number to prefill a create form (no side effects). */
export async function peekNumber(company: number, docType: DocType): Promise<string> {
  const r = await api.get<{ doc_type: string; number: string }>('/masters/number-series/peek/', {
    params: { company, doc_type: docType },
  });
  return r.data.number;
}

export const useItems = (company?: number) =>
  useQuery({
    queryKey: ['items', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<Item>>('/masters/items/', {
        params: { company, is_active: true, page_size: 500 },
      })).data.results,
  });

export const useCreateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Item>) => (await api.post('/masters/items/', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
};

export const useUpdateItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Item> & { id: number }) =>
      (await api.patch(`/masters/items/${id}/`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
};

export const useDeleteItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/masters/items/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
};
