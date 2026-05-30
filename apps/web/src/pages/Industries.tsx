import { useState } from 'react';
import { Row, Col, Button } from 'antd';
import { Link } from 'react-router-dom';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';
import industriesData from '../data/industries-data';

const industries = industriesData.map(i => ({
  code: i.code,
  title: i.title,
  accent: i.accent,
  slug: i.slug,
  desc: i.overview.slice(0, 120) + '…',
  useCases: i.useCases.slice(0, 3),
}));

export default function Industries() {
  /* Interactive Sector Configuration State */
  const [selectedSector, setSelectedSector] = useState<'tech' | 'factory' | 'retail' | 'hospital'>('tech');
  const [sectorKey, setSectorKey] = useState(0);

  const sectorConfigs = {
    tech: {
      title: 'IT & Technology Framework',
      activeLabel: 'REMOTE ROSTERS VERIFIED ✓',
      statutory: ['Flexible roster shift limits', 'Whitelisted IP attendance punches', 'Automated project-based bonuses'],
      accent: '#FF6D00',
    },
    factory: {
      title: 'Manufacturing Compliance Framework',
      activeLabel: 'FACTORY EPF REGISTERS ACTIVE ✓',
      statutory: ['Contract labor statutory registers', 'Late punch deduction engines', 'Automated night-shift allowances'],
      accent: '#FF6D00',
    },
    retail: {
      title: 'Retail Store Operations Framework',
      activeLabel: 'COMMISSIONS LEDGER SYNCED ✓',
      statutory: ['Multi-branch store payroll grids', 'Store sales commissions calculator', 'Flexible part-time shift limits'],
      accent: '#FF6D00',
    },
    hospital: {
      title: 'Healthcare Shift Roster Framework',
      activeLabel: '24/7 ROSTERS ONLINE ✓',
      statutory: ['Rotating shift rosters configuration', 'Overtime statutory PF calculations', 'Dedicated credentials audits'],
      accent: '#FF6D00',
    },
  };

  const handleSectorChange = (key: 'tech' | 'factory' | 'retail' | 'hospital') => {
    setSelectedSector(key);
    setSectorKey(prev => prev + 1);
  };

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-orange" style={{ width: 450, height: 450, top: -160, left: -100, opacity: 0.08 }} />
        <div className="orb-purple" style={{ width: 450, height: 450, bottom: -160, right: -100, opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 5 }}>
          <ScrollReveal animation="fade-in-down">
            <h1>Tailored Sector Adaptations</h1>
            <p style={{ color: 'rgba(10,17,40,0.6)', fontWeight: 500 }}>
              Automating HRMS rosters and statutory double-entry accounting configurations across commercial sectors.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* ── 1. The Interactive Vertical Configurator ── */}
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
                    STATUTORY SECTOR PROFILES
                  </span>
                </div>
                <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.25 }}>
                  Custom operational parameters<br/>designed for your industry.
                </h2>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 18 }}>
                  Every sector operates under unique labor rules, shift patterns, and tax models. Our systems adapt dynamically without manual custom development.
                </p>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 28 }}>
                  Select an industry configuration below to review the custom compliance matrices deployed natively.
                </p>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { key: 'tech', label: 'IT Sector' },
                    { key: 'factory', label: 'Manufacturing' },
                    { key: 'retail', label: 'Retail & FMCG' },
                    { key: 'hospital', label: 'Healthcare' },
                  ].map(item => (
                    <Button
                      key={item.key}
                      style={{
                        borderRadius: 8, height: 44, fontWeight: 700,
                        background: selectedSector === item.key ? 'rgba(255,109,0,0.08)' : '#FFFFFF',
                        borderColor: selectedSector === item.key ? '#FF6D00' : 'rgba(10,17,40,0.08)',
                        color: selectedSector === item.key ? '#FF6D00' : '#0A1128',
                        transition: 'all 0.25s ease',
                      }}
                      onClick={() => handleSectorChange(item.key as any)}
                      className="card-hover"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </ScrollReveal>
            </Col>

            {/* Interactive Mockup Widget */}
            <Col xs={24} lg={13}>
              <ScrollReveal animation="fade-in-right">
                <div key={sectorKey} className="chat-message-reveal" style={{
                  background: '#FAFAFC', border: `1.5px solid ${sectorConfigs[selectedSector].accent}33`,
                  borderRadius: 24, padding: 32, boxShadow: '0 16px 48px rgba(10,17,40,0.03)',
                }}>
                  <h4 style={{ fontWeight: 800, fontSize: 16, color: '#0A1128', marginBottom: 14 }}>
                    Active Sector System Configuration
                  </h4>

                  <div style={{
                    background: '#FFFFFF', border: '1px solid rgba(10,17,40,0.06)',
                    borderRadius: 16, padding: 20, marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(10,17,40,0.45)' }}>Active Framework</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#00C853' }}>{sectorConfigs[selectedSector].activeLabel}</span>
                    </div>

                    <h5 style={{ fontSize: 14.5, fontWeight: 800, color: '#0A1128', marginBottom: 10 }}>
                      {sectorConfigs[selectedSector].title}
                    </h5>

                    <div style={{ height: 1, background: 'rgba(10,17,40,0.06)', margin: '8px 0 12px 0' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sectorConfigs[selectedSector].statutory.map((s, idx) => (
                        <div
                          key={s}
                          className="animate-row"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#0A1128',
                            animationDelay: `${idx * 0.08}s`
                          }}
                        >
                          <span style={{ color: sectorConfigs[selectedSector].accent, fontWeight: 900 }}>•</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#FF6D00', fontWeight: 700 }}>
                    ✓ Strictly compliant with Indian Ministry of Corporate Affairs regulations.
                  </div>
                </div>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── 2. The Industries Grid ── */}
      <section style={{ padding: '80px 24px', background: '#FAFAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <ScrollReveal animation="fade-in-down">
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 10, letterSpacing: '-1px' }}>
                Sectors Deployed
              </h2>
              <p style={{ color: 'rgba(10,17,40,0.55)', fontSize: '1.05rem', fontWeight: 500 }}>
                Tailored Indian statutory double-entry accounting configurations across commercial sectors.
              </p>
            </ScrollReveal>
          </div>

          <Row gutter={[20, 20]}>
            {industries.map((ind, i) => (
              <Col key={ind.title} xs={24} sm={12} md={8} lg={4}>
                <ScrollReveal animation="fade-in-up" delay={i * 60}>
                  <Link to={`/industries/${ind.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                    <div className="card-hover" style={{
                      padding: 20, borderRadius: 14, background: '#FFFFFF',
                      borderLeft: `4px solid ${ind.accent}`,
                      boxShadow: '0 8px 32px rgba(10, 17, 40, 0.02)',
                      height: '100%', cursor: 'pointer',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'rgba(10,17,40,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16, fontSize: 12.5, fontWeight: 900, color: ind.accent,
                      }}>
                        {ind.code}
                      </div>
                      <h4 style={{ fontWeight: 800, color: '#0A1128', marginBottom: 6, fontSize: 13.5 }}>{ind.title}</h4>
                      <p style={{ color: 'rgba(10, 17, 40, 0.6)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{ind.desc}</p>
                    </div>
                  </Link>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <CTABanner
        title="Schedule a Sector-Specific Consultation"
        subtitle="Let our enterprise architects layout a clean migration strategy for your legacy databases."
      />
    </div>
  );
}
