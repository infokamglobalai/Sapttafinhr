import { useEffect, useState, type ReactNode } from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  RightOutlined,
  LoginOutlined,
  SwapOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import ProductsTrustStrip from '../components/marketing/ProductsTrustStrip';
import { productsOverview } from '../data/product-pages-data';
import { ProductCardVisual } from '../components/marketing/ProductVisuals';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';

const PLATFORM_ICON: Record<string, ReactNode> = {
  sso: <LoginOutlined />,
  sync: <SwapOutlined />,
  modular: <AppstoreOutlined />,
  ai: <ThunderboltOutlined />,
};

type Recommendation = {
  title: string;
  desc: string;
  path: string;
  ctaLabel: string;
};

function getRecommendation(
  needsFieldPunch: boolean,
  needsPayroll: boolean,
  needsFinance: boolean,
  needsSync: boolean,
): Recommendation | null {
  const any = needsFieldPunch || needsPayroll || needsFinance || needsSync;
  if (!any) return null;

  if (needsSync || (needsPayroll && needsFinance)) {
    return {
      title: 'Saptta Complete',
      desc: 'Both HRMS and Finance with single sign-on, unified reporting, and payroll-to-ledger sync.',
      path: '/pricing',
      ctaLabel: 'See pricing',
    };
  }
  if (needsFinance) {
    return {
      title: 'Saptta Finance',
      desc: 'Ledger, GST invoicing, bank reconciliation, and financial reporting — without the HR module.',
      path: '/accounts',
      ctaLabel: 'Explore Finance',
    };
  }
  if (needsPayroll) {
    return {
      title: 'Saptta HRMS',
      desc: 'Start with people operations — attendance, leave, payroll, and employee records in one module.',
      path: '/hrms',
      ctaLabel: 'Explore HRMS',
    };
  }
  if (needsFieldPunch) {
    return {
      title: 'Saptta Mobile',
      desc: 'Add mobile ESS and geofence attendance for field and off-site teams (best with HRMS).',
      path: '/mobile-app',
      ctaLabel: 'Explore Mobile',
    };
  }
  return null;
}

function ProductSelector() {
  const navigate = useNavigate();
  const [needsFieldPunch, setNeedsFieldPunch] = useState(false);
  const [needsPayroll, setNeedsPayroll] = useState(false);
  const [needsFinance, setNeedsFinance] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  const recommendation = getRecommendation(needsFieldPunch, needsPayroll, needsFinance, needsSync);

  const options = [
    {
      checked: needsFieldPunch,
      toggle: () => setNeedsFieldPunch(!needsFieldPunch),
      title: 'We have field-based or off-site teams',
      desc: 'Need mobile punch and geofence verification.',
    },
    {
      checked: needsPayroll,
      toggle: () => setNeedsPayroll(!needsPayroll),
      title: 'We run payroll in-house',
      desc: 'Need salary processing and employee pay records.',
    },
    {
      checked: needsFinance,
      toggle: () => setNeedsFinance(!needsFinance),
      title: 'We manage accounting & invoicing',
      desc: 'Need ledger, GST billing, and bank reconciliation.',
    },
    {
      checked: needsSync,
      toggle: () => setNeedsSync(!needsSync),
      title: 'We want HR and finance connected',
      desc: 'Need payroll expenses to flow into accounting automatically.',
    },
  ];

  return (
    <div className="product-selector-card">
      <div className="product-selector-layout">
        <div className="product-selector-options">
          <h3 className="home-card-title home-card-title--sm product-selector-options__title">
            Answer four quick questions
          </h3>
          {options.map((item) => (
            <div
              key={item.title}
              role="checkbox"
              aria-checked={item.checked}
              tabIndex={0}
              className={`selector-checkbox-label${item.checked ? ' selector-checkbox-label--active' : ''}`}
              onClick={item.toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  item.toggle();
                }
              }}
            >
              <input type="checkbox" checked={item.checked} readOnly tabIndex={-1} />
              <div className="selector-checkbox-content">
                <div className="selector-checkbox-title">{item.title}</div>
                <div className="selector-checkbox-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={`selector-result-card${recommendation ? '' : ' selector-result-card--empty'}`}>
          <div className="selector-result-glow" />
          <span className="selector-result-eyebrow">Recommended setup</span>
          {recommendation ? (
            <>
              <h2 className="selector-result-title">{recommendation.title}</h2>
              <p className="selector-result-desc">{recommendation.desc}</p>
              <div className="selector-result-actions">
                <Button
                  type="primary"
                  onClick={() => navigate(recommendation.path)}
                  className="selector-result-cta"
                >
                  {recommendation.ctaLabel}
                </Button>
                <button type="button" className="selector-result-demo" onClick={() => navigate('/contact')}>
                  Book a demo <CalendarOutlined />
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="selector-result-title">Select your needs</h2>
              <p className="selector-result-desc">
                Check one or more options on the left and we&apos;ll suggest the right Saptta module or bundle.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ card, delay }: { card: (typeof productsOverview.productCards)[number]; delay: number }) {
  const navigate = useNavigate();
  const isFeatured = 'featured' in card && card.featured;

  return (
    <ScrollReveal animation="fade-in-up" delay={delay} className="marketing-product-col">
      <article className={`marketing-product-card${isFeatured ? ' marketing-product-card--featured' : ''}`}>
        {card.badge && <span className="marketing-product-card__badge">{card.badge}</span>}
        <ProductCardVisual imageKey={card.imageKey} />
        <div className="marketing-product-card__body">
          <span className="home-section-eyebrow marketing-product-card__eyebrow">{card.title}</span>
          <h3 className="home-card-title marketing-product-card__headline">{card.highlight}</h3>
          <p className="home-card-body marketing-product-card__desc">{card.desc}</p>
          <ul className="marketing-product-features">
            {card.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Button
            type="primary"
            className="marketing-btn marketing-btn--primary marketing-product-card__cta"
            block
            onClick={() => navigate(card.path)}
          >
            {card.ctaLabel}
          </Button>
        </div>
      </article>
    </ScrollReveal>
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

  const { hero, productCards, mobileAddOn, platformFeatures } = productsOverview;

  return (
    <div className="marketing-page marketing-page--products">
      <MarketingHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        titleHighlight={hero.titleHighlight}
        titleHighlightSameLine
        subtitle={hero.subtitle}
        stats={[
          { value: '2', label: 'Core modules' },
          { value: '10–500+', label: 'Employees' },
          { value: 'SSO', label: 'Single login' },
        ]}
        theme="navy"
        gradient="linear-gradient(135deg, #ffffff 0%, #f8fafc 70%, #eef2ff 100%)"
        primaryLabel="Compare plans"
        primaryTo="/pricing"
        secondaryLabel="Book a demo"
        secondaryTo="/contact"
        heroImageKey="productSuite"
        heroImageVariant="plain"
      />

      <ProductsTrustStrip />

      <section className="marketing-section marketing-section--white marketing-section--compact">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Product suite"
              title="Choose your starting module"
              titleHighlight="expand anytime"
              titleHighlightSameLine
              subtitle="Subscribe to HRMS, Finance, or both on Saptta Complete — India's dual-product stack for people and money."
              theme="navy"
              isMobile={isMobile}
              maxWidth={720}
            />
          </ScrollReveal>
          <div className="marketing-products-grid marketing-products-grid--primary">
            {productCards.map((card, idx) => (
              <ProductCard key={card.path} card={card} delay={idx * 80} />
            ))}
          </div>

          <ScrollReveal animation="fade-in-up" delay={200}>
            <div className="marketing-mobile-addon">
              <div className="marketing-mobile-addon__visual">
                <MarketingImageFrame imageKey={mobileAddOn.imageKey} variant="card" aspect="16/10" />
              </div>
              <div className="marketing-mobile-addon__body">
                <span className="home-section-eyebrow marketing-mobile-addon__eyebrow">
                  Add-on · {mobileAddOn.title}
                </span>
                <h3 className="home-card-title home-card-title--sm">{mobileAddOn.highlight}</h3>
                <p className="home-card-body">{mobileAddOn.desc}</p>
                <Button type="default" className="marketing-mobile-addon__cta" onClick={() => navigate(mobileAddOn.path)}>
                  {mobileAddOn.ctaLabel} <RightOutlined />
                </Button>
              </div>
            </div>
          </ScrollReveal>

          <p className="marketing-products-links">
            <button type="button" className="marketing-products-links__btn" onClick={() => navigate('/pricing')}>
              Compare all plans →
            </button>
            <span className="marketing-products-links__sep" aria-hidden>
              ·
            </span>
            <button type="button" className="marketing-products-links__btn" onClick={() => navigate('/features')}>
              Full feature list →
            </button>
          </p>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted marketing-section--compact">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Technical foundation"
              title="Built to connect"
              titleHighlight="your modules"
              titleHighlightSameLine
              subtitle="The same security, audit trails, and intelligence layer whether you start with HRMS, Finance, or both."
              theme="navy"
              isMobile={isMobile}
              maxWidth={720}
            />
          </ScrollReveal>
          <div className="marketing-platform-grid">
            {platformFeatures.map((f, idx) => (
              <ScrollReveal key={f.title} animation="fade-in-up" delay={idx * 70}>
                <div className="marketing-feature-tile marketing-feature-tile--icon">
                  <span className="marketing-feature-tile__icon" aria-hidden>
                    {PLATFORM_ICON[f.icon] ?? <AppstoreOutlined />}
                  </span>
                  <h4 className="home-card-h4">{f.title}</h4>
                  <p className="home-card-body">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <p className="marketing-platform-footnote">
            <button type="button" className="marketing-products-links__btn" onClick={() => navigate('/security')}>
              Learn about security & compliance →
            </button>
          </p>
        </div>
      </section>

      <section className="marketing-section marketing-section--white marketing-section--compact">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="Product advisor"
              title="Not sure where to start?"
              titleHighlight="We'll recommend a setup"
              titleHighlightSameLine
              subtitle="Tell us how your team operates — no sales call required."
              theme="navy"
              maxWidth={640}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <ScrollReveal animation="scale-in" delay={100}>
            <ProductSelector />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
