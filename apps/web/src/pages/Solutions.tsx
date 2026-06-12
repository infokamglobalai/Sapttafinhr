import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button, Slider } from 'antd';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingStatsRow from '../components/marketing/MarketingStatsRow';
import { solutionCards, solutionsBySize, solutionsOverview } from '../data/solutions-data';
import industriesData from '../data/industries-data';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import useBreakpoint from '../hooks/useBreakpoint';

function RoiCalculator() {
  const [teamSize, setTeamSize] = useState(50);
  const [adminHours, setAdminHours] = useState(15);

  const hoursSavedPerEmployee = 1.5;
  const adminHourlyRate = 250;

  const totalHoursSaved = Math.round((teamSize * hoursSavedPerEmployee) + (adminHours * 4 * 0.8));
  const totalSavings = Math.round(totalHoursSaved * adminHourlyRate);

  return (
    <div className="roi-calculator-card">
      <h3 className="home-card-title home-card-title--sm" style={{ marginBottom: 24, textAlign: 'center' }}>
        Estimate Your Monthly Savings
      </h3>
      
      <div className="roi-slider-container">
        <div className="roi-slider-header">
          <span className="roi-slider-title">Team Size (Employees)</span>
          <span className="roi-slider-value">{teamSize}</span>
        </div>
        <Slider
          min={10}
          max={500}
          value={teamSize}
          onChange={(val) => setTeamSize(val)}
          tooltip={{ formatter: (val) => `${val} Employees` }}
        />
      </div>

      <div className="roi-slider-container" style={{ marginBottom: 36 }}>
        <div className="roi-slider-header">
          <span className="roi-slider-title">Hours spent weekly on manual admin/sheets</span>
          <span className="roi-slider-value">{adminHours} hrs</span>
        </div>
        <Slider
          min={2}
          max={40}
          value={adminHours}
          onChange={(val) => setAdminHours(val)}
          tooltip={{ formatter: (val) => `${val} hours/week` }}
        />
      </div>

      <div className="roi-results-grid">
        <div className="roi-result-block">
          <div className="roi-result-value">₹{new Intl.NumberFormat('en-IN').format(totalSavings)}</div>
          <div className="roi-result-label">EST. MONTHLY SAVINGS</div>
        </div>
        <div className="roi-result-block">
          <div className="roi-result-value">{totalHoursSaved} hrs</div>
          <div className="roi-result-label">TIME SAVED / MONTH</div>
        </div>
      </div>
    </div>
  );
}

export default function Solutions() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { hero } = solutionsOverview;

  return (
    <div className="marketing-page">
      <section className={`marketing-hero${isMobile ? ' marketing-hero--stacked' : ''}`} style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #ECFDF5 50%, #FFFFFF 100%)' }}>
        <div className="marketing-hero__orb marketing-hero__orb--1" />
        <div className="marketing-hero__inner marketing-hero__inner--split">
          <ScrollReveal animation="fade-in-left">
            <HomeSectionHeader
              eyebrow={hero.eyebrow}
              title={hero.title}
              titleHighlight={hero.titleHighlight}
              subtitle={hero.subtitle}
              theme="navy"
              align="left"
              isMobile={isMobile}
              maxWidth={520}
            />
            <Button size="large" className="marketing-btn marketing-btn--primary" onClick={() => navigate('/contact')}>
              Talk to solutions team
            </Button>
          </ScrollReveal>
          <ScrollReveal animation="fade-in-right">
            <MarketingImageFrame imageKey="solutionsCollab" variant="split" aspect="4/3" />
          </ScrollReveal>
        </div>
      </section>

      <MarketingStatsRow
        stats={[
          { value: '6', label: 'Industry verticals', icon: '🏢' },
          { value: '3', label: 'Modular products', icon: '◫' },
          { value: 'AI', label: 'Built-in intelligence', icon: '✦' },
          { value: 'India', label: 'Compliance-first', icon: '🇮🇳' },
        ]}
      />

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="By product"
              title="Solutions that"
              titleHighlight="work together"
              subtitle="Start with one module or deploy the full Saptta stack — same data layer when you combine HR and Finance."
              theme="purple"
              maxWidth={640}
            />
          </ScrollReveal>
          <Row gutter={[24, 24]}>
            {solutionCards.map((card, idx) => (
              <Col key={card.title} xs={24} md={12}>
                <ScrollReveal animation="fade-in-up" delay={idx * 80}>
                  <article className="marketing-solution-card" style={{ borderTopColor: card.accent }}>
                    <span className="home-section-eyebrow" style={{ color: card.accent, background: `${card.accent}14`, borderColor: `${card.accent}30` }}>
                      {card.title}
                    </span>
                    <h3 className="home-card-title">{card.highlight}</h3>
                    <p className="home-card-body">{card.description}</p>
                    <ul className="marketing-module-card__features">
                      {card.features.map((f) => (
                        <li key={f}>
                          <span style={{ color: card.accent }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {card.industries?.length ? (
                      <div className="marketing-solution-card__industries">
                        <span className="marketing-mock__muted">Popular in:</span>
                        {card.industries.map((slug) => {
                          const ind = industriesData.find((i) => i.slug === slug);
                          return ind ? (
                            <button
                              key={slug}
                              type="button"
                              className="home-section-badge"
                              onClick={() => navigate(`/industries/${slug}`)}
                            >
                              {ind.title}
                            </button>
                          ) : null;
                        })}
                      </div>
                    ) : null}
                    <Button
                      type="primary"
                      block
                      className="marketing-btn marketing-btn--primary"
                      style={{ marginTop: 16, background: card.accent, borderColor: card.accent }}
                      onClick={() => navigate(card.path)}
                    >
                      {card.title} →
                    </Button>
                  </article>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="By company size"
              title="Right fit for"
              titleHighlight="your stage"
              theme="green"
              maxWidth={520}
            />
          </ScrollReveal>
          <Row gutter={[20, 20]}>
            {solutionsBySize.map((item, idx) => (
              <Col key={item.size} xs={24} md={8}>
                <ScrollReveal animation="fade-in-up" delay={idx * 70}>
                  <div className="marketing-feature-tile" style={{ height: '100%' }}>
                    <h4 className="home-card-h4">{item.size}</h4>
                    <p className="home-card-body">{item.desc}</p>
                    <button type="button" className="marketing-resource-card__link" onClick={() => navigate(item.path)}>
                      Learn more →
                    </button>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--white" style={{ background: '#FFFFFF', padding: '64px 0' }}>
        <div className="marketing-section__inner" style={{ maxWidth: 900 }}>
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="ROI Calculator"
              title="Estimate your savings"
              titleHighlight="with Saptta"
              subtitle="See how much time and operational costs you save by automating payroll, attendance, and GST ledgers."
              theme="green"
              maxWidth={600}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <ScrollReveal animation="scale-in" delay={100}>
            <RoiCalculator />
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Industries"
              title="Solutions by"
              titleHighlight="sector"
              subtitle="IT, manufacturing, retail, healthcare, logistics, and financial services — tailored workflows and compliance."
              theme="indigo"
              maxWidth={560}
            />
          </ScrollReveal>
          <Row gutter={[16, 16]}>
            {industriesData.map((ind, idx) => (
              <Col key={ind.slug} xs={12} sm={8} md={4}>
                <ScrollReveal animation="fade-in-up" delay={idx * 50}>
                  <button
                    type="button"
                    className="marketing-industry-pill"
                    style={{ borderColor: `${ind.accent}40`, background: `${ind.accent}08` }}
                    onClick={() => navigate(`/industries/${ind.slug}`)}
                  >
                    <span style={{ fontSize: 28 }}>{ind.icon}</span>
                    <strong style={{ color: ind.accent }}>{ind.title}</strong>
                  </button>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Button className="marketing-btn marketing-btn--ghost" size="large" onClick={() => navigate('/industries')}>
              View all industries
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
