import { useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import IndustryHeroVisual from '../components/marketing/IndustryHeroVisual';
import industriesData from '../data/industries-data';

export default function Industries() {
  const navigate = useNavigate();

  return (
    <div className="marketing-page">
      <section className="marketing-hero" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF7 50%, #FFFFFF 100%)' }}>
        <div className="marketing-hero__orb marketing-hero__orb--1" />
        <div className="marketing-section__inner">
          <Row gutter={[48, 40]} align="middle">
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-left">
                <HomeSectionHeader
                  eyebrow="Industry solutions"
                  title="HR & Finance built for"
                  titleHighlight="your sector"
                  subtitle="Saptta adapts to how IT, manufacturing, retail, healthcare, logistics, and financial services actually run payroll and compliance in India."
                  align="left"
                  theme="navy"
                  maxWidth={480}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <Button className="marketing-btn marketing-btn--primary" onClick={() => navigate('/solutions')}>
                    View all solutions
                  </Button>
                  <Button className="marketing-btn marketing-btn--ghost" onClick={() => navigate('/contact')}>
                    Book industry demo
                  </Button>
                </div>
              </ScrollReveal>
            </Col>
            <Col xs={24} lg={12}>
              <ScrollReveal animation="fade-in-right">
                <IndustryHeroVisual industry={industriesData[0]} large />
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--white marketing-section--grid">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Sectors we serve"
              title="Choose your industry"
              titleHighlight="see your workflow"
              subtitle="Each profile links to the right Saptta product — HRMS, Accounts, or Mobile — with sector-specific compliance notes."
              theme="purple"
              maxWidth={640}
            />
          </ScrollReveal>

          <Row gutter={[24, 24]}>
            {industriesData.map((ind, idx) => (
              <Col key={ind.slug} xs={24} md={12} lg={8}>
                <ScrollReveal animation="fade-in-up" delay={idx * 70}>
                  <article
                    className="marketing-industry-card"
                    style={{ borderTopColor: ind.accent }}
                    onClick={() => navigate(`/industries/${ind.slug}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/industries/${ind.slug}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="marketing-industry-card__visual">
                      <IndustryHeroVisual industry={ind} cardIndex={idx} />
                    </div>
                    <div className="marketing-industry-card__body">
                      <span className="home-section-eyebrow" style={{ color: ind.accent, background: `${ind.accent}12`, borderColor: `${ind.accent}28` }}>
                        {ind.code}
                      </span>
                      <h3 className="home-card-title home-card-title--sm">{ind.title}</h3>
                      <p className="home-card-body">{ind.tagline}</p>
                      <div className="marketing-industry-card__links">
                        <button
                          type="button"
                          className="marketing-industry-card__cta"
                          style={{ color: ind.accent }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(ind.primarySolutionPath);
                          }}
                        >
                          {ind.primarySolutionLabel} →
                        </button>
                        <button
                          type="button"
                          className="marketing-industry-card__cta-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/solutions');
                          }}
                        >
                          All solutions
                        </button>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>
    </div>
  );
}
