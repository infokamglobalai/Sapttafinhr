import { useState } from 'react';
import { Table, Tag, Tabs, Button, Input } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { MOCK_JOURNAL_ENTRIES, MOCK_TRIAL_BALANCE, formatINR, type JournalEntry, type TrialBalanceRow } from '../../data/finance-mock';

const sourceCfg: Record<string, { color: string; label: string }> = {
  manual: { color: 'default', label: 'Manual' },
  invoice: { color: 'blue', label: 'Invoice' },
  receipt: { color: 'green', label: 'Receipt' },
  payroll: { color: 'purple', label: 'Payroll' },
  depreciation: { color: 'orange', label: 'Depreciation' },
};

const groupColors: Record<string, string> = {
  Assets: '#10B981',
  'Fixed Assets': '#0EA5E9',
  Liabilities: '#EF4444',
  Equity: '#8B5CF6',
  Income: '#10B981',
  Expenses: '#FF6D00',
};

export default function Ledger() {
  const [tab, setTab] = useState('journal');
  const [jeSearch, setJeSearch] = useState('');
  const [expandedJE, setExpandedJE] = useState<string[]>([]);

  const filteredJE = MOCK_JOURNAL_ENTRIES.filter(je =>
    !jeSearch || `${je.number} ${je.narration}`.toLowerCase().includes(jeSearch.toLowerCase())
  );

  const totalDebits = MOCK_TRIAL_BALANCE.reduce((s, r) => s + r.debit, 0);
  const totalCredits = MOCK_TRIAL_BALANCE.reduce((s, r) => s + r.credit, 0);
  const balanced = Math.abs(totalDebits - totalCredits) < 1;

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
    {
      title: 'Narration', dataIndex: 'narration', key: 'narration',
      render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Source', key: 'source',
      render: (_: unknown, r: JournalEntry) => {
        const s = sourceCfg[r.source];
        return <Tag color={s?.color} style={{ fontSize: 11, borderRadius: 6 }}>{s?.label}</Tag>;
      },
    },
    {
      title: 'Total Debit', key: 'debit',
      render: (_: unknown, r: JournalEntry) => <span style={{ fontSize: 13, fontWeight: 600 }}>{formatINR(r.totalDebit)}</span>,
    },
    {
      title: 'Total Credit', key: 'credit',
      render: (_: unknown, r: JournalEntry) => <span style={{ fontSize: 13, fontWeight: 600 }}>{formatINR(r.totalCredit)}</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: JournalEntry) => (
        <Tag color={r.status === 'posted' ? 'green' : 'default'} style={{ fontSize: 11, borderRadius: 6 }}>
          {r.status === 'posted' ? 'Posted' : 'Draft'}
        </Tag>
      ),
    },
  ];

  const tbColumns = [
    {
      title: 'Code', dataIndex: 'accountCode', key: 'code',
      render: (v: string) => <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{v}</span>,
      width: 80,
    },
    {
      title: 'Account Name', dataIndex: 'accountName', key: 'name',
      render: (v: string) => <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Group', key: 'group',
      render: (_: unknown, r: TrialBalanceRow) => (
        <span style={{ fontSize: 11, fontWeight: 600, color: groupColors[r.group] || 'var(--color-text-secondary)', background: `${groupColors[r.group] || '#000'}12`, padding: '2px 8px', borderRadius: 6 }}>
          {r.group}
        </span>
      ),
    },
    {
      title: 'Debit', key: 'debit',
      render: (_: unknown, r: TrialBalanceRow) => r.debit > 0
        ? <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', display: 'block' }}>{formatINR(r.debit)}</span>
        : <span style={{ color: 'var(--color-text-muted)', display: 'block', textAlign: 'right' }}>—</span>,
      align: 'right' as const,
    },
    {
      title: 'Credit', key: 'credit',
      render: (_: unknown, r: TrialBalanceRow) => r.credit > 0
        ? <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', display: 'block' }}>{formatINR(r.credit)}</span>
        : <span style={{ color: 'var(--color-text-muted)', display: 'block', textAlign: 'right' }}>—</span>,
      align: 'right' as const,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Ledger</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Double-entry journal entries & trial balance</p>
      </div>

      {/* Invariant check */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', marginBottom: 24,
        background: balanced ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
        border: `1px solid ${balanced ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        borderRadius: 12,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: balanced ? '#10B981' : '#EF4444' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: balanced ? '#10B981' : '#EF4444' }}>
          {balanced ? 'Books balanced' : 'Imbalance detected'} — Total Debits: {formatINR(totalDebits)} · Total Credits: {formatINR(totalCredits)}
        </span>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'journal',
          label: `Journal Entries (${MOCK_JOURNAL_ENTRIES.length})`,
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
                  dataSource={filteredJE}
                  columns={jeColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="middle"
                  expandable={{
                    expandedRowKeys: expandedJE,
                    onExpand: (expanded, record) => {
                      setExpandedJE(expanded ? [...expandedJE, record.id] : expandedJE.filter(k => k !== record.id));
                    },
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
                            <span style={{ flex: 1, textAlign: 'right', fontWeight: line.debit > 0 ? 600 : 400, color: line.debit > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                              {line.debit > 0 ? formatINR(line.debit) : '—'}
                            </span>
                            <span style={{ flex: 1, textAlign: 'right', fontWeight: line.credit > 0 ? 600 : 400, color: line.credit > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                              {line.credit > 0 ? formatINR(line.credit) : '—'}
                            </span>
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
                  dataSource={MOCK_TRIAL_BALANCE}
                  columns={tbColumns}
                  rowKey="accountCode"
                  pagination={false}
                  size="middle"
                  summary={() => (
                    <Table.Summary.Row style={{ background: '#F9FAFB' }}>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <span style={{ fontSize: 14, fontWeight: 800 }}>Total</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span style={{ fontSize: 14, fontWeight: 800 }}>{formatINR(totalDebits)}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <span style={{ fontSize: 14, fontWeight: 800 }}>{formatINR(totalCredits)}</span>
                      </Table.Summary.Cell>
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
