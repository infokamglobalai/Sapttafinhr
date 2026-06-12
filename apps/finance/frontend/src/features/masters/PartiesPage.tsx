import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import FilterBar from '@/components/FilterBar';
import { confirm } from '@/components/ConfirmDialog';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useDeleteParty, useParties, type Party } from './api';
import PartyFormModal from './PartyFormModal';
import { formatINR } from '@/lib/money';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

export default function PartiesPage() {
  const { companyId } = useActiveCompany();
  const { data: parties, isLoading } = useParties(companyId);
  const del = useDeleteParty();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [viewing, setViewing] = useState<Party | null>(null);

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | 'CUSTOMER' | 'VENDOR' | 'BOTH'>('');

  const filtered = useMemo(() => {
    if (!parties) return [];
    const q = search.trim().toLowerCase();
    return parties.filter((p) =>
      (kindFilter === '' || p.kind === kindFilter) &&
      (q === '' || `${p.name} ${p.email} ${p.gstin} ${p.phone}`.toLowerCase().includes(q))
    );
  }, [parties, search, kindFilter]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: Party) => { setEditing(p); setModalOpen(true); };
  const askDelete = (p: Party) => {
    confirm({
      title: `Delete ${p.name}?`,
      message: 'Existing invoices or bills referencing them will block the delete.',
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try { await del.mutateAsync(p.id); toast.success(`Deleted ${p.name}`); }
        catch (e: any) { toast.error('Could not delete', JSON.stringify(e?.response?.data ?? 'Failed')); }
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers & Vendors"
        subtitle="People you sell to and buy from."
        action={<button className="btn-primary" onClick={openNew}><Plus size={16} className="mr-1" /> New Customer / Vendor</button>}
      />

      <FilterBar
        search={search} onSearchChange={setSearch}
        filters={[
          { label: 'Type', value: kindFilter, onChange: (v) => setKindFilter(v as any),
            options: [{ value: '', label: 'All types' }, { value: 'CUSTOMER', label: 'Customers' },
                       { value: 'VENDOR', label: 'Vendors' }, { value: 'BOTH', label: 'Both' }] },
        ]}
        searchPlaceholder="Search name, GSTIN, email, phone…"
        count={filtered.length}
      />

      <div className="card overflow-hidden p-0">
        {!isLoading && filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={parties && parties.length > 0 ? 'No matches' : 'No customers or vendors yet'}
            description={parties && parties.length > 0 ? 'Try clearing filters.' : 'Add a customer or vendor to start invoicing or recording bills.'}
            actionLabel={parties && parties.length > 0 ? undefined : 'Add your first one'}
            onAction={parties && parties.length > 0 ? undefined : openNew}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Legal Name</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">PAN</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Billing Address</th>
                  <th className="px-4 py-3 text-right">Credit Limit</th>
                  <th className="px-4 py-3">Beneficiary</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">A/C No.</th>
                  <th className="px-4 py-3">IFSC</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">UPI</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="sticky right-0 z-10 bg-slate-50 px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading && <tr><td colSpan={18} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
                {filtered.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(p)}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className={`rounded px-2 py-0.5 ${p.kind === 'CUSTOMER' ? 'bg-emerald-100 text-emerald-700' : p.kind === 'VENDOR' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>
                        {p.kind}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">{p.legal_name || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{p.gstin || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{p.pan || '—'}</td>
                    <td className="px-4 py-2">{p.state_code || '—'}</td>
                    <td className="px-4 py-2 text-xs">{p.email || '—'}</td>
                    <td className="px-4 py-2 text-xs">{p.phone || '—'}</td>
                    <td className="max-w-[260px] truncate px-4 py-2 text-xs text-slate-600" title={p.billing_address}>
                      {p.billing_address || '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{Number(p.credit_limit) ? formatINR(p.credit_limit) : '—'}</td>
                    <td className="px-4 py-2 text-xs">{p.bank_account_name || '—'}</td>
                    <td className="px-4 py-2 text-xs">{p.bank_name || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {p.bank_account_number || (
                        <span className={(p.kind === 'VENDOR' || p.kind === 'BOTH') ? 'text-amber-600' : 'text-slate-400'}>
                          {(p.kind === 'VENDOR' || p.kind === 'BOTH') ? 'missing' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{p.bank_ifsc || '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{p.bank_branch || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{p.upi_id || '—'}</td>
                    <td className="px-4 py-2 text-xs">
                      {p.is_active ? <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">Yes</span>
                        : <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500">No</span>}
                    </td>
                    <td className="sticky right-0 z-10 bg-white px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost p-1 text-slate-500 hover:text-brand-600" title="Edit" onClick={() => openEdit(p)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn-ghost p-1 text-slate-500 hover:text-red-600" title="Delete" onClick={() => askDelete(p)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PartyFormModal open={modalOpen} onClose={() => setModalOpen(false)} companyId={companyId} initial={editing} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''} subtitle={viewing?.kind}
        actions={viewing && (
          <>
            <button className="btn-primary" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit</button>
            <button className="btn-ghost border border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => { askDelete(viewing); setViewing(null); }}>Delete</button>
          </>
        )}
        sections={viewing ? [
          {
            title: 'Identity',
            fields: [
              f('Name', viewing.name),
              f('Type', viewing.kind),
              f('Legal Name', viewing.legal_name),
              f('Active', viewing.is_active ? 'Yes' : 'No'),
              f('GSTIN', viewing.gstin, { mono: true }),
              f('PAN', viewing.pan, { mono: true }),
              f('State Code', viewing.state_code),
              f('Credit Limit', Number(viewing.credit_limit) ? formatINR(viewing.credit_limit) : null),
            ],
          },
          {
            title: 'Contact',
            fields: [
              f('Email', viewing.email),
              f('Phone', viewing.phone),
              f('Billing Address', viewing.billing_address, { fullWidth: true }),
            ],
          },
          {
            title: 'Bank Details',
            fields: [
              f('Beneficiary', viewing.bank_account_name),
              f('Bank', viewing.bank_name),
              f('A/C Number', viewing.bank_account_number, { mono: true }),
              f('IFSC', viewing.bank_ifsc, { mono: true }),
              f('Branch', viewing.bank_branch),
              f('UPI ID', viewing.upi_id, { mono: true }),
            ],
          },
        ] : []}
      />
    </div>
  );
}
