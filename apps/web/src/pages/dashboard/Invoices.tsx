import { useState, useMemo } from 'react';
import { Table, Tag, Button, Input, Select, Drawer, message, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, DownloadOutlined, SendOutlined } from '@ant-design/icons';
import { MOCK_INVOICES, formatINR, type Invoice } from '../../data/finance-mock';
import { useApiResource, asList } from '../../hooks/useApiResource';

const { Option } = Select;

const statusCfg: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: 'Draft' },
  sent: { color: 'blue', label: 'Sent' },
  paid: { color: 'green', label: 'Paid' },
  overdue: { color: 'red', label: 'Overdue' },
  cancelled: { color: 'default', label: 'Cancelled' },
};

// ── Shape returned by the FIN billing API (InvoiceReadSerializer) ──────────
interface ApiInvoiceLine {
  id: number;
  description: string;
  hsn_code: string;
  quantity: string;
  unit_price: string;
  line_total: string;
}
interface ApiInvoice {
  id: number;
  invoice_no: string;
  date: string;
  due_date: string | null;
  customer_name: string;
  place_of_supply: string;
  status: string;
  taxable_amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  grand_total: string;
  amount_paid: string;
  balance_due: string;
  is_paid: boolean;
  notes: string;
  lines: ApiInvoiceLine[];
}

const num = (v: string | number | null | undefined): number => Number(v ?? 0) || 0;

/** Map the live API invoice onto the page's Invoice view-model (mock shape). */
function fromApi(a: ApiInvoice): Invoice {
  const today = new Date();
  const due = a.due_date ? new Date(a.due_date) : null;
  // Backend status is uppercase (DRAFT/SENT/PAID/CANCELLED). Derive "overdue".
  let status = (a.status || '').toLowerCase();
  if (status === 'sent' && due && due < today && num(a.balance_due) > 0) status = 'overdue';
  if (!statusCfg[status]) status = a.is_paid ? 'paid' : 'sent';

  return {
    id: String(a.id),
    number: a.invoice_no,
    date: a.date,
    dueDate: a.due_date || a.date,
    partyName: a.customer_name || '—',
    partyGstin: '',
    status: status as Invoice['status'],
    subtotal: num(a.taxable_amount),
    cgst: num(a.cgst),
    sgst: num(a.sgst),
    igst: num(a.igst),
    totalTax: num(a.cgst) + num(a.sgst) + num(a.igst),
    total: num(a.grand_total),
    amountPaid: num(a.amount_paid),
    balanceDue: num(a.balance_due),
    items: (a.lines || []).map(l => ({
      description: l.description,
      hsn: l.hsn_code,
      qty: num(l.quantity),
      rate: num(l.unit_price),
      amount: num(l.line_total),
    })),
  } as Invoice;
}

export default function Invoices() {
  // Live data from the FIN tenant API; falls back to mock if unavailable.
  const { data, loading, error } = useApiResource<unknown>('/billing/invoices/');
  const live = useMemo(() => asList<ApiInvoice>(data).map(fromApi), [data]);
  const usingLive = !loading && !error && live.length > 0;
  const invoices: Invoice[] = usingLive ? live : MOCK_INVOICES;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || `${inv.number} ${inv.partyName}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalReceivable = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + i.balanceDue, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.balanceDue, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);

  const columns = [
    {
      title: 'Invoice', key: 'number',
      render: (_: unknown, r: Invoice) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6D00' }}>{r.number}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      ),
      sorter: (a: Invoice, b: Invoice) => a.number.localeCompare(b.number),
    },
    {
      title: 'Customer', key: 'party',
      render: (_: unknown, r: Invoice) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.partyName}</div>
          {r.partyGstin && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>GSTIN: {r.partyGstin}</div>}
        </div>
      ),
    },
    {
      title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate',
      render: (d: string) => {
        const overdue = new Date(d) < new Date();
        return <span style={{ fontSize: 13, color: overdue ? '#EF4444' : 'var(--color-text-secondary)', fontWeight: overdue ? 600 : 400 }}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>;
      },
    },
    {
      title: 'Amount', key: 'total',
      render: (_: unknown, r: Invoice) => <span style={{ fontSize: 14, fontWeight: 700 }}>{formatINR(r.total)}</span>,
      sorter: (a: Invoice, b: Invoice) => a.total - b.total,
    },
    {
      title: 'GST', key: 'gst',
      render: (_: unknown, r: Invoice) => (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {r.igst > 0 ? `IGST ${formatINR(r.igst)}` : `C+S ${formatINR(r.cgst + r.sgst)}`}
        </div>
      ),
    },
    {
      title: 'Balance', key: 'balance',
      render: (_: unknown, r: Invoice) => (
        <span style={{ fontSize: 13, fontWeight: 700, color: r.balanceDue > 0 ? '#EF4444' : '#10B981' }}>
          {r.balanceDue > 0 ? formatINR(r.balanceDue) : 'Settled'}
        </span>
      ),
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: Invoice) => <Tag color={statusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{statusCfg[r.status]?.label || r.status}</Tag>,
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_: unknown, r: Invoice) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setViewInvoice(r)} style={{ color: '#FF6D00' }} />
          {r.status === 'draft' && (
            <Button type="text" size="small" icon={<SendOutlined />} onClick={() => message.info('Use the backend to send this invoice.')} style={{ color: '#10B981' }} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Invoices</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{invoices.length} invoices · GST compliant (CGST/SGST/IGST)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>GSTR-1 Export</Button>
          <Button type="primary" icon={<PlusOutlined />} style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>
            New Invoice
          </Button>
        </div>
      </div>

      {/* Live/demo data status */}
      {usingLive ? (
        <Alert type="success" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}><strong>Live</strong> — {live.length} invoice{live.length !== 1 ? 's' : ''} from your finance workspace.</span>} />
      ) : (
        <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={
            <span style={{ fontSize: 13 }}>
              {loading
                ? 'Loading invoices from your workspace…'
                : `Showing demo data${error ? ` — ${error}` : ' (no live invoices yet)'}. Sign in to your workspace with the backend running to see live invoices.`}
            </span>
          } />
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPI label="Total Receivable" value={formatINR(totalReceivable)} color="#FF6D00" />
        <KPI label="Overdue" value={formatINR(totalOverdue)} color="#EF4444" />
        <KPI label="Collected (FY)" value={formatINR(totalCollected)} color="#10B981" />
        <KPI label="GST Liability" value={formatINR(invoices.reduce((s, i) => s + i.totalTax, 0))} color="#6366F1" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />} placeholder="Search invoice or customer..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280, borderRadius: 8 }} allowClear />
        <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ minWidth: 130 }}>
          {Object.entries(statusCfg).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
        </Select>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="middle" />
      </div>

      {/* Invoice detail drawer */}
      <Drawer open={!!viewInvoice} onClose={() => setViewInvoice(null)} width={520}
        title={<span style={{ fontWeight: 700 }}>Invoice {viewInvoice?.number}</span>}>
        {viewInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billed To</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{viewInvoice.partyName}</div>
                {viewInvoice.partyGstin && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>GSTIN: {viewInvoice.partyGstin}</div>}
              </div>
              <Tag color={statusCfg[viewInvoice.status]?.color} style={{ fontSize: 12, borderRadius: 8, height: 'fit-content' }}>{statusCfg[viewInvoice.status]?.label || viewInvoice.status}</Tag>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <MiniStat label="Invoice Date" value={new Date(viewInvoice.date).toLocaleDateString('en-IN')} />
              <MiniStat label="Due Date" value={new Date(viewInvoice.dueDate).toLocaleDateString('en-IN')} />
              <MiniStat label="Items" value={String(viewInvoice.items.length)} />
            </div>

            {/* Line items */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Line Items</div>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', padding: '8px 14px', background: '#F9FAFB', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                  <span style={{ flex: 2 }}>Description</span>
                  <span style={{ flex: 0.6, textAlign: 'right' }}>HSN</span>
                  <span style={{ flex: 0.4, textAlign: 'right' }}>Qty</span>
                  <span style={{ flex: 0.8, textAlign: 'right' }}>Rate</span>
                  <span style={{ flex: 0.8, textAlign: 'right' }}>Amount</span>
                </div>
                {viewInvoice.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', padding: '10px 14px', borderTop: '1px solid var(--color-border)', fontSize: 13 }}>
                    <span style={{ flex: 2, fontWeight: 600 }}>{item.description}</span>
                    <span style={{ flex: 0.6, textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 12 }}>{item.hsn}</span>
                    <span style={{ flex: 0.4, textAlign: 'right' }}>{item.qty}</span>
                    <span style={{ flex: 0.8, textAlign: 'right' }}>{formatINR(item.rate)}</span>
                    <span style={{ flex: 0.8, textAlign: 'right', fontWeight: 600 }}>{formatINR(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <Row label="Subtotal" value={formatINR(viewInvoice.subtotal)} />
              {viewInvoice.cgst > 0 && <Row label="CGST @ 9%" value={formatINR(viewInvoice.cgst)} />}
              {viewInvoice.sgst > 0 && <Row label="SGST @ 9%" value={formatINR(viewInvoice.sgst)} />}
              {viewInvoice.igst > 0 && <Row label="IGST @ 18%" value={formatINR(viewInvoice.igst)} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: 260, borderTop: '2px dashed var(--color-border)', paddingTop: 10, marginTop: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#FF6D00' }}>{formatINR(viewInvoice.total)}</span>
              </div>
              {viewInvoice.amountPaid > 0 && <Row label="Amount Paid" value={`- ${formatINR(viewInvoice.amountPaid)}`} color="#10B981" />}
              {viewInvoice.balanceDue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 260, background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Balance Due</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#EF4444' }}>{formatINR(viewInvoice.balanceDue)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, background: `${color}08`, borderRadius: '50%' }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: 260, fontSize: 13 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}
