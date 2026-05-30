import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Company {
  id: number; name: string; legal_name?: string;
  gstin: string; pan?: string;
  state_code: string; base_currency: string;
  books_closed_until?: string | null;
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

export const useFiscalYears = (company?: number) =>
  useQuery({
    queryKey: ['fiscal-years', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<FiscalYear>>('/masters/fiscal-years/', { params: { company, is_active: true } })).data.results,
  });

export const usePostableAccounts = (company?: number) =>
  useQuery({
    queryKey: ['accounts', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<Account>>('/masters/accounts/', {
        params: { company, is_postable: true, is_active: true, page_size: 500 },
      })).data.results,
  });

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
