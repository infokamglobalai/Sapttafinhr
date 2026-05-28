import { useMemo, useState } from 'react';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import FilterBar from '@/components/FilterBar';
import { confirm } from '@/components/ConfirmDialog';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useDeleteItem, useItems, type Item } from './api';
import { formatINR } from '@/lib/money';
import ItemFormModal from './ItemFormModal';
import RecordDetailModal, { f } from '@/components/RecordDetailModal';

export default function ItemsPage() {
  const { companyId } = useActiveCompany();
  const { data: items, isLoading } = useItems(companyId);
  const del = useDeleteItem();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | 'GOODS' | 'SERVICE'>('');

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((i) =>
      (kindFilter === '' || i.kind === kindFilter) &&
      (q === '' || `${i.sku} ${i.name} ${i.hsn_code}`.toLowerCase().includes(q))
    );
  }, [items, search, kindFilter]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (i: Item) => { setEditing(i); setModalOpen(true); };
  const askDelete = (i: Item) => {
    confirm({
      title: `Delete ${i.name}?`,
      message: 'Existing invoices / bills referencing it will block the delete.',
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try { await del.mutateAsync(i.id); toast.success(`Deleted ${i.name}`); }
        catch (e: any) { toast.error('Could not delete', JSON.stringify(e?.response?.data ?? 'Failed')); }
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        subtitle="Products and services you sell or buy."
        action={<button className="btn-primary" onClick={openNew}><Plus size={16} className="mr-1" /> New Item</button>}
      />

      <FilterBar
        search={search} onSearchChange={setSearch}
        filters={[
          { label: 'Kind', value: kindFilter, onChange: (v) => setKindFilter(v as any),
            options: [{ value: '', label: 'All' }, { value: 'GOODS', label: 'Goods' }, { value: 'SERVICE', label: 'Service' }] },
        ]}
        searchPlaceholder="Search SKU, name, HSN…"
        count={filtered.length}
      />

      <div className="card overflow-hidden p-0">
        {!isLoading && filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={items && items.length > 0 ? 'No matches' : 'No items yet'}
            description={items && items.length > 0 ? 'Try clearing filters.' : 'Add the products or services you sell. You can pick them on invoices and POs.'}
            actionLabel={items && items.length > 0 ? undefined : 'Add your first item'}
            onAction={items && items.length > 0 ? undefined : openNew}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">HSN</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Sale</th>
                <th className="px-4 py-3 text-right">Buy</th>
                <th className="px-4 py-3 text-right">GST %</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
              {filtered.map((i) => (
                <tr key={i.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setViewing(i)}>
                  <td className="px-4 py-2 font-mono text-xs">{i.sku}</td>
                  <td className="px-4 py-2 font-medium">{i.name}</td>
                  <td className="px-4 py-2 text-xs">{i.kind}</td>
                  <td className="px-4 py-2 font-mono text-xs">{i.hsn_code || '—'}</td>
                  <td className="px-4 py-2">{i.unit}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(i.sale_price)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(i.purchase_price)}</td>
                  <td className="px-4 py-2 text-right">{i.effective_tax_rate}%</td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost p-1 text-slate-500 hover:text-brand-600" title="Edit" onClick={() => openEdit(i)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-ghost p-1 text-slate-500 hover:text-red-600" title="Delete" onClick={() => askDelete(i)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ItemFormModal open={modalOpen} onClose={() => setModalOpen(false)} companyId={companyId} initial={editing} />

      <RecordDetailModal
        open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.name ?? ''} subtitle={viewing ? `${viewing.kind} · ${viewing.sku}` : ''}
        actions={viewing && (
          <>
            <button className="btn-primary" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit</button>
            <button className="btn-ghost border border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => { askDelete(viewing); setViewing(null); }}>Delete</button>
          </>
        )}
        sections={viewing ? [
          {
            title: 'Item',
            fields: [
              f('SKU', viewing.sku, { mono: true }),
              f('Name', viewing.name),
              f('Kind', viewing.kind),
              f('Unit', viewing.unit),
              f('HSN/SAC', viewing.hsn_code, { mono: true }),
              f('Active', viewing.is_active ? 'Yes' : 'No'),
              f('Description', viewing.description, { fullWidth: true }),
            ],
          },
          {
            title: 'Pricing',
            fields: [
              f('Sale Price', formatINR(viewing.sale_price)),
              f('Purchase Price', formatINR(viewing.purchase_price)),
              f('GST Rate (custom)', `${viewing.tax_rate}%`),
              f('Effective GST Rate', `${viewing.effective_tax_rate}%`),
            ],
          },
        ] : []}
      />
    </div>
  );
}
