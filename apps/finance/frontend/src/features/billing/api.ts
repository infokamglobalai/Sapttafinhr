import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface InvoiceLine {
  id: number; item: number | null; description: string; hsn_code: string;
  quantity: string; unit_price: string; discount_percent: string; tax_rate: string;
  taxable_amount: string; cgst: string; sgst: string; igst: string; line_total: string;
}

export interface Invoice {
  id: number; company: number; fiscal_year: number; invoice_no: string;
  date: string; due_date: string | null; customer: number; customer_name: string;
  place_of_supply: string; notes: string; status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  taxable_amount: string; cgst: string; sgst: string; igst: string; grand_total: string;
  amount_paid: string; balance_due: string; is_paid: boolean;
  journal_entry: number | null; lines: InvoiceLine[];
}

interface Paginated<T> { results: T[]; count: number; }

export const useInvoices = (company?: number) =>
  useQuery({
    queryKey: ['invoices', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<Invoice>>('/billing/invoices/', { params: { company, page_size: 200 } })).data.results,
  });

export const useInvoice = (id?: number) =>
  useQuery({
    queryKey: ['invoice', id],
    enabled: id != null,
    queryFn: async () => (await api.get<Invoice>(`/billing/invoices/${id}/`)).data,
  });

export const useOpenInvoicesForCustomer = (company?: number, customer?: number) =>
  useQuery({
    queryKey: ['open-invoices', company, customer],
    enabled: company != null && customer != null,
    queryFn: async () => {
      const r = await api.get<Paginated<Invoice>>('/billing/invoices/', {
        params: { company, customer, status: 'POSTED', page_size: 200 },
      });
      return r.data.results.filter((i) => Number(i.balance_due) > 0);
    },
  });

export interface InvoiceLineInput {
  item: number | null;
  description: string;
  hsn_code: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string;
}

export interface InvoiceCreateInput {
  company: number;
  fiscal_year: number;
  invoice_no: string;
  date: string;
  due_date?: string | null;
  customer: number;
  place_of_supply: string;
  currency?: string;
  fx_rate?: string | number;
  notes?: string;
  lines: InvoiceLineInput[];
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InvoiceCreateInput) =>
      (await api.post<Invoice>('/billing/invoices/create/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['pnl'] });
    },
  });
}

export function useGenerateEInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: number) =>
      (await api.post(`/taxation/einvoice/${invoiceId}/`, {})).data,
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['invoice', id] }),
  });
}

export function useGenerateEWayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { invoiceId: number; distance_km: number; vehicle_no?: string; transporter_name?: string }) =>
      (await api.post(`/taxation/eway/${payload.invoiceId}/`, {
        distance_km: payload.distance_km,
        vehicle_no: payload.vehicle_no ?? '',
        transporter_name: payload.transporter_name ?? '',
      })).data,
    onSuccess: (_, p) => qc.invalidateQueries({ queryKey: ['invoice', p.invoiceId] }),
  });
}

export function useCreatePaymentLink() {
  return useMutation({
    mutationFn: async (payload: { invoice_id: number; amount: string; description?: string }) =>
      (await api.post('/banking/payment-link/', payload)).data,
  });
}

export interface CreditNote {
  id: number; company: number; fiscal_year: number; note_no: string;
  date: string; invoice: number; invoice_no: string; customer_name: string;
  reason: string; status: 'DRAFT' | 'POSTED';
  taxable_amount: string; cgst: string; sgst: string; igst: string; grand_total: string;
  journal_entry: number | null;
}

export const useCreditNotes = (company?: number) =>
  useQuery({
    queryKey: ['credit-notes', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<Paginated<CreditNote>>('/billing/credit-notes/', { params: { company } })).data.results,
  });

export function useCreateCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company: number; fiscal_year: number; note_no: string; date: string;
      invoice: number; taxable_amount: string; reason?: string;
    }) => (await api.post('/billing/credit-notes/create/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-notes'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
