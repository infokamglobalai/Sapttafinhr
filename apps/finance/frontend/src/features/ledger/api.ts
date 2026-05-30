import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TrialBalanceRow {
  account_id: number;
  code: string;
  name: string;
  type: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface TrialBalanceResponse {
  as_of: string | null;
  rows: TrialBalanceRow[];
  totals: { debit: string; credit: string };
}

export const useTrialBalance = (company?: number, asOf?: string) =>
  useQuery({
    queryKey: ['trial-balance', company, asOf],
    enabled: company != null,
    queryFn: async () =>
      (await api.get<TrialBalanceResponse>('/ledger/trial-balance/', {
        params: { company, as_of: asOf },
      })).data,
  });

export interface ManualLineInput {
  account: number;
  debit: string;
  credit: string;
  description?: string;
}

export interface ManualJEInput {
  company: number;
  fiscal_year: number;
  voucher_no: string;
  date: string;
  narration?: string;
  lines: ManualLineInput[];
}

export function useCreateManualJE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ManualJEInput) =>
      (await api.post('/ledger/manual/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trial-balance'] });
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });
}

export const useJournalEntries = (company?: number) =>
  useQuery({
    queryKey: ['journal-entries', company],
    enabled: company != null,
    queryFn: async () =>
      (await api.get('/ledger/entries/', { params: { company, ordering: '-date' } })).data.results,
  });
