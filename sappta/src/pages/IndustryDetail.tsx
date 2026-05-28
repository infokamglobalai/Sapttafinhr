import { useParams, Link, useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import industries from '../data/industries-data';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';

export default function IndustryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const industry = industries.find(i => i.slug === slug);

  if (!industry) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <h2 style={{ color: '#0A1128' }}>Industry not found</h2>
        <Button type="primary" onClick={() => navigate('/industries')} style={{ background: '#FF6D00', border: 'none' }}>
          Back to Industries
        </Button>
      </div>
    );
  }

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-orange" style={{ width: 450, height: 450, top: -160, left: -100, opacity: 0.08 }} />
        <div className="orb-purple" style={{ width: 450, height: 450, bottom: -160, right: -100, opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 5 }}>
          <ScrollReveal animation="fade-in-down">
            <Link
              to="/industries"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: industry.accent, marginBottom: 16, textDecoration: 'none' }}
            >
              ← All Industries
            </Link>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `${industry.accent}12`, border: `1px solid ${industry.accent}30`,
              borderRadius: 24, padding: '6px 16px', marginBottom: 20,
            }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: industry.accent, letterSpacing: '0.5px' }}>
                {industry.code} · INDUSTRY SOLUTIONS
              </span>
            </div>
            <h1 style={{ marginBottom: 12 }}>{industry.title}</h1>
            <p style={{ color: 'rgba(10,17,40,0.6)', fontWeight: 500, maxWidth: 560 }}>{industry.tagline}</p>
          </ScrollReveal>
        </div>
      </div>

      {/* ── Overview ── */}
      <section style={{ padding: '72px 24px', background: '#FFFFFF', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[56, 40]} align="middle">
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-left">
                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0A1128', letterSpacing: '-1px', marginBottom: 20 }}>
                  Built for the unique demands of {industry.title}.
                </h2>
                <p style={{ color: 'rgba(10,17,40,0.65)', fontSize: 14.5, lineHeight: 1.85 }}>{industry.overview}</p>
              </ScrollReveal>
            </Col>
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-right">
                <Row gutter={[16, 16]}>
                  {industry.stats.map(stat => (
                    <Col key={stat.label} xs={12}>
                      <div style={{
                        padding: '24px 20px', borderRadius: 14, background: '#FAFAFC',
                        border: `1.5px solid ${industry.accent}20`, textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '1.9rem', fontWeight: 900, color: industry.accent, lineHeight: 1 }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'rgba(10,17,40,0.55)', fontWeight: 600, marginTop: 6 }}>
                          {stat.label}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── Challenges ── */}
      <section style={{ padding: '72px 24px', background: '#FAFAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-down">
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0A1128', letterSpacing: '-1px', marginBottom: 10 }}>
                Key Challenges We Solve
              </h2>
              <p style={{ color: 'rgba(10,17,40,0.55)', fontSize: '1.05rem' }}>
                Industry-specific problems that generic HR software can't handle.
              </p>
            </div>
          </ScrollReveal>
          <Row gutter={[20, 20]}>
            {industry.challenges.map((c, i) => (
              <Col key={c.title} xs={24} sm={12}>
                <ScrollReveal animation="fade-in-up" delay={i * 70}>
                  <div className="card-hover" style={{
                    padding: '28px 28px', borderRadius: 14, background: '#FFFFFF',
                    borderLeft: `4px solid ${industry.accent}`,
                    boxShadow: '0 4px 20px rgba(10,17,40,0.03)', height: '100%',
                  }}>
                    <h4 style={{ fontWeight: 800, color: '#0A1128', fontSize: 15, marginBottom: 8 }}>{c.title}</h4>
                    <p style={{ color: 'rgba(10,17,40,0.6)', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{c.body}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '72px 24px', background: '#FFFFFF', borderTop: '1px solid #EAECEF', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-down">
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0A1128', letterSpacing: '-1px', marginBottom: 10 }}>
                Purpose-Built Features
              </h2>
              <p style={{ color: 'rgba(10,17,40,0.55)', fontSize: '1.05rem' }}>
                Every feature designed around how {industry.title} businesses actually operate.
              </p>
            </div>
          </ScrollReveal>
          <Row gutter={[20, 20]}>
            {industry.features.map((f, i) => (
              <Col key={f.label} xs={24} sm={12} lg={8}>
                <ScrollReveal animation="fade-in-up" delay={i * 60}>
                  <div className="card-hover" style={{
                    padding: '24px 22px', borderRadius: 14, background: '#FAFAFC',
                    border: '1.5px solid #EAECEF',
                    boxShadow: '0 4px 20px rgba(10,17,40,0.02)', height: '100%',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, marginBottom: 14,
                      background: `${industry.accent}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: industry.accent, display: 'block' }} />
                    </div>
                    <h4 style={{ fontWeight: 800, color: '#0A1128', fontSize: 14, marginBottom: 6 }}>{f.label}</h4>
                    <p style={{ color: 'rgba(10,17,40,0.6)', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{f.detail}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ── Compliance & Use Cases ── */}
      <section style={{ padding: '72px 24px', background: '#FAFAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 40]}>
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-left">
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0A1128', marginBottom: 24 }}>
                  Compliance Coverage
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {industry.compliancePoints.map(pt => (
                    <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: `${industry.accent}15`, color: industry.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 1,
                      }}>✓</span>
                      <span style={{ fontSize: 13.5, color: 'rgba(10,17,40,0.7)', lineHeight: 1.5 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </Col>
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-right">
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0A1128', marginBottom: 24 }}>
                  Common Use Cases
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {industry.useCases.map(uc => (
                    <div key={uc} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(10,17,40,0.05)', color: '#0A1128',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 1,
                      }}>→</span>
                      <span style={{ fontSize: 13.5, color: 'rgba(10,17,40,0.7)', lineHeight: 1.5 }}>{uc}</span>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      {/* ── Other Industries ── */}
      <section style={{ padding: '60px 24px', background: '#FFFFFF', borderTop: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-down">
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0A1128', marginBottom: 24, textAlign: 'center' }}>
              Explore Other Industries
            </h3>
          </ScrollReveal>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {industries.filter(i => i.slug !== slug).map(ind => (
              <Link
                key={ind.slug}
                to={`/industries/${ind.slug}`}
                style={{
                  padding: '8px 18px', borderRadius: 24, fontSize: 13.5, fontWeight: 600,
                  border: `1.5px solid ${ind.accent}30`, color: ind.accent,
                  background: `${ind.accent}08`, textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${ind.accent}18`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${ind.accent}08`; }}
              >
                {ind.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title={`Ready to transform HR for your ${industry.title} business?`}
        subtitle="Schedule a free sector-specific demo with our implementation consultants."
      />
    </div>
  );
}
