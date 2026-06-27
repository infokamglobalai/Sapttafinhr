import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SalesLead {
  id: number;
  company: number;
  party: number | null;
  party_name: string;
  title: string;
  contact_name: string;
  organization: string;
  email: string;
  phone: string;
  stage: string;
  stage_display: string;
  expected_value: string;
  next_follow_up: string | null;
  source: string;
  notes: string;
  lost_reason: string;
  display_name: string;
  activity_count: number;
}

export interface LeadActivity {
  id: number;
  activity_type: string;
  activity_type_display: string;
  summary: string;
  activity_at: string;
  created_by_email: string;
}

export interface PipelineStage {
  key: string;
  count: number;
  leads: SalesLead[];
}

export interface CrmSummary {
  open_count: number;
  pipeline_value: string;
  won_count: number;
  lost_count: number;
  due_today: number;
  overdue: number;
}

export const useSalesLeadPipeline = (company?: number) =>
  useQuery({
    queryKey: ['sales-leads-pipeline', company],
    enabled: company != null,
    queryFn: async () => {
      const r = await api.get<{ stages: PipelineStage[]; summary: CrmSummary }>(
        '/masters/sales-leads/pipeline/',
        { params: { company } },
      );
      return r.data;
    },
  });

export function useCreateSalesLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<SalesLead> & { company: number }) =>
      (await api.post('/masters/sales-leads/', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-leads-pipeline'] });
      qc.invalidateQueries({ queryKey: ['sales-leads'] });
    },
  });
}

export function useUpdateSalesLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SalesLead> & { id: number }) =>
      (await api.patch(`/masters/sales-leads/${id}/`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-leads-pipeline'] });
    },
  });
}

export function useMoveSalesLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) =>
      (await api.post(`/masters/sales-leads/${id}/move-api/`, { stage })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-leads-pipeline'] }),
  });
}

export function useCreatePartyFromLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`/masters/sales-leads/${id}/create-party/`, {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-leads-pipeline'] });
      qc.invalidateQueries({ queryKey: ['parties'] });
    },
  });
}

export function useLeadActivities(leadId?: number) {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    enabled: leadId != null,
    queryFn: async () =>
      (await api.get<LeadActivity[]>(`/masters/sales-leads/${leadId}/activities/`)).data,
  });
}

export function useAddLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      ...data
    }: { leadId: number; activity_type: string; summary: string; activity_at: string }) =>
      (await api.post(`/masters/sales-leads/${leadId}/activities/`, data)).data,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lead-activities', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['sales-leads-pipeline'] });
    },
  });
}
