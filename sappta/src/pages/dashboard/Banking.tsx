import { useState } from 'react';
import { Table, Tag, Button, Tabs } from 'antd';
import { BankOutlined, CheckOutlined, SwapOutlined } from '@ant-design/icons';
import { MOCK_BANK_ACCOUNTS, MOCK_BANK_TRANSACTIONS, formatINR, type BankAccount, type BankTransaction } from '../../data/finance-mock';

export default function Banking() {
  const [selectedBank, setSelectedBank] = useState<string>(MOCK_BANK_ACCOUNTS[0].id);
  const [transactions, setTransactions] = useState<BankTransaction[]>(MOCK_BANK_TRANSACTIONS);

  const totalBalance = MOCK_BANK_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const totalUnreconciled = MOCK_BANK_ACCOUNTS.reduce((s, a) => s + a.unreconciled, 0);
  const bankTxns = transactions.filter(t => t.bankAccountId === selectedBank);

  const handleReconcile = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, reconciled: true } : t));
  };

  const txnColumns = [
    {
      title: 'Date', dataIndex: 'date', key: 'date',
      render: (d: string) => <span style={{ fontSize: 13, fontWeight: 500 }}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>,
    },
    {
      title: 'Description', dataIndex: 'description', key: 'desc',
      render: (d: string) => <span style={{ fontSize: 13, fontWeight: 600 }}>{d}</span>,
    },
    {
      title: 'Reference', dataIndex: 'reference', key: 'ref',
      render: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: 'Debit', key: 'debit',
      render: (_: unknown, r: BankTransaction) => r.debit > 0
        ? <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>-{formatINR(r.debit)}</span>
        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      title: 'Credit', key: 'credit',
      render: (_: unknown, r: BankTransaction) => r.credit > 0
        ? <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>+{formatINR(r.credit)}</span>
        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      title: 'Balance', dataIndex: 'balance', key: 'balance',
      render: (v: number) => <span style={{ fontSize: 13, fontWeight: 700 }}>{formatINR(v)}</span>,
    },
    {
      title: 'Status', key: 'reconciled',
      render: (_: unknown, r: BankTransaction) => r.reconciled
        ? <Tag color="green" style={{ fontSize: 11, borderRadius: 6 }}>Reconciled</Tag>
        : (
          <Button size="small" icon={<CheckOutlined />} onClick={() => handleReconcile(r.id)}
            style={{ fontSize: 11, borderRadius: 6, fontWeight: 600, color: '#FF6D00', borderColor: '#FF6D00' }}>
            Reconcile
          </Button>
        ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Banking</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Bank accounts, statement reconciliation & PDC tracking</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Total Bank Balance</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#6366F1', letterSpacing: '-0.5px' }}>{formatINR(totalBalance)}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Accounts</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text-primary)' }}>{MOCK_BANK_ACCOUNTS.length}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Unreconciled</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#FF6D00' }}>{totalUnreconciled}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>transactions pending</div>
        </div>
      </div>

      {/* Bank account cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {MOCK_BANK_ACCOUNTS.map(acc => (
          <div
            key={acc.id}
            onClick={() => setSelectedBank(acc.id)}
            style={{
              background: selectedBank === acc.id ? 'linear-gradient(135deg, #1A1A2E, #0F3460)' : '#FFFFFF',
              borderRadius: 14, padding: '18px 22px', minWidth: 220,
              border: selectedBank === acc.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--color-border)',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <BankOutlined style={{ fontSize: 18, color: selectedBank === acc.id ? '#818CF8' : '#6366F1' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selectedBank === acc.id ? '#FFFFFF' : 'var(--color-text-primary)' }}>{acc.bankName}</div>
                <div style={{ fontSize: 11, color: selectedBank === acc.id ? 'rgba(255,255,255,0.5)' : 'var(--color-text-muted)' }}>{acc.accountNumber} · {acc.type}</div>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: selectedBank === acc.id ? '#818CF8' : '#6366F1', letterSpacing: '-0.5px' }}>{formatINR(acc.balance)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: selectedBank === acc.id ? 'rgba(255,255,255,0.4)' : 'var(--color-text-muted)' }}>
                Last reconciled: {new Date(acc.lastReconciled).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
              {acc.unreconciled > 0 && (
                <Tag color="orange" style={{ fontSize: 10, borderRadius: 10 }}>{acc.unreconciled} pending</Tag>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <SwapOutlined /> Transactions
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)' }}>
          — {MOCK_BANK_ACCOUNTS.find(a => a.id === selectedBank)?.bankName}
        </span>
      </h3>
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={bankTxns} columns={txnColumns} rowKey="id" pagination={false} size="middle" />
      </div>
    </div>
  );
}
