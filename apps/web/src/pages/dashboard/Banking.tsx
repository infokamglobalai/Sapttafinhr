import { useState, useMemo, useEffect } from 'react';
import { Table, Tag, Button, Tabs, Alert } from 'antd';
import { BankOutlined, CheckOutlined, SwapOutlined } from '@ant-design/icons';
import { MOCK_BANK_ACCOUNTS, MOCK_BANK_TRANSACTIONS, formatINR, type BankAccount, type BankTransaction } from '../../data/finance-mock';
import { useApiResource, asList } from '../../hooks/useApiResource';

const bnum = (v: unknown): number => Number(v ?? 0) || 0;

// ── API shapes → page view-models ─────────────────────────────────────────
interface ApiBankAccount { id: number; name: string; bank_name: string; account_number: string; branch: string; opening_balance: string }
interface ApiStatementLine { id: number; date: string; description: string; reference: string; debit: string; credit: string; balance: string; status: string }

function accountFromApi(a: ApiBankAccount): BankAccount {
  // The backend has no running-balance/unreconciled fields; opening_balance is
  // the best available figure and reconciliation state lives on statement lines.
  return {
    id: String(a.id), bankName: a.bank_name || a.name, accountNumber: a.account_number,
    type: a.branch || 'Current', balance: bnum(a.opening_balance), unreconciled: 0,
    lastReconciled: new Date().toISOString(),
  } as BankAccount;
}
function lineFromApi(l: ApiStatementLine, bankAccountId: string): BankTransaction {
  return {
    id: String(l.id), bankAccountId, date: l.date, description: l.description,
    reference: l.reference || '', debit: bnum(l.debit), credit: bnum(l.credit),
    balance: bnum(l.balance), reconciled: (l.status || '').toUpperCase() === 'MATCHED',
  } as BankTransaction;
}

export default function Banking() {
  // Live bank accounts; fall back to demo accounts.
  const acctRes = useApiResource<unknown>('/banking/bank-accounts/');
  const liveAccounts = useMemo(() => asList<ApiBankAccount>(acctRes.data).map(accountFromApi), [acctRes.data]);
  const usingLiveAccounts = !acctRes.loading && !acctRes.error && liveAccounts.length > 0;
  const accounts: BankAccount[] = usingLiveAccounts ? liveAccounts : MOCK_BANK_ACCOUNTS;

  const [selectedBank, setSelectedBank] = useState<string>(accounts[0]?.id ?? '');
  // Keep the selection valid when the account list resolves (live vs mock).
  useEffect(() => {
    if (accounts.length && !accounts.some(a => a.id === selectedBank)) {
      setSelectedBank(accounts[0].id);
    }
  }, [accounts, selectedBank]);

  // Live statement lines for the selected live account; else mock transactions.
  const linesRes = useApiResource<unknown>(
    usingLiveAccounts && selectedBank ? `/banking/statement-lines/?statement__bank_account=${selectedBank}` : null,
  );
  const [mockTxns, setMockTxns] = useState<BankTransaction[]>(MOCK_BANK_TRANSACTIONS);
  const liveLines = useMemo(
    () => asList<ApiStatementLine>(linesRes.data).map(l => lineFromApi(l, selectedBank)),
    [linesRes.data, selectedBank],
  );
  const usingLiveLines = usingLiveAccounts && !linesRes.loading && !linesRes.error && liveLines.length > 0;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalUnreconciled = accounts.reduce((s, a) => s + a.unreconciled, 0);
  const bankTxns = usingLiveLines ? liveLines : mockTxns.filter(t => t.bankAccountId === selectedBank);

  const handleReconcile = (id: string) => {
    setMockTxns(prev => prev.map(t => t.id === id ? { ...t, reconciled: true } : t));
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
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Banking</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Bank accounts, statement reconciliation & PDC tracking</p>
      </div>

      {usingLiveAccounts ? (
        <Alert type="success" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}><strong>Live</strong> — {liveAccounts.length} bank account{liveAccounts.length !== 1 ? 's' : ''} from your workspace{usingLiveLines ? `; ${liveLines.length} statement line${liveLines.length !== 1 ? 's' : ''} for the selected account` : ''}.</span>} />
      ) : (
        <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message={<span style={{ fontSize: 13 }}>{acctRes.loading ? 'Loading bank accounts…' : 'Showing demo data — add bank accounts in your workspace to see them here.'}</span>} />
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Total Bank Balance</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#6366F1', letterSpacing: '-0.5px' }}>{formatINR(totalBalance)}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Accounts</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-text-primary)' }}>{accounts.length}</div>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Unreconciled</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#FF6D00' }}>{totalUnreconciled}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>transactions pending</div>
        </div>
      </div>

      {/* Bank account cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {accounts.map(acc => (
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
          — {accounts.find(a => a.id === selectedBank)?.bankName}
        </span>
      </h3>
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <Table dataSource={bankTxns} columns={txnColumns} rowKey="id" pagination={false} size="middle" />
      </div>
    </div>
  );
}
