import { useParams, Link, useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import industries from '../data/industries-data';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import IndustryHeroVisual from '../components/marketing/IndustryHeroVisual';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import { industryImageKey } from '../data/marketing-images';

export default function IndustryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const industry = industries.find((i) => i.slug === slug);

  if (!industry) {
    return (
      <div className="marketing-page" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <h2 className="home-card-title">Industry not found</h2>
        <Button type="primary" className="marketing-btn marketing-btn--primary" onClick={() => navigate('/industries')}>
          Back to industries
        </Button>
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <section className="marketing-hero" style={{ background: industry.gradient, position: 'relative', overflow: 'hidden' }}>
        <div className="marketing-section__inner" style={{ position: 'relative', zIndex: 1 }}>
          <ScrollReveal animation="fade-in-down">
            <Link to="/industries" className="marketing-back-link" style={{ color: industry.accent }}>
              ← All industries
            </Link>
            <Row gutter={[40, 32]} align="middle" style={{ marginTop: 16 }}>
              <Col xs={24} lg={14}>
                <span
                  className="home-section-eyebrow"
                  style={{ color: industry.accent, background: 'rgba(255,255,255,0.85)', borderColor: `${industry.accent}30` }}
                >
                  {industry.code} · Industry solution
                </span>
                <h1 className="home-hero-title" style={{ color: '#0f172a', marginTop: 12 }}>
                  {industry.title}
                </h1>
                <p className="home-hero-subtitle" style={{ color: '#475569', maxWidth: 520 }}>
                  {industry.tagline}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
                  <Button
                    className="marketing-btn marketing-btn--primary"
                    style={{ background: industry.accent, borderColor: industry.accent }}
                    onClick={() => navigate(industry.primarySolutionPath)}
                  >
                    {industry.primarySolutionLabel}
                  </Button>
                  <Button className="marketing-btn marketing-btn--ghost" onClick={() => navigate('/solutions')}>
                    Compare solutions
                  </Button>
                </div>
              </Col>
              <Col xs={24} lg={10}>
                <IndustryHeroVisual industry={industry} large />
              </Col>
            </Row>
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <Row gutter={[48, 40]} align="middle">
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-left">
                <HomeSectionHeader
                  eyebrow="Overview"
                  title={`Built for ${industry.title}`}
                  subtitle={industry.overview}
                  align="left"
                  theme="navy"
                  maxWidth={520}
                />
              </ScrollReveal>
            </Col>
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-right">
                {industryImageKey[industry.slug] ? (
                  <div style={{ marginBottom: 20 }}>
                    <MarketingImageFrame
                      imageKey={industryImageKey[industry.slug]}
                      variant="bento"
                      aspect="16/10"
                      overlayTitle={industry.title}
                    />
                  </div>
                ) : null}
                <Row gutter={[12, 12]}>
                  {industry.stats.map((stat) => (
                    <Col key={stat.label} xs={12}>
                      <div className="marketing-stat-tile" style={{ borderColor: `${industry.accent}30` }}>
                        <div className="marketing-stat__value" style={{ color: industry.accent }}>
                          {stat.value}
                        </div>
                        <div className="marketing-stat__label">{stat.label}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader eyebrow="Challenges" title="Problems we solve" titleHighlight="in this sector" theme="purple" maxWidth={560} />
          </ScrollReveal>
          <Row gutter={[20, 20]}>
            {industry.challenges.map((c, idx) => (
              <Col key={c.title} xs={24} md={12}>
                <ScrollReveal animation="fade-in-up" delay={idx * 60}>
                  <div className="marketing-feature-tile">
                    <h4 className="home-card-h4">{c.title}</h4>
                    <p className="home-card-body">{c.body}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader eyebrow="Capabilities" title="Saptta features" titleHighlight="for you" theme="green" maxWidth={560} />
          </ScrollReveal>
          <Row gutter={[16, 16]}>
            {industry.features.map((f, idx) => (
              <Col key={f.label} xs={24} md={12} lg={8}>
                <ScrollReveal animation="fade-in-up" delay={idx * 50}>
                  <div className="marketing-module-card" style={{ borderTopColor: industry.accent }}>
                    <h4 className="home-card-h4">{f.label}</h4>
                    <p className="home-card-body">{f.detail}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Compliance"
              title="Statutory coverage"
              titleHighlight={industry.title}
              subtitle="Registers and filings your team needs — built into workflows, not bolted on."
              theme="indigo"
              maxWidth={560}
            />
            <div className="home-section-pills" style={{ justifyContent: 'center', marginTop: -8 }}>
              {industry.compliancePoints.map((badge) => (
                <span key={badge} className="home-section-badge">
                  {badge}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <HighlightFeatureCard
        title={`Ready to deploy Saptta for ${industry.title}?`}
        description={`Start with ${industry.primarySolutionLabel.replace('Explore ', '').replace(' for IT', '')} or book a walkthrough tailored to your sector.`}
        ctaLabel="Book a demo"
        ctaTo="/contact"
      />

      <CTABanner
        title={`Scale ${industry.title} with Saptta`}
        subtitle="Modular HRMS and Accounts — combine when you need payroll-to-ledger sync and unified compliance."
      />
    </div>
  );
}

function HighlightFeatureCard({ title, description, ctaLabel, ctaTo }: { title: string; description: string; ctaLabel: string; ctaTo: string }) {
  const navigate = useNavigate();
  return (
    <section className="marketing-section marketing-section--white" style={{ paddingTop: 0 }}>
      <div className="marketing-section__inner">
        <ScrollReveal animation="fade-in-up">
          <div className="marketing-highlight-card">
            <div className="marketing-highlight-card__icon">→</div>
            <div>
              <h3 className="marketing-highlight-card__title">{title}</h3>
              <p className="marketing-highlight-card__desc">{description}</p>
              <button type="button" className="marketing-highlight-card__btn" onClick={() => navigate(ctaTo)}>
                {ctaLabel} →
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
