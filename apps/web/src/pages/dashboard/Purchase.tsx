import { useState, useMemo } from 'react';
import { Table, Tag, Button, Tabs, Input, Select, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined, EyeOutlined, CheckCircleFilled } from '@ant-design/icons';
import { MOCK_PURCHASE_ORDERS, MOCK_VENDOR_BILLS, formatINR, type PurchaseOrder, type VendorBill } from '../../data/finance-mock';
import { useApiResource, asList } from '../../hooks/useApiResource';

const { Option } = Select;

const numv = (v: unknown): number => Number(v ?? 0) || 0;

// ── API shapes → page view-models ─────────────────────────────────────────
interface ApiPO { id: number; po_no: string; date: string; vendor_name: string; status: string; grand_total: string }
interface ApiVBill {
  id: number; bill_no: string; date: string; due_date: string | null; vendor_name: string;
  status: string; taxable_amount: string; cgst: string; sgst: string; igst: string;
  grand_total: string; amount_paid: string; balance_due: string; purchase_order: number | null;
}

function poFromApi(a: ApiPO): PurchaseOrder {
  const s = (a.status || '').toLowerCase();
  return {
    id: String(a.id), number: a.po_no, date: a.date, vendorId: '', vendorName: a.vendor_name || '—',
    status: (['draft', 'sent', 'acknowledged', 'received', 'billed', 'cancelled'].includes(s) ? s : 'sent') as PurchaseOrder['status'],
    items: [], total: numv(a.grand_total),
  };
}
function billFromApi(a: ApiVBill): VendorBill {
  let s = (a.status || '').toLowerCase();
  const due = a.due_date ? new Date(a.due_date) : null;
  if (s === 'approved' && due && due < new Date() && numv(a.balance_due) > 0) s = 'overdue';
  if (!['draft', 'approved', 'paid', 'overdue'].includes(s)) s = 'approved';
  return {
    id: String(a.id), number: a.bill_no, vendorBillNo: a.bill_no, date: a.date, dueDate: a.due_date || a.date,
    vendorId: '', vendorName: a.vendor_name || '—', status: s as VendorBill['status'],
    subtotal: numv(a.taxable_amount), gst: numv(a.cgst) + numv(a.sgst) + numv(a.igst), tds: 0,
    total: numv(a.grand_total), poRef: a.purchase_order ? String(a.purchase_order) : '',
  } as VendorBill;
}

const poStatusCfg: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: 'Draft' },
  sent: { color: 'blue', label: 'Sent' },
  acknowledged: { color: 'cyan', label: 'Acknowledged' },
  received: { color: 'green', label: 'Received' },
  billed: { color: 'purple', label: 'Billed' },
  cancelled: { color: 'default', label: 'Cancelled' },
};

const billStatusCfg: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: 'Draft' },
  approved: { color: 'blue', label: 'Approved' },
  paid: { color: 'green', label: 'Paid' },
  overdue: { color: 'red', label: 'Overdue' },
};

export default function Purchase() {
  const [tab, setTab] = useState('orders');
  const [poSearch, setPoSearch] = useState('');
  const [billSearch, setBillSearch] = useState('');

  // Live data from the FIN tenant API; fall back to demo data per-list.
  const poRes = useApiResource<unknown>('/procurement/purchase-orders/');
  const billRes = useApiResource<unknown>('/procurement/vendor-bills/');
  const livePOs = useMemo(() => asList<ApiPO>(poRes.data).map(poFromApi), [poRes.data]);
  const liveBills = useMemo(() => asList<ApiVBill>(billRes.data).map(billFromApi), [billRes.data]);
  const poLive = !poRes.loading && !poRes.error && livePOs.length > 0;
  const billLive = !billRes.loading && !billRes.error && liveBills.length > 0;
  const anyLive = poLive || billLive;
  const loading = poRes.loading || billRes.loading;

  const purchaseOrders: PurchaseOrder[] = poLive ? livePOs : MOCK_PURCHASE_ORDERS;
  const vendorBills: VendorBill[] = billLive ? liveBills : MOCK_VENDOR_BILLS;

  const filteredPOs = purchaseOrders.filter(po =>
    !poSearch || `${po.number} ${po.vendorName}`.toLowerCase().includes(poSearch.toLowerCase())
  );

  const filteredBills = vendorBills.filter(vb =>
    !billSearch || `${vb.number} ${vb.vendorName} ${vb.vendorBillNo}`.toLowerCase().includes(billSearch.toLowerCase())
  );

  const totalPayable = vendorBills.filter(b => b.status !== 'paid').reduce((s, b) => s + b.total, 0);
  const totalOverdue = vendorBills.filter(b => b.status === 'overdue').reduce((s, b) => s + b.total, 0);

  const poColumns = [
    {
      title: 'PO Number', key: 'number',
      render: (_: unknown, r: PurchaseOrder) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0EA5E9' }}>{r.number}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      ),
    },
    {
      title: 'Vendor', key: 'vendor',
      render: (_: unknown, r: PurchaseOrder) => <span style={{ fontSize: 13, fontWeight: 600 }}>{r.vendorName}</span>,
    },
    {
      title: 'Items', key: 'items',
      render: (_: unknown, r: PurchaseOrder) => (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {r.items.map(i => i.description).join(', ')}
        </div>
      ),
    },
    {
      title: 'Total', key: 'total',
      render: (_: unknown, r: PurchaseOrder) => <span style={{ fontSize: 14, fontWeight: 700 }}>{formatINR(r.total)}</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: PurchaseOrder) => <Tag color={poStatusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{poStatusCfg[r.status]?.label}</Tag>,
    },
  ];

  const billColumns = [
    {
      title: 'Bill', key: 'number',
      render: (_: unknown, r: VendorBill) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8B5CF6' }}>{r.number}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Vendor Ref: {r.vendorBillNo}</div>
        </div>
      ),
    },
    {
      title: 'Vendor', key: 'vendor',
      render: (_: unknown, r: VendorBill) => <span style={{ fontSize: 13, fontWeight: 600 }}>{r.vendorName}</span>,
    },
    {
      title: 'PO Ref', key: 'po',
      render: (_: unknown, r: VendorBill) => <Tag style={{ fontSize: 11, borderRadius: 6 }}>{r.poRef}</Tag>,
    },
    {
      title: 'Date', key: 'date',
      render: (_: unknown, r: VendorBill) => <span style={{ fontSize: 12 }}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>,
    },
    {
      title: 'Due', key: 'due',
      render: (_: unknown, r: VendorBill) => {
        const overdue = new Date(r.dueDate) < new Date();
        return <span style={{ fontSize: 12, color: overdue ? '#EF4444' : 'var(--color-text-secondary)', fontWeight: overdue ? 600 : 400 }}>{new Date(r.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>;
      },
    },
    {
      title: 'Subtotal', key: 'subtotal',
      render: (_: unknown, r: VendorBill) => <span style={{ fontSize: 13 }}>{formatINR(r.subtotal)}</span>,
    },
    {
      title: 'GST', key: 'gst',
      render: (_: unknown, r: VendorBill) => <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{formatINR(r.gst)}</span>,
    },
    {
      title: 'TDS', key: 'tds',
      render: (_: unknown, r: VendorBill) => r.tds > 0
        ? <span style={{ fontSize: 12, color: '#EF4444' }}>-{formatINR(r.tds)}</span>
        : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      title: 'Net Payable', key: 'total',
      render: (_: unknown, r: VendorBill) => <span style={{ fontSize: 14, fontWeight: 700 }}>{formatINR(r.total)}</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: VendorBill) => <Tag color={billStatusCfg[r.status]?.color} style={{ fontSize: 11, borderRadius: 6 }}>{billStatusCfg[r.status]?.label}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Procurement</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Purchase orders, GRNs, and vendor bills with 3-way match</p>
        </div>
      </div>

      {anyLive ? (
        <Alert type="success" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}><strong>Live</strong> — {livePOs.length} purchase order{livePOs.length !== 1 ? 's' : ''}, {liveBills.length} vendor bill{liveBills.length !== 1 ? 's' : ''} from your workspace.</span>} />
      ) : (
        <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}>{loading ? 'Loading procurement data…' : 'Showing demo data — create POs and vendor bills in your workspace to see them here.'}</span>} />
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Total Payable</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#8B5CF6' }}>{formatINR(totalPayable)}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Overdue</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#EF4444' }}>{formatINR(totalOverdue)}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Open POs</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0EA5E9' }}>{purchaseOrders.filter(p => p.status !== 'billed' && p.status !== 'cancelled').length}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>GST Input Credit</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981' }}>{formatINR(vendorBills.reduce((s, b) => s + b.gst, 0))}</div>
        </div>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'orders',
          label: `Purchase Orders (${purchaseOrders.length})`,
          children: (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <Input prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />} placeholder="Search PO or vendor..." value={poSearch} onChange={e => setPoSearch(e.target.value)} style={{ maxWidth: 280, borderRadius: 8 }} allowClear />
                <Button type="primary" icon={<PlusOutlined />} style={{ background: '#0EA5E9', border: 'none', borderRadius: 8, fontWeight: 600 }}>New PO</Button>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <Table dataSource={filteredPOs} columns={poColumns} rowKey="id" pagination={false} size="middle" />
              </div>
            </>
          ),
        },
        {
          key: 'bills',
          label: <span>Vendor Bills ({vendorBills.length}) {vendorBills.some(b => b.status === 'overdue') && <Tag color="red" style={{ marginLeft: 4, borderRadius: 10, fontSize: 10 }}>!</Tag>}</span>,
          children: (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <Input prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />} placeholder="Search bill or vendor..." value={billSearch} onChange={e => setBillSearch(e.target.value)} style={{ maxWidth: 280, borderRadius: 8 }} allowClear />
                <Button type="primary" icon={<PlusOutlined />} style={{ background: '#8B5CF6', border: 'none', borderRadius: 8, fontWeight: 600 }}>Record Bill</Button>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <Table dataSource={filteredBills} columns={billColumns} rowKey="id" pagination={false} size="middle" />
              </div>
            </>
          ),
        },
      ]} />
    </div>
  );
}
