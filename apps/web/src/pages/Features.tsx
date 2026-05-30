import { useState } from 'react';
import { Row, Col, Table, Tag, Button } from 'antd';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';

const check = <span style={{ color: '#FF6D00', fontWeight: 900, fontSize: 13 }}>YES</span>;
const cross = <span style={{ color: 'rgba(10, 17, 40, 0.25)', fontWeight: 500, fontSize: 13 }}>—</span>;

const featureCategories = [
  { category: 'HRMS — Employee Coordinates', features: [
    { name: 'Employee Master Database', s: true, p: true, e: true },
    { name: 'Digital Employee ID Cards', s: true, p: true, e: true },
    { name: 'Employee Self Service Portal', s: false, p: true, e: true },
    { name: 'Document Management Vaults', s: false, p: true, e: true },
  ]},
  { category: 'HRMS — Attendance Punching', features: [
    { name: 'Biometric Integration', s: false, p: true, e: true },
    { name: 'Mobile Attendance (Geofenced GPS)', s: true, p: true, e: true },
    { name: 'Shift & Roster Management', s: false, p: true, e: true },
    { name: 'Overtime & Late calculations', s: true, p: true, e: true },
  ]},
  { category: 'HRMS — Statutory Payroll', features: [
    { name: 'Salary Processing Engines', s: true, p: true, e: true },
    { name: 'PF & ESI Management', s: true, p: true, e: true },
    { name: 'Salary TDS calculations', s: false, p: true, e: true },
    { name: 'Loan & Advance Ledgers', s: false, p: true, e: true },
  ]},
  { category: 'Accounts — Bookkeeping', features: [
    { name: 'GST Compliant Invoicing', s: true, p: true, e: true },
    { name: 'General Ledger & Journal Balancing', s: true, p: true, e: true },
    { name: 'Bank Statement Reconciler', s: true, p: true, e: true },
    { name: 'Expense & Reimbursements Auditing', s: true, p: true, e: true },
  ]},
  { category: 'Accounts — Compliance Core', features: [
    { name: 'Inventory Asset Stock registers', s: false, p: true, e: true },
    { name: 'GST Return Support (GSTR-1, GSTR-3B)', s: false, p: true, e: true },
    { name: 'Multi-Branch & Multi-Company Accounts', s: false, p: false, e: true },
    { name: 'Tally integration export bridges', s: false, p: false, e: true },
  ]},
];

type TableRow = { key: string; name: React.ReactNode; s: React.ReactNode; p: React.ReactNode; e: React.ReactNode };

const columns = [
  { title: 'Feature Parameter', dataIndex: 'name', key: 'name', width: '45%' },
  { title: 'Starter Plan', dataIndex: 's', key: 's', align: 'center' as const },
  { title: 'Professional Plan', dataIndex: 'p', key: 'p', align: 'center' as const },
  { title: 'Enterprise Plan', dataIndex: 'e', key: 'e', align: 'center' as const },
];

function buildRows(): TableRow[] {
  const rows: TableRow[] = [];
  featureCategories.forEach(cat => {
    rows.push({
      key: cat.category,
      name: (
        <div style={{
          background: 'rgba(255, 109, 0, 0.06)', borderRadius: 6, padding: '6px 12px',
          fontWeight: 700, color: '#FF6D00', fontSize: 12, borderLeft: '3px solid #FF6D00',
        }}>
          {cat.category}
        </div>
      ),
      s: '', p: '', e: '',
    });
    cat.features.forEach(f => {
      rows.push({
        key: f.name,
        name: <span style={{ fontSize: 13, color: '#0A1128', paddingLeft: 12, display: 'inline-block' }}>{f.name}</span>,
        s: f.s ? check : cross,
        p: f.p ? check : cross,
        e: f.e ? check : cross,
      });
    });
  });
  return rows;
}

export default function Features() {
  /* Interactive Plan State */
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [planKey, setPlanKey] = useState(0);

  const planHighlights = {
    starter: {
      title: 'Starter Operational Plan',
      desc: 'Perfect for small Indian startups establishing basic compliance registries.',
      limit: 'Up to 50 active workforce rosters',
      core: ['Geofenced Mobile Attendance', 'EPF & ESI Salary Deductions', 'Double-entry General Ledger', 'Razorpay API matching'],
      accent: '#FF6D00',
    },
    professional: {
      title: 'Professional Operational Plan',
      desc: 'Optimized for scaling Indian companies requiring full compliance automation.',
      limit: 'Up to 500 active workforce rosters',
      core: ['Biometric Punch Integrations', 'Statutory TDS Salary calculations', 'GST Returns generation', 'Automated statement matching'],
      accent: '#8A2BE2',
    },
    enterprise: {
      title: 'Enterprise Operational Plan',
      desc: 'Tailored for large organizations operating multiple branches under one framework.',
      limit: 'Unlimited active workforce rosters',
      core: ['Multi-company accounts consolidations', 'Custom API integration bridges', 'Claude AI HR support', 'Dedicated database whitelists'],
      accent: '#00C853',
    },
  };

  const handlePlanChange = (tier: 'starter' | 'professional' | 'enterprise') => {
    setSelectedPlan(tier);
    setPlanKey(prev => prev + 1);
  };

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-orange" style={{ width: 450, height: 450, top: -160, left: -100, opacity: 0.08 }} />
        <div className="orb-purple" style={{ width: 450, height: 450, bottom: -160, right: -100, opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 5 }}>
          <ScrollReveal animation="fade-in-down">
            <h1>System Capabilities Index</h1>
            <p style={{ color: 'rgba(10,17,40,0.6)', fontWeight: 500 }}>
              Compare functional features, active payroll thresholds, and statutory ledger limits.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* ── 1. The Interactive Plan Simulator ── */}
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
                    FUNCTIONAL DEPLOYMENT SIZES
                  </span>
                </div>
                <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.25 }}>
                  Choose the scope that<br/>fits your operational scale.
                </h2>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 18 }}>
                  SAPTTA scales dynamically from newly-established offices to high-volume factories operating multiple branch networks under one workspace.
                </p>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 28 }}>
                  Every tier contains our 100% factual double-entry ledger database. Select a scope below to review active capabilities.
                </p>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {['starter', 'professional', 'enterprise'].map((tier) => (
                    <Button
                      key={tier}
                      style={{
                        flex: 1, height: 44, borderRadius: 8, fontWeight: 700, textTransform: 'capitalize',
                        background: selectedPlan === tier ? 'rgba(255,109,0,0.08)' : '#FFFFFF',
                        borderColor: selectedPlan === tier ? '#FF6D00' : 'rgba(10,17,40,0.08)',
                        color: selectedPlan === tier ? '#FF6D00' : '#0A1128',
                        transition: 'all 0.25s ease',
                      }}
                      onClick={() => handlePlanChange(tier as any)}
                      className="card-hover"
                    >
                      {tier} Scope
                    </Button>
                  ))}
                </div>
              </ScrollReveal>
            </Col>

            {/* Interactive plan card */}
            <Col xs={24} lg={13}>
              <ScrollReveal animation="fade-in-right">
                <div key={planKey} className="chat-message-reveal" style={{
                  background: '#FAFAFC', border: `1.5px solid ${planHighlights[selectedPlan].accent}33`,
                  borderRadius: 24, padding: 32, boxShadow: '0 16px 48px rgba(10,17,40,0.03)',
                }}>
                  <h4 style={{ fontWeight: 800, fontSize: 16, color: '#0A1128', marginBottom: 12 }}>
                    {planHighlights[selectedPlan].title}
                  </h4>
                  <p style={{ fontSize: 13.5, color: 'rgba(10,17,40,0.6)', lineHeight: 1.6, marginBottom: 18 }}>
                    {planHighlights[selectedPlan].desc}
                  </p>

                  <div style={{
                    background: '#FFFFFF', border: '1px solid rgba(10,17,40,0.06)',
                    borderRadius: 14, padding: 18, marginBottom: 18,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 12 }}>
                      <span style={{ color: 'rgba(10,17,40,0.45)', fontWeight: 700 }}>ACTIVE ROSTER LIMIT</span>
                      <strong style={{ color: planHighlights[selectedPlan].accent }}>{planHighlights[selectedPlan].limit}</strong>
                    </div>
                    
                    <div style={{ height: 1, background: 'rgba(10,17,40,0.06)', margin: '8px 0' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {planHighlights[selectedPlan].core.map((c, i) => (
                        <div
                          key={c}
                          className="animate-row"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#0A1128',
                            animationDelay: `${i * 0.08}s`
                          }}
                        >
                          <span style={{ color: planHighlights[selectedPlan].accent, fontWeight: 900 }}>•</span>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#FF6D00', fontWeight: 700 }}>
                    ✓ Strictly isolated secure databases whitelisting.
                  </div>
                </div>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── 2. The Features Comparison Table ── */}
      <section style={{ padding: '80px 24px', background: '#FAFAFC' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <ScrollReveal animation="fade-in-down">
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 10, letterSpacing: '-1px' }}>
                Statutory Parameter Index
              </h2>
              <p style={{ color: 'rgba(10,17,40,0.55)', fontSize: 14.5 }}>
                Compare capabilities parameters across Starter, Professional, and Enterprise structures.
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="scale-in">
            <Table
              columns={columns}
              dataSource={buildRows()}
              pagination={false}
              size="middle"
              style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(10,17,40,0.08)', boxShadow: '0 8px 32px rgba(10,17,40,0.02)' }}
              rowKey="key"
            />
          </ScrollReveal>
        </div>
      </section>

      <CTABanner
        title="Explore Operations Matrices"
        subtitle="Schedule a consultation with our system integration architects to evaluate custom enterprise plans."
      />
    </div>
  );
}
