import { useState, useMemo } from 'react';
import { Table, Tag, Button, Input, Select, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { MOCK_RECEIPTS, formatINR, type Receipt } from '../../data/finance-mock';
import { useApiResource, asList } from '../../hooks/useApiResource';

const { Option } = Select;

// ── API shape (ReceiptReadSerializer) → page Receipt view-model ───────────
interface ApiReceiptAllocation { invoice_no?: string }
interface ApiReceipt {
  id: number; receipt_no: string; date: string; customer_name: string;
  amount: string; mode: string; reference: string; status: string;
  allocations?: ApiReceiptAllocation[];
}
const num = (v: unknown): number => Number(v ?? 0) || 0;

function receiptFromApi(a: ApiReceipt): Receipt {
  const mode = (a.mode || '').toLowerCase();
  const status = (a.status || '').toLowerCase();
  return {
    id: String(a.id),
    number: a.receipt_no,
    date: a.date,
    partyId: '',
    partyName: a.customer_name || '—',
    amount: num(a.amount),
    mode: (['cash', 'bank_transfer', 'upi', 'cheque'].includes(mode) ? mode : 'bank_transfer') as Receipt['mode'],
    reference: a.reference || '',
    invoicesAllocated: (a.allocations || []).map(x => x.invoice_no).filter(Boolean) as string[],
    status: (['received', 'deposited', 'bounced'].includes(status) ? status : 'received') as Receipt['status'],
  };
}

const statusCfg: Record<string, { color: string; label: string }> = {
  received: { color: 'orange', label: 'Received' },
  deposited: { color: 'green', label: 'Deposited' },
  bounced: { color: 'red', label: 'Bounced' },
};

const modeCfg: Record<string, { color: string; label: string }> = {
  cash: { color: '#10B981', label: 'Cash' },
  bank_transfer: { color: '#6366F1', label: 'Bank Transfer' },
  upi: { color: '#FF6D00', label: 'UPI' },
  cheque: { color: '#0EA5E9', label: 'Cheque' },
};

export default function Receipts() {
  const { data, loading, error } = useApiResource<unknown>('/payments/receipts/');
  const live = useMemo(() => asList<ApiReceipt>(data).map(receiptFromApi), [data]);
  // Connected = the API call succeeded (even with zero rows). Demo data only
  // when the backend is unreachable, so a new empty workspace shows real state.
  const connected = !loading && !error;
  const usingLive = connected;
  const receipts: Receipt[] = connected ? live : MOCK_RECEIPTS;

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string | null>(null);

  const filtered = receipts.filter(r => {
    const matchSearch = !search || `${r.number} ${r.partyName} ${r.reference}`.toLowerCase().includes(search.toLowerCase());
    const matchMode = !modeFilter || r.mode === modeFilter;
    return matchSearch && matchMode;
  });

  const totalReceived = receipts.reduce((s, r) => s + r.amount, 0);
  const byMode = Object.entries(modeCfg).map(([key, cfg]) => ({
    ...cfg, key,
    amount: receipts.filter(r => r.mode === key).reduce((s, r) => s + r.amount, 0),
    count: receipts.filter(r => r.mode === key).length,
  }));

  const columns = [
    {
      title: 'Receipt', key: 'number',
      render: (_: unknown, r: Receipt) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{r.number}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      ),
    },
    {
      title: 'Customer', key: 'party',
      render: (_: unknown, r: Receipt) => <span style={{ fontSize: 13, fontWeight: 600 }}>{r.partyName}</span>,
    },
    {
      title: 'Amount', key: 'amount',
      render: (_: unknown, r: Receipt) => <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{formatINR(r.amount)}</span>,
      sorter: (a: Receipt, b: Receipt) => a.amount - b.amount,
    },
    {
      title: 'Mode', key: 'mode',
      render: (_: unknown, r: Receipt) => {
        const m = modeCfg[r.mode];
        return <span style={{ fontSize: 11, fontWeight: 600, color: m?.color, background: `${m?.color}12`, padding: '3px 10px', borderRadius: 6 }}>{m?.label}</span>;
      },
    },
    {
      title: 'Reference', dataIndex: 'reference', key: 'ref',
      render: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: 'Allocated To', key: 'allocated',
      render: (_: unknown, r: Receipt) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {r.invoicesAllocated.length > 0
            ? r.invoicesAllocated.map(inv => <Tag key={inv} style={{ fontSize: 11, borderRadius: 6 }}>{inv}</Tag>)
            : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Unallocated</span>
          }
        </div>
      ),
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: Receipt) => <Tag color={statusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{statusCfg[r.status]?.label}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Receipts</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{receipts.length} receipts · {formatINR(totalReceived)} collected</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} style={{ background: '#10B981', border: 'none', borderRadius: 8, fontWeight: 600 }}>
            Record Receipt
          </Button>
        </div>
      </div>

      {loading ? null : connected ? (
        live.length === 0 ? (
          <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
            message={<span style={{ fontSize: 13 }}>No receipts yet — click <strong>Record Receipt</strong> to add your first one.</span>} />
        ) : null
      ) : (
        <Alert type="warning" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}>Can't reach your workspace — showing sample data. Check that the backend is running.</span>} />
      )}

      {/* Mode summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {byMode.filter(m => m.count > 0).map(m => (
          <div key={m.key} style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{formatINR(m.amount)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.count} receipt{m.count > 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Input prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />} placeholder="Search receipt, customer, or reference..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300, borderRadius: 8 }} allowClear />
        <Select placeholder="Payment Mode" allowClear value={modeFilter} onChange={setModeFilter} style={{ minWidth: 150 }}>
          {Object.entries(modeCfg).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
        </Select>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={filtered} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
      </div>
    </div>
  );
}
