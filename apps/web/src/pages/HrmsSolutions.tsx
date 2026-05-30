import { useState } from 'react';
import { Row, Col, Tag, Button } from 'antd';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';

const hrmsModules = [
  { code: 'ED', title: 'Employee Directory & Masters', tag: 'Core Operations', accent: '#FF6D00',
    desc: 'Centralized database coordinating shift histories, statutory documents, and secure contract records.',
    features: ['Comprehensive employee dossiers', 'Digital corporate ID card generator', 'Custom department & roster assignments'] },
  { code: 'GF', title: 'Geofence Attendance Sync', tag: 'Personnel Tracking', accent: '#8A2BE2',
    desc: 'Capture shift punches natively using mobile GPS boundaries, whitelisted office networks, and biometric logs.',
    features: ['GPS boundary geo-matching', 'Whitelisted IP punch filters', 'Automated shift overtime calculations'] },
  { code: 'LL', title: 'Statutory Leave Ledger', tag: 'Core Operations', accent: '#FF6D00',
    desc: 'Complete leave accruals and approvals directly synced with Indian statutory payroll calculations.',
    features: ['Custom leave balance definitions', 'Multi-level approval rosters', 'Official holiday calendar bounds'] },
  { code: 'CP', title: 'Active Compliance Payroll', tag: 'Statutory Core', accent: '#8A2BE2',
    desc: 'Indian payroll runs calculated instantly with automated PF, ESI, TDS computations and direct payslips.',
    features: ['Statutory PF & ESI computations', 'Salary TDS withholding grids', 'Automated Indian tax form generators'] },
  { code: 'RO', title: 'Recruitment & Onboarding', tag: 'Advanced Tools', accent: '#FF6D00',
    desc: 'Consolidate applicant databases, interview rosters, and candidate background checks in one platform.',
    features: ['Custom onboarding checklist runs', 'Applicant tracking schedules', 'Automated employment offer generators'] },
  { code: 'AM', title: 'Appraisal & Goal Modules', tag: 'Advanced Tools', accent: '#8A2BE2',
    desc: 'Establish clear workplace objectives, audit employee performance metrics, and review statutory feedback logs.',
    features: ['Direct employee performance audits', 'Operational goal mapping trackers', 'Structured review cycle registries'] },
];

export default function HrmsSolutions() {
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');
  const [rosterKey, setRosterKey] = useState(0);

  const handleShiftChange = (shift: 'day' | 'night') => {
    setSelectedShift(shift);
    setRosterKey(prev => prev + 1);
  };

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-orange" style={{ width: 450, height: 450, top: -160, left: -100, opacity: 0.08 }} />
        <div className="orb-purple" style={{ width: 450, height: 450, bottom: -160, right: -100, opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 5 }}>
          <ScrollReveal animation="fade-in-down">
            <h1 style={{ letterSpacing: '-1.5px', fontWeight: 900 }}>Enterprise-Grade HRMS Solutions</h1>
            <p style={{ color: 'rgba(10,17,40,0.6)', fontWeight: 500 }}>
              Unified workforce directories, localized geofence attendance, and automated Indian compliance.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* ── 1. The Interactive Shift Roster Visualizer ── */}
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
                    ACTIVE SYSTEM COCKPIT
                  </span>
                </div>
                <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.25 }}>
                  Coordinate personnel shifts<br/>with zero friction.
                </h2>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 18 }}>
                  Stop using manually compiled worksheets. SAPTTA links shift roster schedules directly to active geolocation punch whitelists and statutory ESI/PF payroll ledgers.
                </p>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 28 }}>
                  Employees check-in securely using mobile biometrics. The compliance core automatically audits late punches, computes statutory overtime rates, and updates payroll cards.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    style={{
                      borderRadius: 8, height: 44, fontWeight: 700,
                      background: selectedShift === 'day' ? 'rgba(255,109,0,0.08)' : '#FFFFFF',
                      borderColor: selectedShift === 'day' ? '#FF6D00' : 'rgba(10,17,40,0.08)',
                      color: selectedShift === 'day' ? '#FF6D00' : '#0A1128',
                      transition: 'all 0.25s ease',
                    }}
                    onClick={() => handleShiftChange('day')}
                    className="card-hover"
                  >
                    ☀️ Day Shift Config
                  </Button>
                  <Button
                    style={{
                      borderRadius: 8, height: 44, fontWeight: 700,
                      background: selectedShift === 'night' ? 'rgba(138,43,226,0.08)' : '#FFFFFF',
                      borderColor: selectedShift === 'night' ? '#8A2BE2' : 'rgba(10,17,40,0.08)',
                      color: selectedShift === 'night' ? '#8A2BE2' : '#0A1128',
                      transition: 'all 0.25s ease',
                    }}
                    onClick={() => handleShiftChange('night')}
                    className="card-hover"
                  >
                    🌙 Night Shift Config
                  </Button>
                </div>
              </ScrollReveal>
            </Col>

            {/* Interactive Shift Roster Widget */}
            <Col xs={24} lg={13}>
              <ScrollReveal animation="fade-in-right">
                <div style={{
                  background: '#FAFAFC', border: '1.5px solid rgba(255,109,0,0.15)',
                  borderRadius: 24, padding: 32, boxShadow: '0 16px 48px rgba(10,17,40,0.03)',
                }}>
                  <h4 style={{ fontWeight: 800, fontSize: 16, color: '#0A1128', marginBottom: 16 }}>
                    Roster Operations Status
                  </h4>
                  
                  <div style={{
                    background: '#FFFFFF', borderRadius: 16, padding: 20,
                    border: '1px solid rgba(10,17,40,0.06)', marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(10,17,40,0.45)' }}>Active Roster Period</span>
                      <Tag color={selectedShift === 'day' ? 'orange' : 'purple'} style={{ fontWeight: 700 }}>
                        {selectedShift === 'day' ? 'DAY BOUND: 09:00 - 18:00' : 'NIGHT BOUND: 21:00 - 06:00'}
                      </Tag>
                    </div>
                    
                    {/* Shift list rows cascade with slide animations */}
                    <div key={rosterKey} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { name: 'Employee #1', loc: 'Main Office 📍', verify: 'Verified GPS ✓', status: 'On Time 🟢' },
                        { name: 'Employee #2', loc: 'Branch Office 📍', verify: 'Verified Geofence ✓', status: 'On Time 🟢' },
                        { name: 'Employee #3', loc: 'Field Operations 📍', verify: 'Biometric Verified ✓', status: selectedShift === 'day' ? 'On Time 🟢' : 'Overtime Logged ⚡' },
                      ].map((emp, idx) => (
                        <div
                          key={emp.name}
                          className="animate-row"
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontSize: 12.5, paddingBottom: 8, borderBottom: '1px solid rgba(10,17,40,0.04)',
                            animationDelay: `${idx * 0.08}s`,
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0A1128' }}>{emp.name}</strong>
                            <span style={{ color: 'rgba(10,17,40,0.4)', marginLeft: 8 }}>{emp.loc}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <span style={{ color: '#00C853', fontWeight: 600 }}>{emp.verify}</span>
                            <span style={{ color: '#0A1128', fontWeight: 700 }}>{emp.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(52, 199, 89, 0.05)', border: '1px solid rgba(52, 199, 89, 0.2)',
                    borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 12.5, color: '#2b8a3e', fontWeight: 600 }}>
                      ✓ Biometrics Secured: Localized GPS boundaries audited dynamically.
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
                Built-In HRMS Modules
              </h2>
              <p style={{ color: 'rgba(10, 17, 40, 0.55)', fontSize: '1.05rem', fontWeight: 500 }}>
                Highly tailored modules coordinating shifts, leaves, and compliance registers.
              </p>
            </ScrollReveal>
          </div>

          <Row gutter={[24, 24]}>
            {hrmsModules.map((mod, idx) => (
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

      {/* ── 3. Indian Compliance Built-In ── */}
      <section style={{ background: '#FFFFFF', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-down">
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 12, letterSpacing: '-1px' }}>
              100% Indian Statutory Native Core
            </h2>
            <p style={{ color: 'rgba(10, 17, 40, 0.55)', marginBottom: 36, fontSize: 14.5 }}>
              SAPTTA processes employee salaries and rosters in complete compliance with Indian labour regulations.
            </p>
          </ScrollReveal>
          
          <ScrollReveal animation="scale-in">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {['Employee EPF Registers', 'ESI Hospital Allocation', 'Salary TDS Calculations', 'Professional Tax Registers', 'Labour Welfare Funds (LWF)', 'Form 16 Tax Filings', 'POSH Compliance Registers'].map(item => (
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
        title="Automate Employee Operations"
        subtitle="Schedule a consultation with our operations specialists to migrate your workforce records securely."
      />
    </div>
  );
}
