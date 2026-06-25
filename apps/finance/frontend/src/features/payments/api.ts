import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ReceiptAllocation {
  id: number; invoice: number; invoice_no: string; amount: string;
}

export interface Receipt {
  id: number; company: number; fiscal_year: number; receipt_no: string;
  date: string; customer: number; customer_name: string;
  mode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE';
  reference: string; amount: string; currency: string; fx_rate: string; notes: string;
  status: 'DRAFT' | 'POSTED';
  deposit_account: number; deposit_account_code: string;
  journal_entry: number | null;
  allocations: ReceiptAllocation[];
}

interface Paginated<T> { results: T[]; count: number; }

export const useReceipts = (company?: number) =>
  useQuery({
    queryKey: ['receipts', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<Receipt>>('/payments/receipts/', { params: { company, page_size: 200 } })).data.results,
  });

export interface ReceiptCreateInput {
  company: number; fiscal_year: number; receipt_no: string; date: string;
  customer: number; mode: Receipt['mode']; reference?: string;
  amount: string; currency?: string; fx_rate?: string; notes?: string; deposit_account: number;
  allocations: { invoice: number; amount: string }[];
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReceiptCreateInput) =>
      (await api.post<Receipt>('/payments/receipts/create/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['open-invoices'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['ar-aging'] });
    },
  });
}
