import { useState } from 'react';
import { Row, Col, Tag, Button } from 'antd';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';

const appFeatures = [
  { code: 'LG', title: 'Secure Employee Login', desc: 'Secure login credentials utilizing password auth and biometric verification signatures.', accent: '#FF6D00' },
  { code: 'GF', title: 'GPS Geofence Attendance', desc: 'Clock attendance punches natively using verified mobile geolocation boundaries.', accent: '#8A2BE2' },
  { code: 'LV', title: 'Mobile Leave Requests', desc: 'File leave requests directly from the field with automatic roster balance audits.', accent: '#FF6D00' },
  { code: 'PS', title: 'Direct PDF Payslips', desc: 'Download official tax payslips instantly. Access historical corporate disbursement logs.', accent: '#8A2BE2' },
  { code: 'AL', title: 'Instant Push Alerts', desc: 'Automated roster change updates, holiday alerts, and payroll run notifications.', accent: '#FF6D00' },
  { code: 'TK', title: 'Field Task Coordinate', desc: 'Assign and track personnel tasks. Synchronized with department operations.', accent: '#8A2BE2' },
  { code: 'AP', title: 'Manager Approvals Portal', desc: 'Authorize expense reimbursements and leave requests directly from the field.', accent: '#FF6D00' },
  { code: 'PV', title: 'Roster Pathing Verification', desc: 'Verify shift paths for mobile personnel with zero privacy workarounds.', accent: '#8A2BE2' },
];

export default function MobileApp() {
  /* Interactive Smartphone Simulator State */
  const [activeScreen, setActiveScreen] = useState<'punch' | 'leave' | 'payslip'>('punch');
  const [screenKey, setScreenKey] = useState(0);

  const screenDetails = {
    punch: { header: 'Punch Verification', status: 'Mumbai Factory Geofence', details: 'GPS check verified. Punch registered successfully. 🟢', accent: '#FF6D00' },
    leave: { header: 'Leave Application', status: 'Casual Leave Request', details: 'Balance audited: 4 days remaining. Submitted for approval ✓', accent: '#8A2BE2' },
    payslip: { header: 'Disbursement PDF Download', status: 'Payslip: April 2026', details: 'SGST / CGST pools balanced. PDF generated successfully. 📥', accent: '#00C853' },
  };

  const handleScreenChange = (screen: 'punch' | 'leave' | 'payslip') => {
    setActiveScreen(screen);
    setScreenKey(prev => prev + 1);
  };

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-orange" style={{ width: 450, height: 450, top: -160, left: -100, opacity: 0.08 }} />
        <div className="orb-purple" style={{ width: 450, height: 450, bottom: -160, right: -100, opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 5 }}>
          <ScrollReveal animation="fade-in-down">
            <h1 style={{ letterSpacing: '-1.5px', fontWeight: 900 }}>Localized Mobile HRMS App</h1>
            <p style={{ color: 'rgba(10,17,40,0.6)', fontWeight: 500 }}>
              Fluid, secure Android & iOS deployment for distributed field workforces.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* ── 1. The Interactive Smartphone Simulator ── */}
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
                    ACTIVE PERSONNEL COCKPIT
                  </span>
                </div>
                <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.25 }}>
                  Decentralize operations.<br/>Empower your field workforce.
                </h2>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 18 }}>
                  Stop relying on legacy attendance hardware or physical payslip distribution. SAPTTA delivers a lightweight, secure mobile client deployment.
                </p>
                <p style={{ color: 'rgba(10, 17, 40, 0.65)', fontSize: 14.5, lineHeight: 1.8, marginBottom: 28 }}>
                  Employees check rosters, log attendance inside verified geofences, file reimbursement receipts, and download statutory tax payslips directly from their pocket.
                </p>

                {/* Action buttons to trigger the phone screen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'punch', label: 'Verify Geofence Attendance Punch' },
                    { key: 'leave', label: 'File Leave Request Balance Audit' },
                    { key: 'payslip', label: 'Download Tax-Compliant PDF Payslip' },
                  ].map(item => (
                    <Button
                      key={item.key}
                      style={{
                        borderRadius: 8, height: 44, fontWeight: 700, textAlign: 'left',
                        background: activeScreen === item.key ? 'rgba(255,109,0,0.08)' : '#FFFFFF',
                        borderColor: activeScreen === item.key ? '#FF6D00' : 'rgba(10,17,40,0.08)',
                        color: activeScreen === item.key ? '#FF6D00' : '#0A1128',
                        transition: 'all 0.25s ease',
                      }}
                      onClick={() => handleScreenChange(item.key as any)}
                      className="card-hover"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </ScrollReveal>
            </Col>

            {/* Interactive Phone Simulator Widget */}
            <Col xs={24} lg={13}>
              <ScrollReveal animation="fade-in-right">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: 320, height: 560, borderRadius: 36, background: '#0A1128',
                    border: '12px solid #0A1128', boxShadow: '0 24px 64px rgba(10,17,40,0.15)',
                    position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  }}>
                    {/* Phone Notch */}
                    <div style={{
                      width: 140, height: 24, background: '#0A1128',
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      borderRadius: '0 0 16px 16px', zIndex: 10,
                    }} />

                    {/* Phone Screen Core */}
                    <div style={{
                      flex: 1, background: '#FAFAFC', padding: '36px 20px 20px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    }}>
                      {/* Header */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: 'rgba(10,17,40,0.4)' }}>SAPTTA MOBILE CLIENT</span>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759', animation: 'logoBgPulse 2s infinite' }} />
                        </div>

                        <div style={{
                          background: '#FFFFFF', borderRadius: 12, padding: 14,
                          border: '1px solid rgba(10,17,40,0.06)',
                          boxShadow: '0 4px 12px rgba(10,17,40,0.02)',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,17,40,0.45)', textTransform: 'uppercase', marginBottom: 6 }}>
                            Active Operations State
                          </div>
                          <strong style={{ fontSize: 14, color: '#0A1128', display: 'block', marginBottom: 4 }}>
                            Active Employee
                          </strong>
                          <span style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)' }}>Corporate Office</span>
                        </div>
                      </div>

                      {/* Dynamic Widget Screen with animated slide transition */}
                      <div key={screenKey} className="chat-message-reveal" style={{
                        background: '#FFFFFF', border: `1.5px solid ${screenDetails[activeScreen].accent}1A`,
                        borderRadius: 16, padding: 18,
                        boxShadow: '0 8px 24px rgba(10,17,40,0.02)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: screenDetails[activeScreen].accent, animation: 'logoBgPulse 1.5s infinite' }} />
                          <h5 style={{ margin: 0, fontWeight: 800, fontSize: 13, color: '#0A1128' }}>
                            {screenDetails[activeScreen].header}
                          </h5>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,17,40,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>
                          {screenDetails[activeScreen].status}
                        </div>
                        <p style={{ fontSize: 12, color: 'rgba(10,17,40,0.6)', lineHeight: 1.5, margin: 0 }}>
                          {screenDetails[activeScreen].details}
                        </p>
                      </div>

                      {/* Phone Footer Navigation with alphanumeric tabs */}
                      <div style={{
                        background: '#FFFFFF', borderRadius: 12, padding: '12px 14px',
                        border: '1px solid rgba(10,17,40,0.05)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <span style={{ color: activeScreen === 'punch' ? '#FF6D00' : 'rgba(10,17,40,0.3)', fontSize: 9.5, fontWeight: 900, letterSpacing: '0.8px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => handleScreenChange('punch')}>PUNCH</span>
                        <span style={{ color: activeScreen === 'leave' ? '#8A2BE2' : 'rgba(10,17,40,0.3)', fontSize: 9.5, fontWeight: 900, letterSpacing: '0.8px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => handleScreenChange('leave')}>LEAVE</span>
                        <span style={{ color: activeScreen === 'payslip' ? '#00C853' : 'rgba(10,17,40,0.3)', fontSize: 9.5, fontWeight: 900, letterSpacing: '0.8px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => handleScreenChange('payslip')}>PAYSLIP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── 2. The Features Grid ── */}
      <section style={{ padding: '80px 24px', background: '#FAFAFC', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <ScrollReveal animation="fade-in-down">
              <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 10, letterSpacing: '-1px' }}>
                Mobile HRMS Capabilities
              </h2>
              <p style={{ color: 'rgba(10, 17, 40, 0.55)', fontSize: '1.05rem', fontWeight: 500 }}>
                8 localized features bringing personnel rosters and statutory payroll records to their pocket.
              </p>
            </ScrollReveal>
          </div>

          <Row gutter={[20, 20]}>
            {appFeatures.map((f, i) => (
              <Col key={f.title} xs={24} sm={12} md={6}>
                <ScrollReveal animation="fade-in-up" delay={i * 60}>
                  <div className="card-hover" style={{
                    padding: 24, borderRadius: 14, background: '#FFFFFF',
                    borderLeft: `4px solid ${f.accent}`,
                    boxShadow: '0 8px 32px rgba(10, 17, 40, 0.02)',
                    height: '100%',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: 'rgba(10,17,40,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16, fontSize: 12.5, fontWeight: 900, color: f.accent,
                    }}>
                      {f.code}
                    </div>
                    <h4 style={{ fontWeight: 800, color: '#0A1128', marginBottom: 8, fontSize: 14.5 }}>{f.title}</h4>
                    <p style={{ color: 'rgba(10, 17, 40, 0.6)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── 3. Platform Integrations ── */}
      <section style={{ background: '#FFFFFF', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-down">
            <h2 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0A1128', marginBottom: 12, letterSpacing: '-1px' }}>
              Built for Enterprise Workforces
            </h2>
            <p style={{ color: 'rgba(10, 17, 40, 0.55)', marginBottom: 36, fontSize: 14.5 }}>
              Fluid deployment across all standard platforms and operating frameworks.
            </p>
          </ScrollReveal>
          
          <ScrollReveal animation="scale-in">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {['Official Android Google Play Client', 'Official Apple App Store Client', 'Offline Punch Caching Protocols', 'Native Device Biometrics Fingerprint / Face ID', 'Hindi & Regional Language Registers', 'Encrypted TLS 1.3 Socket Bridges'].map(item => (
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
        title="Deploy Mobile HRMS"
        subtitle="Schedule a consultation with our system integration architects to download secure test client packages."
      />
    </div>
  );
}
