import { useEffect, useState } from 'react';
import { Row, Col, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import { productsOverview } from '../data/product-pages-data';
import { ProductCardVisual } from '../components/marketing/ProductVisuals';

function ProductSelector() {
  const navigate = useNavigate();
  const [needsFieldPunch, setNeedsFieldPunch] = useState(false);
  const [needsGstLedger, setNeedsGstLedger] = useState(false);
  const [needsPayroll, setNeedsPayroll] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  // Recommendation engine
  let recommendedProduct = {
    title: 'Saptta HRMS',
    desc: 'The complete people operations platform for tracking attendance, leaves, and processing compliant salary with PF/ESI deductions.',
    accent: '#1E2A78',
    path: '/hrms'
  };

  if (needsSync || (needsPayroll && needsGstLedger)) {
    recommendedProduct = {
      title: 'Saptta Complete Bundle',
      desc: 'Our unified flagship platform. Sync all HRMS shifts and payroll disbursements automatically into your general ledger accounts.',
      accent: '#6C3BFF',
      path: '/pricing'
    };
  } else if (needsGstLedger) {
    recommendedProduct = {
      title: 'Saptta Accounts',
      desc: 'Built for finance managers. GST billing, e-invoicing hooks, bank reconciliation, and general double-entry book balancing.',
      accent: '#2BB673',
      path: '/accounts'
    };
  } else if (needsFieldPunch && !needsPayroll) {
    recommendedProduct = {
      title: 'Saptta Mobile App',
      desc: 'Perfect for field/remote tracking. Whitelisted geofence areas, push notifications, offline punch cache, and mobile ESS portal.',
      accent: '#D69A2D',
      path: '/mobile-app'
    };
  }

  return (
    <div className="product-selector-card">
      <h3 className="home-card-title home-card-title--sm" style={{ marginBottom: 28, textAlign: 'center' }}>
        Configure Your Business Needs
      </h3>
      
      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} md={12} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div 
            className={`selector-checkbox-label${needsFieldPunch ? ' selector-checkbox-label--active' : ''}`}
            onClick={() => setNeedsFieldPunch(!needsFieldPunch)}
          >
            <input type="checkbox" checked={needsFieldPunch} readOnly style={{ accentColor: '#6c3bff' }} />
            <div style={{ marginLeft: 8 }}>
              <div className="selector-checkbox-title">We have field-based or off-site teams</div>
              <div className="selector-checkbox-desc">Need GPS boundary verification and mobile biometric clock-in.</div>
            </div>
          </div>

          <div 
            className={`selector-checkbox-label${needsPayroll ? ' selector-checkbox-label--active' : ''}`}
            onClick={() => setNeedsPayroll(!needsPayroll)}
          >
            <input type="checkbox" checked={needsPayroll} readOnly style={{ accentColor: '#6c3bff' }} />
            <div style={{ marginLeft: 8 }}>
              <div className="selector-checkbox-title">We process statutory payroll (PF/ESI/TDS)</div>
              <div className="selector-checkbox-desc">Need automated salary summaries and compliant tax filing runs.</div>
            </div>
          </div>

          <div 
            className={`selector-checkbox-label${needsGstLedger ? ' selector-checkbox-label--active' : ''}`}
            onClick={() => setNeedsGstLedger(!needsGstLedger)}
          >
            <input type="checkbox" checked={needsGstLedger} readOnly style={{ accentColor: '#6c3bff' }} />
            <div style={{ marginLeft: 8 }}>
              <div className="selector-checkbox-title">We file GST invoices & balance ledgers</div>
              <div className="selector-checkbox-desc">Need GSTR-ready reports, bank reconciliations, and ledgers.</div>
            </div>
          </div>

          <div 
            className={`selector-checkbox-label${needsSync ? ' selector-checkbox-label--active' : ''}`}
            onClick={() => setNeedsSync(!needsSync)}
          >
            <input type="checkbox" checked={needsSync} readOnly style={{ accentColor: '#6c3bff' }} />
            <div style={{ marginLeft: 8 }}>
              <div className="selector-checkbox-title">We want payroll expenses to auto-post to accounting</div>
              <div className="selector-checkbox-desc">Need real-time money flow sync between HR rosters and ledgers.</div>
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <div className="selector-result-card">
            <div className="selector-result-glow" />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8, display: 'block' }}>
              RECOMMENDED SETUP
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', marginBottom: 12, lineHeight: 1.2 }}>
              {recommendedProduct.title}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
              {recommendedProduct.desc}
            </p>
            <Button 
              type="primary" 
              onClick={() => navigate(recommendedProduct.path)}
              style={{ 
                height: 46, 
                borderRadius: 10, 
                background: '#ffffff', 
                color: recommendedProduct.accent, 
                borderColor: '#ffffff', 
                fontWeight: 700,
                fontSize: 14,
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
              }}
            >
              Explore {recommendedProduct.title.replace('Saptta ', '')}
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { hero, productCards, platformFeatures } = productsOverview;

  return (
    <div className="marketing-page">
      <MarketingHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        titleHighlight={hero.titleHighlight}
        subtitle={hero.subtitle}
        stats={[
          { value: '3', label: 'Modular products' },
          { value: 'AI', label: 'Shared intelligence' },
          { value: '100%', label: 'India compliance' },
        ]}
        theme="navy"
        gradient="linear-gradient(135deg, #EEF2FF 0%, #F8FAFF 45%, #FFFFFF 100%)"
        primaryLabel="Compare plans"
        primaryTo="/pricing"
        secondaryLabel="Book a demo"
        secondaryTo="/contact"
        heroImageKey="featuresPlatform"
        heroImageVariant="gradient-border"
      />

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Product suite"
              title="Pick your starting point"
              titleHighlight="expand anytime"
              subtitle="HRMS and Accounts are separate subscriptions — add Mobile for field teams or choose Saptta Complete for unified HR + Finance."
              theme="purple"
              isMobile={isMobile}
              maxWidth={680}
            />
          </ScrollReveal>
          <Row gutter={[24, 24]}>
            {productCards.map((card, idx) => {
              const visualType = card.path === '/hrms' ? 'hrms' : card.path === '/accounts' ? 'accounts' : 'mobile';
              return (
                <Col key={card.path} xs={24} lg={8}>
                  <ScrollReveal animation="fade-in-up" delay={idx * 90}>
                    <article className="marketing-product-card">
                      <ProductCardVisual type={visualType} />
                      <div className="marketing-product-card__body">
                        <span className="home-section-eyebrow" style={{ color: card.accent, background: `${card.accent}14`, borderColor: `${card.accent}28` }}>
                          {card.title}
                        </span>
                        <h3 className="home-card-title">{card.highlight}</h3>
                        <p className="home-card-body">{card.desc}</p>
                        <div className="marketing-related-card__stats">
                          {card.stats.map((s) => (
                            <span key={s}>{s}</span>
                          ))}
                        </div>
                        <Button
                          type="primary"
                          className="marketing-btn marketing-btn--primary"
                          block
                          onClick={() => navigate(card.path)}
                          style={{ marginTop: 16, background: card.accent, borderColor: card.accent }}
                        >
                          Explore {card.title}
                        </Button>
                      </div>
                    </article>
                  </ScrollReveal>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Platform layer"
              title="Shared AI & compliance"
              titleHighlight="across products"
              subtitle="Whether you start with HR or Finance, you get the same security, audit trails, and intelligence layer."
              theme="indigo"
              isMobile={isMobile}
              maxWidth={640}
            />
          </ScrollReveal>
          <Row gutter={[16, 16]}>
            {platformFeatures.map((f, idx) => (
              <Col key={f.title} xs={24} sm={12}>
                <ScrollReveal animation="fade-in-up" delay={idx * 70}>
                  <div className="marketing-feature-tile">
                    <h4 className="home-card-h4">{f.title}</h4>
                    <p className="home-card-body">{f.desc}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
          <ScrollReveal animation="fade-in-up" delay={200}>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Button size="large" className="marketing-btn marketing-btn--ghost" onClick={() => navigate('/features')}>
                View full feature comparison →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white" style={{ background: '#FFFFFF', padding: '64px 0' }}>
        <div className="marketing-section__inner" style={{ maxWidth: 960 }}>
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="Setup Configurator"
              title="Find your ideal setup"
              titleHighlight="in seconds"
              subtitle="Select your organizational requirements and our engine will recommend the perfect Saptta configuration."
              theme="purple"
              maxWidth={600}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <ScrollReveal animation="scale-in" delay={100}>
            <ProductSelector />
          </ScrollReveal>
        </div>
      </section>

      <CTABanner
        title="Ready to unify HR & Finance?"
        subtitle="Start with one product or deploy Saptta Complete — we'll help you migrate securely."
      />
    </div>
  );
}
