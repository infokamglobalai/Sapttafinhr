import { useState } from 'react';
import { Row, Col, Button } from 'antd';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import useBreakpoint from '../hooks/useBreakpoint';

export default function About() {
  const { isMobile } = useBreakpoint();
  const [activeFlow, setActiveFlow] = useState<'hrms' | 'payroll' | 'accounts'>('hrms');
  const [visualizerKey, setVisualizerKey] = useState(0);

  const flowNotes = {
    hrms: {
      title: 'Core HRMS Roster Coordinates',
      accent: '#FF6D00',
      desc: 'Attendance logs captured via localized geofences and mobile biometrics sync in real-time to eliminate manual payroll timesheet reconciliation.',
      steps: ['Geofence boundary check', 'Mobile biometric signature verified', 'Roster shift overtime synced'],
    },
    payroll: {
      title: 'Active Payroll Statutory Engine',
      accent: '#8A2BE2',
      desc: 'Indian tax compliance core automatically extracts shift overtime and processes PF, ESI, and TDS withholdings with zero discrepancies.',
      steps: ['Statutory PF deductions calculated', 'ESI contributions computed', 'TDS tax withholding validated'],
    },
    accounts: {
      title: 'GST Ledger Invoicing & Reconciliation',
      accent: '#00C853',
      desc: 'All completed payroll disbursements and sales invoices automatically generate double-entry ledger bookings compliant with Indian accounting standards.',
      steps: ['SGST / CGST localized matching', 'Double-entry ledger registered', 'Razorpay matching sync updated'],
    },
  };

  const handleTabChange = (flow: 'hrms' | 'payroll' | 'accounts') => {
    setActiveFlow(flow);
    setVisualizerKey(prev => prev + 1);
  };

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>
      {/* Page Header */}
      <section className={`marketing-hero${isMobile ? ' marketing-hero--stacked' : ''}`} style={{ background: 'linear-gradient(135deg, #FFF8F0 0%, #F5F3FF 50%, #FFFFFF 100%)', paddingTop: 88 }}>
        <div className="marketing-hero__inner marketing-hero__inner--split">
          <ScrollReveal animation="fade-in-left">
            <HomeSectionHeader
              eyebrow="About Saptta"
              title="HR & Finance"
              titleHighlight="built for India"
              subtitle="Unified workforce operations and automated statutory bookkeeping — honest data, no placeholder metrics."
              align="left"
              theme="navy"
              isMobile={isMobile}
              maxWidth={480}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-right">
            <MarketingImageFrame imageKey="aboutOffice" variant="split" aspect="16/10" />
          </ScrollReveal>
        </div>
      </section>

      {/* ── 1. The Operations Paradigm Shift ── */}
      <section style={{ padding: '80px 24px', background: '#FFFFFF', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[56, 44]} align="middle">
            {/* Thesis Text */}
            <Col xs={24} lg={11}>
              <ScrollReveal animation="fade-in-left">
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,109,0,0.06)', border: '1px solid rgba(255,109,0,0.18)',
                  borderRadius: 24, padding: '6px 16px', marginBottom: 20,
                }}>
                  <span style={{ color: '#FF6D00', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>
                    THE OPERATIONAL PROBLEM
                  </span>
                </div>
                <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.25 }}>
                  Legacy software tools<br/>make business fractured.
                </h2>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 18 }}>
                  Stitching together siloed HR databases, manual attendance registers, standalone Excel sheets, and disconnected tax invoices introduces human calculation errors and compliance slip-ups.
                </p>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 28 }}>
                  <strong>SAPTTA</strong> was built to solve this. By integrating real-time personnel tracking, Indian statutory payroll calculators, and double-entry accounting files, data flows seamlessly from operations straight into your balance sheet.
                </p>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#0A1128', fontWeight: 700 }}>
                    <span style={{ color: '#FF6D00', fontWeight: 900 }}>✓</span> 100% Honest Data
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#0A1128', fontWeight: 700 }}>
                    <span style={{ color: '#8A2BE2', fontWeight: 900 }}>✓</span> Indian Statutory Native
                  </div>
                </div>
              </ScrollReveal>
            </Col>

            <Col xs={24} lg={13}>
              <ScrollReveal animation="fade-in-right">
                <div style={{ marginBottom: 20 }}>
                  <MarketingImageFrame imageKey="aboutTeam" variant="glass" aspect="21/9" />
                </div>
                <div style={{
                  background: '#FAFAFC', border: '1.5px solid rgba(255,109,0,0.15)',
                  borderRadius: 24, padding: 32, boxShadow: '0 16px 48px rgba(10,17,40,0.03)',
                }}>
                  <h4 style={{ fontWeight: 800, fontSize: 16, color: '#0A1128', marginBottom: 16 }}>
                    Interactive Operations Visualizer
                  </h4>
                  <p style={{ fontSize: 12.5, color: 'rgba(10,17,40,0.5)', marginBottom: 24 }}>
                    Click a core module to simulate how active personnel data reconciles into statutory ledger accounts.
                  </p>

                  {/* Node Buttons */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                    <Button
                      style={{
                        flex: 1, height: 48, borderRadius: 10, fontWeight: 700, fontSize: 13,
                        background: activeFlow === 'hrms' ? 'rgba(255,109,0,0.08)' : '#FFFFFF',
                        borderColor: activeFlow === 'hrms' ? '#FF6D00' : 'rgba(10,17,40,0.08)',
                        color: activeFlow === 'hrms' ? '#FF6D00' : '#0A1128',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => handleTabChange('hrms')}
                      className="card-hover"
                    >
                      HRMS Sync
                    </Button>
                    <Button
                      style={{
                        flex: 1, height: 48, borderRadius: 10, fontWeight: 700, fontSize: 13,
                        background: activeFlow === 'payroll' ? 'rgba(138,43,226,0.08)' : '#FFFFFF',
                        borderColor: activeFlow === 'payroll' ? '#8A2BE2' : 'rgba(10,17,40,0.08)',
                        color: activeFlow === 'payroll' ? '#8A2BE2' : '#0A1128',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => handleTabChange('payroll')}
                      className="card-hover"
                    >
                      Payroll Engine
                    </Button>
                    <Button
                      style={{
                        flex: 1, height: 48, borderRadius: 10, fontWeight: 700, fontSize: 13,
                        background: activeFlow === 'accounts' ? 'rgba(0,200,83,0.08)' : '#FFFFFF',
                        borderColor: activeFlow === 'accounts' ? '#00C853' : 'rgba(10,17,40,0.08)',
                        color: activeFlow === 'accounts' ? '#00C853' : '#0A1128',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => handleTabChange('accounts')}
                      className="card-hover"
                    >
                      GST Ledger
                    </Button>
                  </div>

                  {/* Flow Output Block - Plays beautiful slide up each trigger */}
                  <div key={visualizerKey} className="chat-message-reveal" style={{
                    background: '#FFFFFF', border: `1.5px solid ${flowNotes[activeFlow].accent}1A`,
                    borderRadius: 16, padding: 22,
                    boxShadow: '0 8px 24px rgba(10,17,40,0.02)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: flowNotes[activeFlow].accent,
                        animation: 'logoBgPulse 2s infinite',
                      }} />
                      <h5 style={{ margin: 0, fontWeight: 800, fontSize: 14.5, color: '#0A1128' }}>
                        {flowNotes[activeFlow].title}
                      </h5>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(10,17,40,0.6)', lineHeight: 1.6, marginBottom: 16 }}>
                      {flowNotes[activeFlow].desc}
                    </p>
                    
                    {/* Cascading Step checkmarks */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {flowNotes[activeFlow].steps.map((step, idx) => (
                        <div key={idx} className="animate-row" style={{
                          display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 600, color: '#0A1128',
                          animationDelay: `${idx * 0.08}s`,
                        }}>
                          <span style={{ color: flowNotes[activeFlow].accent, fontWeight: 900 }}>•</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── 2. Our Core Architectural Convictions ── */}
      <section style={{ padding: '80px 24px', background: '#FAFAFC', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <ScrollReveal animation="fade-in-down">
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 10, letterSpacing: '-1px' }}>
                Core Operational Convictions
              </h2>
              <p style={{ color: 'rgba(10, 17, 40, 0.55)', fontSize: '1.05rem', fontWeight: 500 }}>
                The foundational principles driving every component we assemble.
              </p>
            </ScrollReveal>
          </div>

          <Row gutter={[24, 24]}>
            {[
              {
                title: 'Factual Accuracy (No Dummy Data)',
                desc: 'We reject standard placeholder templates. Every metric, calculation run, geofence parameters list, and statutory ledger invoice is engineered using factual formulas, providing honest, accurate insight.',
                accent: '#FF6D00',
              },
              {
                title: 'Indian Statutory Core',
                desc: 'Natively structured to automate local compliances (CGST, SGST, IGST, Employee PF contributions, ESI registers, Professional Tax schedules, and localized salary TDS brackets). No manual workarounds.',
                accent: '#8A2BE2',
              },
              {
                title: 'AWS Cryptographic Vaults',
                desc: 'Employee biometric fingerprints, GPS roster punch coordinates, and company financial accounts books are protected using strict AWS KMS key management infrastructure and secure geofenced whitelists.',
                accent: '#FF6D00',
              },
              {
                title: 'Decentralized Architecture',
                desc: 'Allow your field personnel to claim expenses, download official salary payslips, and check shifts schedules directly from our secure iOS and Android mobile app, reducing office friction.',
                accent: '#8A2BE2',
              },
            ].map((conv, i) => (
              <Col key={conv.title} xs={24} md={12}>
                <ScrollReveal animation="fade-in-up" delay={i * 80}>
                  <div className="card-hover" style={{
                    padding: 32, borderRadius: 16, background: '#FFFFFF',
                    borderLeft: `4px solid ${conv.accent}`,
                    boxShadow: '0 8px 32px rgba(10,17,40,0.02)',
                    height: '100%',
                  }}>
                    <h4 style={{ fontWeight: 800, color: '#0A1128', marginBottom: 12, fontSize: 16 }}>{conv.title}</h4>
                    <p style={{ color: 'rgba(10, 17, 40, 0.6)', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{conv.desc}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── 2.5 The Journey / Timeline ── */}
      <section style={{ padding: '80px 24px', background: '#FFFFFF', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-down">
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 10, letterSpacing: '-1px' }}>
                Our Journey & Milestones
              </h2>
              <p style={{ color: 'rgba(10, 17, 40, 0.55)', fontSize: '1.05rem', fontWeight: 500 }}>
                How we built a unified accounting and workforce ecosystem for India.
              </p>
            </div>
          </ScrollReveal>

          <div className="about-timeline">
            {[
              {
                year: '2024',
                title: 'Saptta Founded',
                desc: 'Launched in Mumbai to tackle the fragmented, manual payroll and bookkeeping systems used by mid-market Indian enterprises.',
              },
              {
                year: '2025',
                title: 'AI Audits Release',
                desc: 'Introduced the automated PF, ESI, and salary TDS discrepancy checking engine, saving finance directors days of manual reconciliation.',
              },
              {
                year: '2026',
                title: 'Unified Ledger Sync',
                desc: 'Achieved true end-to-end integration: payroll runs post directly to double-entry ledger books and generate GSTR-ready records.',
              },
            ].map((milestone, idx) => (
              <div key={idx} className="about-timeline-item">
                <div className="about-timeline-badge">{milestone.year}</div>
                <div className="about-timeline-card">
                  <h4 style={{ fontWeight: 800, color: '#0A1128', fontSize: 16, marginBottom: 8 }}>
                    {milestone.title}
                  </h4>
                  <p style={{ color: 'rgba(10, 17, 40, 0.6)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                    {milestone.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Technology Architecture Stack ── */}
      <section style={{ padding: '80px 24px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-down">
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 14, letterSpacing: '-1px' }}>
              Technology Architecture
            </h2>
            <p style={{ color: 'rgba(10, 17, 40, 0.55)', fontSize: 14.5, lineHeight: 1.7, maxWidth: 650, margin: '0 auto 48px' }}>
              Our underlying engine is structured for sub-second database transactions, absolute data privacy, and modern high-concurrency client rendering.
            </p>
          </ScrollReveal>

          <Row gutter={[20, 20]}>
            {[
              { code: 'UI', accentColor: '#FF6D00', title: 'Vite & React 18 Core', desc: 'Provides instant UI loads, smooth page state changes, and premium interactive components.' },
              { code: 'CL', accentColor: '#8A2BE2', title: 'AWS Cloud Hosting', desc: 'Secure encryption protocols with automatic hourly databases snapshots.' },
              { code: 'KM', accentColor: '#FF6D00', title: 'AWS KMS Cryptography', desc: 'Secures your billing invoices ledger files and personnel biometrics logs.' },
              { code: 'RP', accentColor: '#8A2BE2', title: 'Razorpay API Bridging', desc: 'Natively processes localized business transactions and automatically balances records.' },
            ].map((tech, idx) => (
              <Col key={tech.title} xs={24} sm={12}>
                <ScrollReveal animation="scale-in" delay={idx * 60}>
                  <div className="card-hover" style={{
                    padding: 24, borderRadius: 14, background: '#FAFAFC',
                    border: '1px solid rgba(10,17,40,0.06)', textAlign: 'left',
                    display: 'flex', gap: 16, alignItems: 'center', height: '100%',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: 'rgba(10,17,40,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12.5, fontWeight: 900, color: tech.accentColor, flexShrink: 0
                    }}>
                      {tech.code}
                    </div>
                    <div>
                      <h5 style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: 14.5, color: '#0A1128' }}>{tech.title}</h5>
                      <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(10,17,40,0.52)', lineHeight: 1.55 }}>{tech.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <CTABanner
        title="Schedule System Architecture Consultation"
        subtitle="Let our enterprise architects layout a clean migration strategy for your legacy databases."
      />
    </div>
  );
}
