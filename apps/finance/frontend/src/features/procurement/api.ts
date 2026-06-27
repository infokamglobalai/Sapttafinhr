import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PO { id: number; po_no: string; date: string; vendor: number; vendor_name: string; status: string; grand_total: string; lines: any[]; }
export interface GRN { id: number; grn_no: string; date: string; po_no: string; vendor_name: string; status: string; lines: any[]; }
export interface VendorBill {
  id: number; bill_no: string; date: string; vendor: number; vendor_name: string;
  currency: string; fx_rate: string;
  taxable_amount: string; cgst: string; sgst: string; igst: string; tds_amount: string;
  grand_total: string; amount_paid: string; balance_due: string; status: string;
  journal_entry: number | null; lines: any[];
}
export interface VendorPaymentAllocation { id: number; bill: number; bill_no: string; amount: string; }
export interface VendorPayment {
  id: number; payment_no: string; date: string; vendor_name: string; mode: string;
  reference: string; amount: string; currency: string; fx_rate: string; status: string; notes?: string;
  paid_from_account?: number; paid_from_code?: string;
  allocations?: VendorPaymentAllocation[];
}

interface Paged<T> { results: T[]; count: number }

export const usePOs = (company?: number) => useQuery({
  queryKey: ['pos', company], enabled: company != null,
  queryFn: async () => (await api.get<Paged<PO>>('/procurement/purchase-orders/', { params: { company, page_size: 200 } })).data.results,
});
export const useGRNs = (company?: number) => useQuery({
  queryKey: ['grns', company], enabled: company != null,
  queryFn: async () => (await api.get<Paged<GRN>>('/procurement/grns/', { params: { company, page_size: 200 } })).data.results,
});
export const useVendorBills = (company?: number) => useQuery({
  queryKey: ['vbills', company], enabled: company != null,
  queryFn: async () => (await api.get<Paged<VendorBill>>('/procurement/vendor-bills/', { params: { company, page_size: 200 } })).data.results,
});
export const useVendorPayments = (company?: number) => useQuery({
  queryKey: ['vpayments', company], enabled: company != null,
  queryFn: async () => (await api.get<Paged<VendorPayment>>('/procurement/vendor-payments/', { params: { company, page_size: 200 } })).data.results,
});

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => (await api.post('/procurement/purchase-orders/create/', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos'] }),
  });
}

export function useCreateGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => (await api.post('/procurement/grns/create/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grns'] });
      qc.invalidateQueries({ queryKey: ['pos'] });
    },
  });
}

export function useCreateVendorBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => (await api.post('/procurement/vendor-bills/create/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vbills'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
