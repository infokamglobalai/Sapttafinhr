import { useMemo, useState } from 'react';
import { Table, Tag, Tabs, Button, Input, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { MOCK_JOURNAL_ENTRIES, MOCK_TRIAL_BALANCE, formatINR, type JournalEntry, type TrialBalanceRow } from '../../data/finance-mock';
import { useApiResource, asList } from '../../hooks/useApiResource';

const sourceCfg: Record<string, { color: string; label: string }> = {
  manual: { color: 'default', label: 'Manual' },
  invoice: { color: 'blue', label: 'Invoice' },
  receipt: { color: 'green', label: 'Receipt' },
  payroll: { color: 'purple', label: 'Payroll' },
  depreciation: { color: 'orange', label: 'Depreciation' },
};

// Account type (from the API) → display group + colour.
const TYPE_GROUP: Record<string, string> = {
  ASSET: 'Assets', LIABILITY: 'Liabilities', EQUITY: 'Equity',
  INCOME: 'Income', EXPENSE: 'Expenses',
};
const groupColors: Record<string, string> = {
  Assets: '#10B981', 'Fixed Assets': '#0EA5E9', Liabilities: '#EF4444',
  Equity: '#8B5CF6', Income: '#10B981', Expenses: '#FF6D00',
};

const num = (v: unknown): number => Number(v ?? 0) || 0;

// ── API shapes ────────────────────────────────────────────────────────────
interface ApiJournalLine { account_code: string; account_name: string; debit: string; credit: string }
interface ApiJournalEntry {
  id: number; voucher_no: string; date: string; narration: string;
  status: string; lines: ApiJournalLine[];
}
interface ApiTrialRow { account_id: number; code: string; name: string; type: string; debit: string; credit: string }

function jeFromApi(a: ApiJournalEntry): JournalEntry {
  const lines = (a.lines || []).map(l => ({
    accountCode: l.account_code, account: l.account_name,
    debit: num(l.debit), credit: num(l.credit),
  }));
  return {
    id: String(a.id),
    number: a.voucher_no,
    date: a.date,
    narration: a.narration,
    source: 'manual',
    status: (a.status || '').toLowerCase() === 'posted' ? 'posted' : 'draft',
    totalDebit: lines.reduce((s, l) => s + l.debit, 0),
    totalCredit: lines.reduce((s, l) => s + l.credit, 0),
    lines,
  } as JournalEntry;
}

function tbFromApi(r: ApiTrialRow): TrialBalanceRow {
  return {
    accountCode: r.code, accountName: r.name,
    group: TYPE_GROUP[r.type] || r.type,
    debit: num(r.debit), credit: num(r.credit),
  } as TrialBalanceRow;
}

export default function Ledger() {
  const [tab, setTab] = useState('journal');
  const [jeSearch, setJeSearch] = useState('');
  const [expandedJE, setExpandedJE] = useState<string[]>([]);

  // Live data. Trial balance needs a company id; pull the first company.
  const companies = useApiResource<unknown>('/masters/companies/');
  const companyId = useMemo(() => {
    const list = asList<{ id: number }>(companies.data);
    return list[0]?.id ?? null;
  }, [companies.data]);

  const entries = useApiResource<unknown>('/ledger/entries/');
  const tb = useApiResource<{ rows?: ApiTrialRow[] }>(
    companyId ? `/ledger/trial-balance/?company=${companyId}` : null,
  );

  const liveEntries = useMemo(() => asList<ApiJournalEntry>(entries.data).map(jeFromApi), [entries.data]);
  const liveTb = useMemo(() => (tb.data?.rows ?? []).map(tbFromApi), [tb.data]);

  const usingLiveJE = !entries.loading && !entries.error && liveEntries.length > 0;
  const usingLiveTB = !tb.loading && !tb.error && liveTb.length > 0;

  const journalEntries: JournalEntry[] = usingLiveJE ? liveEntries : MOCK_JOURNAL_ENTRIES;
  const trialBalance: TrialBalanceRow[] = usingLiveTB ? liveTb : MOCK_TRIAL_BALANCE;

  const filteredJE = journalEntries.filter(je =>
    !jeSearch || `${je.number} ${je.narration}`.toLowerCase().includes(jeSearch.toLowerCase())
  );

  const totalDebits = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredits = trialBalance.reduce((s, r) => s + r.credit, 0);
  const balanced = Math.abs(totalDebits - totalCredits) < 1;
  const anyLive = usingLiveJE || usingLiveTB;
  const loading = entries.loading || tb.loading || companies.loading;

  const jeColumns = [
    {
      title: 'Voucher', key: 'number',
      render: (_: unknown, r: JournalEntry) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>{r.number}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      ),
    },
    { title: 'Narration', dataIndex: 'narration', key: 'narration', render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span> },
    {
      title: 'Source', key: 'source',
      render: (_: unknown, r: JournalEntry) => { const s = sourceCfg[r.source]; return <Tag color={s?.color} style={{ fontSize: 11, borderRadius: 6 }}>{s?.label}</Tag>; },
    },
    { title: 'Total Debit', key: 'debit', render: (_: unknown, r: JournalEntry) => <span style={{ fontSize: 13, fontWeight: 600 }}>{formatINR(r.totalDebit)}</span> },
    { title: 'Total Credit', key: 'credit', render: (_: unknown, r: JournalEntry) => <span style={{ fontSize: 13, fontWeight: 600 }}>{formatINR(r.totalCredit)}</span> },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: JournalEntry) => <Tag color={r.status === 'posted' ? 'green' : 'default'} style={{ fontSize: 11, borderRadius: 6 }}>{r.status === 'posted' ? 'Posted' : 'Draft'}</Tag>,
    },
  ];

  const tbColumns = [
    { title: 'Code', dataIndex: 'accountCode', key: 'code', render: (v: string) => <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{v}</span>, width: 80 },
    { title: 'Account Name', dataIndex: 'accountName', key: 'name', render: (v: string) => <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span> },
    {
      title: 'Group', key: 'group',
      render: (_: unknown, r: TrialBalanceRow) => (
        <span style={{ fontSize: 11, fontWeight: 600, color: groupColors[r.group] || 'var(--color-text-secondary)', background: `${groupColors[r.group] || '#000'}12`, padding: '2px 8px', borderRadius: 6 }}>{r.group}</span>
      ),
    },
    {
      title: 'Debit', key: 'debit', align: 'right' as const,
      render: (_: unknown, r: TrialBalanceRow) => r.debit > 0
        ? <span style={{ fontSize: 13, fontWeight: 600, display: 'block', textAlign: 'right' }}>{formatINR(r.debit)}</span>
        : <span style={{ color: 'var(--color-text-muted)', display: 'block', textAlign: 'right' }}>—</span>,
    },
    {
      title: 'Credit', key: 'credit', align: 'right' as const,
      render: (_: unknown, r: TrialBalanceRow) => r.credit > 0
        ? <span style={{ fontSize: 13, fontWeight: 600, display: 'block', textAlign: 'right' }}>{formatINR(r.credit)}</span>
        : <span style={{ color: 'var(--color-text-muted)', display: 'block', textAlign: 'right' }}>—</span>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Ledger</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Double-entry journal entries & trial balance</p>
      </div>

      {anyLive ? (
        <Alert type="success" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}><strong>Live</strong> — {usingLiveJE ? `${liveEntries.length} journal entries` : 'journal entries (none yet)'}, {usingLiveTB ? `${liveTb.length} accounts in trial balance` : 'trial balance (empty)'} from your workspace.</span>} />
      ) : (
        <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}>{loading ? 'Loading ledger from your workspace…' : 'Showing demo data — post entries in your workspace to see them here.'}</span>} />
      )}

      {/* Invariant check */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', marginBottom: 24,
        background: balanced ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
        border: `1px solid ${balanced ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 12,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: balanced ? '#10B981' : '#EF4444' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: balanced ? '#10B981' : '#EF4444' }}>
          {balanced ? 'Books balanced' : 'Imbalance detected'} — Total Debits: {formatINR(totalDebits)} · Total Credits: {formatINR(totalCredits)}
        </span>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'journal',
          label: `Journal Entries (${journalEntries.length})`,
          children: (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <Input prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />} placeholder="Search voucher or narration..." value={jeSearch} onChange={e => setJeSearch(e.target.value)} style={{ maxWidth: 320, borderRadius: 8 }} allowClear />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Day Book</Button>
                  <Button type="primary" icon={<PlusOutlined />} style={{ background: '#6366F1', border: 'none', borderRadius: 8, fontWeight: 600 }}>New Entry</Button>
                </div>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <Table
                  dataSource={filteredJE} columns={jeColumns} rowKey="id" loading={entries.loading}
                  pagination={{ pageSize: 10 }} size="middle"
                  expandable={{
                    expandedRowKeys: expandedJE,
                    onExpand: (expanded, record) => setExpandedJE(expanded ? [...expandedJE, record.id] : expandedJE.filter(k => k !== record.id)),
                    expandedRowRender: (record: JournalEntry) => (
                      <div style={{ padding: '8px 16px' }}>
                        <div style={{ display: 'flex', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                          <span style={{ flex: 0.5 }}>Code</span>
                          <span style={{ flex: 2 }}>Account</span>
                          <span style={{ flex: 1, textAlign: 'right' }}>Debit</span>
                          <span style={{ flex: 1, textAlign: 'right' }}>Credit</span>
                        </div>
                        {record.lines.map((line, i) => (
                          <div key={i} style={{ display: 'flex', padding: '6px 0', borderBottom: '1px solid #F5F5F5', fontSize: 13 }}>
                            <span style={{ flex: 0.5, fontFamily: 'monospace', color: 'var(--color-text-muted)', fontSize: 12 }}>{line.accountCode}</span>
                            <span style={{ flex: 2, fontWeight: 600 }}>{line.account}</span>
                            <span style={{ flex: 1, textAlign: 'right', fontWeight: line.debit > 0 ? 600 : 400, color: line.debit > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{line.debit > 0 ? formatINR(line.debit) : '—'}</span>
                            <span style={{ flex: 1, textAlign: 'right', fontWeight: line.credit > 0 ? 600 : 400, color: line.credit > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{line.credit > 0 ? formatINR(line.credit) : '—'}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  }}
                />
              </div>
            </>
          ),
        },
        {
          key: 'trial',
          label: 'Trial Balance',
          children: (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
                <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>PDF</Button>
                <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>CSV</Button>
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <Table
                  dataSource={trialBalance} columns={tbColumns} rowKey="accountCode" loading={tb.loading}
                  pagination={false} size="middle"
                  summary={() => (
                    <Table.Summary.Row style={{ background: '#F9FAFB' }}>
                      <Table.Summary.Cell index={0} colSpan={3}><span style={{ fontSize: 14, fontWeight: 800 }}>Total</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><span style={{ fontSize: 14, fontWeight: 800 }}>{formatINR(totalDebits)}</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right"><span style={{ fontSize: 14, fontWeight: 800 }}>{formatINR(totalCredits)}</span></Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </div>
            </>
          ),
        },
      ]} />
    </div>
  );
}
