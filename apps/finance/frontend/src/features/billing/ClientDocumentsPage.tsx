import { useEffect, useMemo, useState } from 'react';
import { Download, ScrollText } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PageHint from '@/components/PageHint';
import SimpleTable from '@/components/SimpleTable';
import FilterBar from '@/components/FilterBar';
import Modal from '@/components/Modal';
import { toast } from '@/components/Toaster';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { api } from '@/lib/api';

export interface ClientDoc {
  id: number;
  doc_no: string;
  title: string;
  doc_type: string;
  doc_type_display: string;
  customer_name: string;
  quotation_no: string;
  status: string;
  body_html: string;
  created_at: string;
}

export default function ClientDocumentsPage() {
  const { companyId } = useActiveCompany();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['client-documents', companyId],
    enabled: companyId != null,
    queryFn: async () =>
      (await api.get('/billing/client-documents/', { params: { company: companyId, page_size: 200 } }))
        .data.results as ClientDoc[],
  });

  const seedTemplates = useMutation({
    mutationFn: async () =>
      (await api.post('/billing/client-document-templates/seed/', { company: companyId })).data,
    onSuccess: (r: { created: number; skipped: number }) => {
      toast.success(`Templates ready (${r.created} created, ${r.skipped} existing)`);
    },
    onError: (e: any) => toast.error('Seed failed', e?.response?.data?.detail ?? 'Failed'),
  });

  const [viewing, setViewing] = useState<ClientDoc | null>(null);
  const [bodyDraft, setBodyDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (viewing) setBodyDraft(viewing.body_html || '');
  }, [viewing]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((r) =>
      (statusFilter === '' || r.status === statusFilter) &&
      (q === '' || `${r.doc_no} ${r.title} ${r.customer_name}`.toLowerCase().includes(q))
    );
  }, [data, search, statusFilter]);

  const saveBody = useMutation({
    mutationFn: async ({ id, body_html }: { id: number; body_html: string }) =>
      (await api.post(`/billing/client-documents/${id}/body/`, { body_html })).data,
    onSuccess: (doc: ClientDoc) => {
      toast.success('Draft saved');
      setViewing(doc);
      qc.invalidateQueries({ queryKey: ['client-documents'] });
    },
    onError: (e: any) => toast.error('Save failed', e?.response?.data?.detail ?? 'Failed'),
  });

  const finalize = useMutation({
    mutationFn: async (id: number) => (await api.post(`/billing/client-documents/${id}/finalize/`, {})).data,
    onSuccess: (doc: ClientDoc) => {
      toast.success('Document finalized');
      setViewing(doc);
      qc.invalidateQueries({ queryKey: ['client-documents'] });
    },
    onError: (e: any) => toast.error('Finalize failed', e?.response?.data?.detail ?? 'Failed'),
  });

  const downloadPdf = async (doc: ClientDoc) => {
    try {
      const resp = await api.get(`/billing/client-documents/${doc.id}/pdf/`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.doc_no}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF download failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Contracts"
        subtitle="SOW, MSA, and NDA documents with client merge fields — linked to quotations."
        action={
          <button className="btn-outline btn-sm" onClick={() => seedTemplates.mutate()} disabled={!companyId || seedTemplates.isPending}>
            Seed templates
          </button>
        }
      />
      <PageHint storageKey="client-documents">
        Generate a Statement of Work from any quotation, edit the HTML draft, finalize, and download a branded PDF.
        Run <strong>Seed templates</strong> once per company for default SOW, MSA, and NDA layouts.
      </PageHint>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search doc #, title, customer…"
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'All' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'FINAL', label: 'Final' },
            ],
          },
        ]}
        count={filtered.length}
      />
      <SimpleTable<ClientDoc>
        rows={filtered}
        loading={isLoading}
        onRowClick={setViewing}
        emptyIcon={ScrollText}
        emptyTitle="No client documents yet"
        emptyDescription="Open a quotation and click Generate SOW to create your first contract draft."
        columns={[
          { key: 'doc_no', label: 'Doc #', render: (r) => <span className="font-medium text-brand-600">{r.doc_no}</span> },
          { key: 'doc_type_display', label: 'Type' },
          { key: 'title', label: 'Title' },
          { key: 'customer_name', label: 'Client' },
          { key: 'quotation_no', label: 'Quote', render: (r) => r.quotation_no || '—' },
          { key: 'status', label: 'Status' },
        ]}
      />

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.doc_no} — ${viewing.doc_type_display}` : ''}
        size="xl"
      >
        {viewing && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/60">{viewing.title} · {viewing.customer_name} · {viewing.status}</p>
            {viewing.status === 'DRAFT' ? (
              <textarea
                className="textarea textarea-bordered w-full font-mono text-xs min-h-[360px]"
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
              />
            ) : (
              <div
                className="prose prose-sm max-w-none border border-base-200 rounded-lg p-4 max-h-[420px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: viewing.body_html }}
              />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setViewing(null)}>Close</button>
              {viewing.status === 'DRAFT' && (
                <>
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => saveBody.mutate({ id: viewing.id, body_html: bodyDraft })}
                    disabled={saveBody.isPending}
                  >
                    Save draft
                  </button>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => finalize.mutate(viewing.id)}
                    disabled={finalize.isPending}
                  >
                    Finalize
                  </button>
                </>
              )}
              {viewing.status === 'FINAL' && (
                <button className="btn-primary btn-sm inline-flex items-center gap-1" onClick={() => downloadPdf(viewing)}>
                  <Download size={14} /> Download PDF
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export async function createSowFromQuotation(quotationId: number, extra?: Record<string, string>) {
  return (
    await api.post('/billing/client-documents/from-quotation/', {
      quotation: quotationId,
      doc_type: 'sow',
      ...extra,
    })
  ).data as ClientDoc;
}
