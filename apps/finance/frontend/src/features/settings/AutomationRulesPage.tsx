import { useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import SimpleTable from '@/components/SimpleTable';
import Modal from '@/components/Modal';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';
import { toast } from '@/components/Toaster';

interface Rule {
  id: number;
  name: string;
  is_active: boolean;
  trigger: string;
  action: string;
  run_count: number;
  last_run_at: string | null;
  last_log: { status: string; at: string } | null;
}

interface EnumOpt { value: string; label: string; }

export default function AutomationRulesPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['automation-rules', companyId],
    enabled: companyId != null,
    queryFn: async () => (await api.get('/ai/automation/rules/', { params: { company: companyId } })).data.results as Rule[],
  });
  const { data: triggers } = useQuery({
    queryKey: ['automation-triggers'],
    queryFn: async () => (await api.get('/ai/automation/rules/triggers/')).data as EnumOpt[],
  });
  const { data: actions } = useQuery({
    queryKey: ['automation-actions'],
    queryFn: async () => (await api.get('/ai/automation/rules/actions/')).data as EnumOpt[],
  });

  const create = useMutation({
    mutationFn: async (payload: unknown) => (await api.post('/ai/automation/rules/', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] });
      setOpen(false);
      toast('Automation rule created');
    },
  });

  const testRun = useMutation({
    mutationFn: async (id: number) => (await api.post(`/ai/automation/rules/${id}/test_run/`)).data,
    onSuccess: (r) => toast(`Test run: ${r.items_matched} item(s) matched`),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', trigger: 'invoice_overdue', action: 'send_email',
    action_config: '{"to":"billing@company.com"}',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Rules"
        subtitle="Trigger emails, notifications, or webhooks on business events."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1" /> New rule
          </button>
        }
      />
      <SimpleTable<Rule>
        rows={data}
        loading={isLoading}
        emptyIcon={Zap}
        emptyTitle="No automation rules"
        emptyDescription="Create rules to send overdue reminders, low-stock alerts, or monthly reports."
        emptyActionLabel="Create rule"
        onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'trigger', label: 'When' },
          { key: 'action', label: 'Then' },
          { key: 'is_active', label: 'Active', render: (r) => r.is_active ? 'Yes' : 'No' },
          { key: 'run_count', label: 'Runs', align: 'right' },
          {
            key: 'test', label: '', render: (r) => (
              <button className="btn-ghost text-xs" onClick={(e) => { e.stopPropagation(); testRun.mutate(r.id); }}>
                Test
              </button>
            ),
          },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New automation rule">
        <div className="space-y-3">
          <input className="input w-full" placeholder="Rule name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input w-full" value={form.trigger}
            onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
            {(triggers ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="input w-full" value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}>
            {(actions ?? []).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <textarea className="input w-full font-mono text-xs" rows={3} value={form.action_config}
            onChange={(e) => setForm({ ...form, action_config: e.target.value })} />
          <button className="btn-primary w-full" disabled={!companyId || create.isPending}
            onClick={() => {
              let cfg = {};
              try { cfg = JSON.parse(form.action_config); } catch { toast('Invalid JSON in action config'); return; }
              create.mutate({
                company: companyId,
                name: form.name,
                trigger: form.trigger,
                action: form.action,
                action_config: cfg,
                is_active: true,
              });
            }}>
            Save rule
          </button>
        </div>
      </Modal>
    </div>
  );
}
