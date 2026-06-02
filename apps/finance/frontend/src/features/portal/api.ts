import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export interface PortalAccess {
  id: number;
  party: number;
  party_name: string;
  token: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at?: string;
}

interface Paginated<T> { results: T[]; count: number; }

// ── Admin side (authenticated) ──────────────────────────────────────────────
export const usePortalAccess = () =>
  useQuery({
    queryKey: ['portal-access'],
    queryFn: async () => (await api.get<Paginated<PortalAccess>>('/portal/access/')).data.results,
  });

export const useGrantPortalAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (party: number) =>
      (await api.post<PortalAccess>('/portal/access/', { party, is_active: true })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-access'] }),
  });
};

export const useTogglePortalAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) =>
      (await api.patch<PortalAccess>(`/portal/access/${id}/`, { is_active })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-access'] }),
  });
};

export const useRevokePortalAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/portal/access/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-access'] }),
  });
};

// Build the shareable customer link for a token (works per-environment).
export const portalLink = (token: string) =>
  `${window.location.origin}/#/portal?token=${encodeURIComponent(token)}`;

// ── Public side (no auth — token in the URL) ────────────────────────────────
export interface PortalInvoice {
  id: number;
  invoice_no: string;
  date: string;
  due_date: string | null;
  grand_total: string;
  balance_due: string;
  is_paid: boolean;
}
export interface PortalInvoicesResponse {
  party: { id: number; name: string };
  invoices: PortalInvoice[];
}

/** Public fetch — a bare axios call so the JWT/refresh interceptor never runs. */
export async function fetchPortalInvoices(token: string): Promise<PortalInvoicesResponse> {
  const r = await axios.get<PortalInvoicesResponse>(`${baseURL}/portal/invoices/`, { params: { token } });
  return r.data;
}
