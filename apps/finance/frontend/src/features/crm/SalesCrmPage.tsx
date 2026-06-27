import { useEffect, useState } from 'react';
import { CalendarClock, Kanban, Plus, UserPlus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useParties } from '@/features/masters/api';
import { formatINR } from '@/lib/money';
import {
  type LeadActivity,
  type SalesLead,
  useAddLeadActivity,
  useCreatePartyFromLead,
  useCreateSalesLead,
  useLeadActivities,
  useMoveSalesLead,
  useSalesLeadPipeline,
  useUpdateSalesLead,
} from './api';

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export default function SalesCrmPage() {
  const { companyId } = useActiveCompany();
  const { data, isLoading, refetch } = useSalesLeadPipeline(companyId ?? undefined);
  const { data: parties } = useParties(companyId ?? undefined, 'CUSTOMER');
  const createLead = useCreateSalesLead();
  const updateLead = useUpdateSalesLead();
  const moveLead = useMoveSalesLead();
  const createParty = useCreatePartyFromLead();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<SalesLead | null>(null);
  const [form, setForm] = useState({
    title: '',
    contact_name: '',
    organization: '',
    email: '',
    phone: '',
    expected_value: '',
    next_follow_up: '',
    source: '',
    notes: '',
    party: '' as string,
  });

  const { data: activities } = useLeadActivities(selected?.id);
  const addActivity = useAddLeadActivity();
  const [actForm, setActForm] = useState({ activity_type: 'note', summary: '', activity_at: '' });

  useEffect(() => {
    if (!selected) return;
    setActForm({
      activity_type: 'note',
      summary: '',
      activity_at: new Date().toISOString().slice(0, 16),
    });
  }, [selected]);

  const summary = data?.summary;

  const submitCreate = async () => {
    if (!companyId || !form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await createLead.mutateAsync({
        company: companyId,
        title: form.title.trim(),
        contact_name: form.contact_name,
        organization: form.organization,
        email: form.email,
        phone: form.phone,
        expected_value: form.expected_value || '0',
        next_follow_up: form.next_follow_up || null,
        source: form.source,
        notes: form.notes,
        party: form.party ? Number(form.party) : null,
      } as any);
      toast.success('Lead created');
      setCreateOpen(false);
      setForm({
        title: '', contact_name: '', organization: '', email: '', phone: '',
        expected_value: '', next_follow_up: '', source: '', notes: '', party: '',
      });
    } catch (e: any) {
      toast.error('Could not create lead', e?.response?.data?.detail ?? 'Failed');
    }
  };

  const saveFollowUp = async () => {
    if (!selected) return;
    try {
      await updateLead.mutateAsync({
        id: selected.id,
        next_follow_up: selected.next_follow_up,
        notes: selected.notes,
        expected_value: selected.expected_value,
        lost_reason: selected.lost_reason,
      });
      toast.success('Lead updated');
      refetch();
    } catch (e: any) {
      toast.error('Update failed', e?.response?.data?.detail ?? 'Failed');
    }
  };

  const submitActivity = async () => {
    if (!selected || !actForm.summary.trim()) return;
    try {
      await addActivity.mutateAsync({
        leadId: selected.id,
        activity_type: actForm.activity_type,
        summary: actForm.summary,
        activity_at: new Date(actForm.activity_at).toISOString(),
      });
      toast.success('Activity logged');
      setActForm((f) => ({ ...f, summary: '' }));
    } catch {
      toast.error('Could not log activity');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales CRM"
        subtitle="Lead pipeline and follow-ups for company owners — linked to Customers & Vendors."
        action={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-1" /> New lead
          </button>
        }
      />
      <PageHint storageKey="sales-crm">
        Track prospects from first contact to won/lost. Link an existing customer from Parties, or create a customer record when the deal matures.
        Drag cards between columns to update stage.
      </PageHint>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Open leads" value={String(summary.open_count)} />
          <Stat label="Pipeline value" value={formatINR(summary.pipeline_value)} />
          <Stat label="Follow-up today" value={String(summary.due_today)} icon={CalendarClock} />
          <Stat label="Overdue" value={String(summary.overdue)} warn={summary.overdue > 0} />
          <Stat label="Won / Lost" value={`${summary.won_count} / ${summary.lost_count}`} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading pipeline…</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {data?.stages.map((stage) => (
            <div
              key={stage.key}
              className="min-w-[260px] w-[260px] flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3 min-h-[420px]"
              data-stage={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const id = Number(e.dataTransfer.getData('text/lead-id'));
                if (!id) return;
                try {
                  await moveLead.mutateAsync({ id, stage: stage.key });
                } catch {
                  toast.error('Could not move lead');
                  refetch();
                }
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {STAGE_LABELS[stage.key] ?? stage.key}
                </span>
                <span className="badge badge-sm">{stage.count}</span>
              </div>
              <div className="space-y-2">
                {stage.leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onOpen={() => setSelected(lead)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New sales lead" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Field label="Deal title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Organization" value={form.organization} onChange={(v) => setForm({ ...form, organization: v })} />
          <Field label="Contact name" value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Expected value" value={form.expected_value} onChange={(v) => setForm({ ...form, expected_value: v })} />
          <Field label="Next follow-up" type="date" value={form.next_follow_up} onChange={(v) => setForm({ ...form, next_follow_up: v })} />
          <Field label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
          <label className="md:col-span-2">
            <span className="label-text text-xs">Link existing customer (optional)</span>
            <select className="select select-bordered select-sm w-full mt-1" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })}>
              <option value="">— New prospect —</option>
              {(parties ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="label-text text-xs">Notes</span>
            <textarea className="textarea textarea-bordered w-full mt-1 text-sm" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn-ghost btn-sm" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn-primary btn-sm" onClick={submitCreate} disabled={createLead.isPending}>Create</button>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-500">
              {selected.display_name} · {selected.stage_display}
              {selected.party_name ? ` · Customer: ${selected.party_name}` : ''}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-xs text-slate-500">Expected value</span>
                <input className="input input-bordered input-sm w-full mt-1" value={selected.expected_value}
                  onChange={(e) => setSelected({ ...selected, expected_value: e.target.value })} />
              </label>
              <label>
                <span className="text-xs text-slate-500">Next follow-up</span>
                <input type="date" className="input input-bordered input-sm w-full mt-1"
                  value={selected.next_follow_up ?? ''}
                  onChange={(e) => setSelected({ ...selected, next_follow_up: e.target.value || null })} />
              </label>
              <label className="col-span-2">
                <span className="text-xs text-slate-500">Notes</span>
                <textarea className="textarea textarea-bordered w-full mt-1 text-sm" rows={2}
                  value={selected.notes}
                  onChange={(e) => setSelected({ ...selected, notes: e.target.value })} />
              </label>
              {selected.stage === 'lost' && (
                <label className="col-span-2">
                  <span className="text-xs text-slate-500">Lost reason</span>
                  <input className="input input-bordered input-sm w-full mt-1" value={selected.lost_reason}
                    onChange={(e) => setSelected({ ...selected, lost_reason: e.target.value })} />
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline btn-sm" onClick={saveFollowUp} disabled={updateLead.isPending}>Save</button>
              {!selected.party && (
                <button className="btn-outline btn-sm inline-flex items-center gap-1"
                  onClick={async () => {
                    try {
                      const r = await createParty.mutateAsync(selected.id);
                      setSelected(r.lead);
                      toast.success(`Customer ${r.party_name} created`);
                    } catch (e: any) {
                      toast.error('Failed', e?.response?.data?.detail ?? 'Could not create customer');
                    }
                  }}
                  disabled={createParty.isPending}>
                  <UserPlus size={14} /> Create customer in Parties
                </button>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-semibold mb-2">Follow-up log</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <select className="select select-bordered select-sm" value={actForm.activity_type}
                  onChange={(e) => setActForm({ ...actForm, activity_type: e.target.value })}>
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
                <input type="datetime-local" className="input input-bordered input-sm"
                  value={actForm.activity_at}
                  onChange={(e) => setActForm({ ...actForm, activity_at: e.target.value })} />
                <button className="btn-primary btn-sm" onClick={submitActivity} disabled={addActivity.isPending}>Log activity</button>
              </div>
              <textarea className="textarea textarea-bordered w-full text-sm mb-3" rows={2} placeholder="What happened?"
                value={actForm.summary}
                onChange={(e) => setActForm({ ...actForm, summary: e.target.value })} />
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {(activities ?? []).map((a: LeadActivity) => (
                  <li key={a.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <div className="font-semibold">{a.activity_type_display} · {new Date(a.activity_at).toLocaleString()}</div>
                    <div className="text-slate-600 whitespace-pre-wrap">{a.summary}</div>
                  </li>
                ))}
                {!(activities ?? []).length && <li className="text-slate-400 text-xs">No activities yet.</li>}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, icon: Icon, warn }: { label: string; value: string; icon?: typeof Kanban; warn?: boolean }) {
  return (
    <div className={`card p-3 ${warn ? 'border-amber-300 bg-amber-50/50' : ''}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="text-lg font-bold text-slate-800 mt-1">{value}</div>
    </div>
  );
}

function LeadCard({ lead, onOpen }: { lead: SalesLead; onOpen: () => void }) {
  const overdue = lead.next_follow_up && lead.next_follow_up < new Date().toISOString().slice(0, 10);
  return (
    <div
      className="card-sm border border-slate-200 bg-white p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/lead-id', String(lead.id))}
      onClick={onOpen}
    >
      <div className="font-semibold text-sm leading-snug">{lead.title}</div>
      <div className="text-xs text-slate-500 mt-1">{lead.organization || lead.contact_name || '—'}</div>
      <div className="text-xs font-medium text-brand-600 mt-2">{formatINR(lead.expected_value)}</div>
      {lead.next_follow_up && (
        <div className={`text-[10px] mt-1 ${overdue ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
          Follow-up: {lead.next_follow_up}
        </div>
      )}
      {lead.party_name && <div className="text-[10px] text-emerald-600 mt-1">{lead.party_name}</div>}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label>
      <span className="label-text text-xs">{label}</span>
      <input type={type} className="input input-bordered input-sm w-full mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
