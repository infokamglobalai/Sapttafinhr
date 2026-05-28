import { useState } from 'react';
import { Row, Col, Tag, Button } from 'antd';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';

const accountsModules = [
  { code: 'DL', title: 'Double-Entry Ledgers', tag: 'Core Accounting', accent: '#FF6D00',
    desc: 'Real-time profit & loss records, automated trial balances, cash flow logs, and audit-ready balance sheets.',
    features: ['Instant Profit & Loss registries', 'Journal transaction ledgers', 'Automated trial balance charts'] },
  { code: 'GB', title: 'GST Billing & Invoicing', tag: 'Core Accounting', accent: '#8A2BE2',
    desc: 'Issue legal tax invoices natively integrating CGST, SGST, IGST rules with payment gateway connections.',
    features: ['GST invoice templates generator', 'Purchase order reconciliation', 'Quotations & cost estimates'] },
  { code: 'TX', title: 'Indian Statutory Taxation', tag: 'Compliance Core', accent: '#FF6D00',
    desc: 'Calculate tax withholdings dynamically. Generate compliant registers for GSTR-1, GSTR-3B, and TDS returns.',
    features: ['GSTR returns filing bridges', 'Salary TDS tax calculators', 'Automated corporate tax registers'] },
  { code: 'BR', title: 'Dynamic Bank Reconciler', tag: 'Core Operations', accent: '#8A2BE2',
    desc: 'Connect corporate bank statements. Automatically match transactions and verify accounts within seconds.',
    features: ['Automated statement matching', 'Vendor payouts ledger bridges', 'Razorpay API synchronization'] },
  { code: 'EA', title: 'Corporate Expense Auditing', tag: 'Core Operations', accent: '#FF6D00',
    desc: 'Track business expenses and employee expense claims. Synced natively with department budgets.',
    features: ['Employee reimbursement logs', 'Petty cash ledger auditing', 'Operational budget constraints'] },
  { code: 'IS', title: 'Real-Time Inventory Stock', tag: 'Advanced Tools', accent: '#8A2BE2',
    desc: 'Track warehouse inventory status. Barcode integration automatically balances ledger asset valuations.',
    features: ['Warehouse stock tracking maps', 'Asset inventory calculations', 'Auto-reordering configurations'] },
];

export default function AccountsSolutions() {
  /* Interactive Ledger Balancing State */
  const [balanceItem, setBalanceItem] = useState<'payroll' | 'invoice' | 'subscription'>('payroll');
  const [ledgerKey, setLedgerKey] = useState(0);

  const ledgerDetails = {
    payroll: { deb: '₹ 2,08,000', cred: '₹ 2,08,000', type: 'Mumbai Roster Run', sync: 'Verified Ledger Sync ✓' },
    invoice: { deb: '₹ 88,500', cred: '₹ 88,500', type: 'Enterprise Client ERP Sale', sync: 'Razorpay Match Sync ✓' },
    subscription: { deb: '₹ 15,200', cred: '₹ 15,200', type: 'AWS Infrastructure Bill', sync: 'Auto-Debit Reconciled ✓' },
  };

  const handleTransactionChange = (key: 'payroll' | 'invoice' | 'subscription') => {
    setBalanceItem(key);
    setLedgerKey(prev => prev + 1);
  };

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-orange" style={{ width: 450, height: 450, top: -160, left: -100, opacity: 0.08 }} />
        <div className="orb-purple" style={{ width: 450, height: 450, bottom: -160, right: -100, opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 5 }}>
          <ScrollReveal animation="fade-in-down">
            <h1 style={{ letterSpacing: '-1.5px', fontWeight: 900 }}>Accounts & Finance Solutions</h1>
            <p style={{ color: 'rgba(10,17,40,0.6)', fontWeight: 500 }}>
              Double-entry bookkeeping integrity, Indian statutory GST invoicing, and real-time bank ledger reconciliation.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* ── 1. The Interactive Ledger Reconciler ── */}
      <section style={{ padding: '80px 24px', background: '#FFFFFF', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[56, 44]} align="middle">
            {/* Description */}
            <Col xs={24} lg={11}>
              <ScrollReveal animation="fade-in-left">
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,109,0,0.06)', border: '1px solid rgba(255,109,0,0.18)',
                  borderRadius: 24, padding: '6px 16px', marginBottom: 20,
                }}>
                  <span style={{ color: '#FF6D00', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>
                    ACTIVE GENERAL LEDGER
                  </span>
                </div>
                <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.25 }}>
                  Absolute bookkeeping truth.<br/>Zero manual workarounds.
                </h2>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 18 }}>
                  Every payroll run processed, expense claim filed, or invoice paid automatically updates your double-entry accounts ledgers in real-time.
                </p>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 28 }}>
                  Our compliance engine natively balances Debit and Credit journals, updates statutory tax pools (CGST, SGST, IGST), and generates audit-ready financial balance sheets.
                </p>
                
                {/* Interactive transaction selectors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'payroll', label: 'Mumbai Roster Payroll Run' },
                    { key: 'invoice', label: 'Enterprise Client Invoice Payment' },
                    { key: 'subscription', label: 'AWS Cloud Infrastructure Autopay' },
                  ].map(item => (
                    <Button
                      key={item.key}
                      style={{
                        borderRadius: 8, height: 44, fontWeight: 700, textAlign: 'left',
                        background: balanceItem === item.key ? 'rgba(0, 200, 83, 0.06)' : '#FFFFFF',
                        borderColor: balanceItem === item.key ? '#00C853' : 'rgba(10,17,40,0.08)',
                        color: balanceItem === item.key ? '#00C853' : '#0A1128',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => handleTransactionChange(item.key as any)}
                      className="card-hover"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </ScrollReveal>
            </Col>

            {/* Interactive Ledger Widget */}
            <Col xs={24} lg={13}>
              <ScrollReveal animation="fade-in-right">
                <div style={{
                  background: '#FAFAFC', border: '1.5px solid rgba(0, 200, 83, 0.18)',
                  borderRadius: 24, padding: 32, boxShadow: '0 16px 48px rgba(10,17,40,0.03)',
                }}>
                  <h4 style={{ fontWeight: 800, fontSize: 16, color: '#0A1128', marginBottom: 16 }}>
                    Active Transaction Journal Record
                  </h4>

                  {/* Dynamic slide up entries */}
                  <div key={ledgerKey} className="chat-message-reveal" style={{
                    background: '#FFFFFF', border: '1px solid rgba(10,17,40,0.06)',
                    borderRadius: 16, padding: 22, marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
                      <span style={{ color: 'rgba(10,17,40,0.45)', fontWeight: 600 }}>Active Transaction Entry</span>
                      <strong style={{ color: '#0A1128' }}>{ledgerDetails[balanceItem].type}</strong>
                    </div>

                    <div style={{ height: 1, background: 'rgba(10,17,40,0.06)', margin: '10px 0' }} />

                    {/* Debit/Credit boxes pulse on calculate triggers */}
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}>
                        <div key={`deb-${ledgerKey}`} className={ledgerKey > 0 ? "number-pulse" : ""} style={{
                          background: '#FAFAFC', padding: 12, borderRadius: 10, textAlign: 'center',
                          border: '1px solid rgba(10,17,40,0.05)', transition: 'all 0.15s ease'
                        }}>
                          <div style={{ fontSize: 11.5, color: 'rgba(10,17,40,0.45)', fontWeight: 700, marginBottom: 4 }}>DEBIT JOURNAL</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1128' }}>{ledgerDetails[balanceItem].deb}</div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div key={`cred-${ledgerKey}`} className={ledgerKey > 0 ? "number-pulse" : ""} style={{
                          background: '#FAFAFC', padding: 12, borderRadius: 10, textAlign: 'center',
                          border: '1px solid rgba(10,17,40,0.05)', transition: 'all 0.15s ease'
                        }}>
                          <div style={{ fontSize: 11.5, color: 'rgba(10,17,40,0.45)', fontWeight: 700, marginBottom: 4 }}>CREDIT JOURNAL</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#FF6D00' }}>{ledgerDetails[balanceItem].cred}</div>
                        </div>
                      </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'rgba(10,17,40,0.45)', fontWeight: 600 }}>General Ledger Integrity Status</span>
                      <span style={{ color: '#00C853', fontWeight: 800 }}>{ledgerDetails[balanceItem].sync}</span>
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(52, 199, 89, 0.05)', border: '1px solid rgba(52, 199, 89, 0.2)',
                    borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 12.5, color: '#2b8a3e', fontWeight: 600 }}>
                      ✓ Ledger Reconciled: Balance matches system parameters perfectly.
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── 2. The Modular Core Grid ── */}
      <section style={{ padding: '80px 24px', background: '#FAFAFC', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <ScrollReveal animation="fade-in-down">
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 10, letterSpacing: '-1px' }}>
                Financial & Ledger Modules
              </h2>
              <p style={{ color: 'rgba(10, 17, 40, 0.55)', fontSize: '1.05rem', fontWeight: 500 }}>
                Tailored Indian accounting matrices coordinating bills, reconciliations, and ledgers.
              </p>
            </ScrollReveal>
          </div>

          <Row gutter={[24, 24]}>
            {accountsModules.map((mod, idx) => (
              <Col key={mod.title} xs={24} md={12} lg={8}>
                <ScrollReveal animation="fade-in-up" delay={idx * 60}>
                  <div className="card-hover" style={{
                    padding: 28, borderRadius: 16, background: '#FFFFFF',
                    borderLeft: `4px solid ${mod.accent}`,
                    boxShadow: '0 8px 32px rgba(10, 17, 40, 0.02)',
                    height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 10,
                          background: 'rgba(10,17,40,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12.5, fontWeight: 900, color: mod.accent,
                        }}>
                          {mod.code}
                        </div>
                        <Tag color={mod.accent === '#FF6D00' ? 'orange' : 'purple'} style={{ borderRadius: 8, fontWeight: 700 }}>
                          {mod.tag}
                        </Tag>
                      </div>
                      <h4 style={{ fontWeight: 800, color: '#0A1128', marginBottom: 10, fontSize: 15.5 }}>{mod.title}</h4>
                      <p style={{ color: 'rgba(10, 17, 40, 0.6)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>{mod.desc}</p>
                    </div>

                    <div style={{
                      borderTop: '1px solid rgba(10,17,40,0.06)', paddingTop: 16,
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      {mod.features.map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'rgba(10,17,40,0.7)' }}>
                          <span style={{ color: mod.accent, fontWeight: 900 }}>•</span>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── 3. GST Compliance ── */}
      <section style={{ background: '#FFFFFF', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-down">
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 12, letterSpacing: '-1px' }}>
              GST & Compliance Forms Native Support
            </h2>
            <p style={{ color: 'rgba(10, 17, 40, 0.55)', marginBottom: 36, fontSize: 14.5 }}>
              SAPTTA generates compliance files natively, eliminating third-party reconciliation errors.
            </p>
          </ScrollReveal>
          
          <ScrollReveal animation="scale-in">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {['GSTR-1 Reports Filing Support', 'GSTR-2A Auto-recon Grids', 'GSTR-3B Tax Calculations Support', 'E-Invoice API Connectivity', 'E-Way Bill Generator Bridges', 'Reconciliation Audit Files'].map(item => (
                <span key={item} className="card-hover" style={{
                  padding: '10px 20px', borderRadius: 8, cursor: 'default',
                  background: '#FAFAFC', border: '1px solid rgba(10,17,40,0.06)',
                  fontSize: 13.5, fontWeight: 600, color: '#0A1128',
                  transition: 'all 0.2s ease',
                }}>
                  {item}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <CTABanner
        title="Consolidate Financial Registers"
        subtitle="Schedule a consultation with our system integration architects to reconcile corporate banking records securely."
      />
    </div>
  );
}
