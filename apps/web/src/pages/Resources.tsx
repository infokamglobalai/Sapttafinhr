import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col } from 'antd';
import {
  BookOutlined,
  CustomerServiceOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import { resources, quickLinks, resourceCategories } from '../data/resources-data';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import useBreakpoint from '../hooks/useBreakpoint';

const categoryIcon: Record<string, React.ReactNode> = {
  Product: <RocketOutlined />,
  Guide: <BookOutlined />,
  Support: <QuestionCircleOutlined />,
  Pricing: <DollarOutlined />,
};

const HERO_GRADIENT = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 70%, #eef2ff 100%)';

export default function Resources() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [filter, setFilter] = useState<string>('all');

  const filtered = resources.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'product') return r.category === 'Product';
    if (filter === 'guide') return r.category === 'Guide' || r.category === 'Pricing';
    if (filter === 'support') return r.category === 'Support';
    return true;
  });

  return (
    <div className="marketing-page marketing-page--resources">
      <MarketingHero
        eyebrow="Resources"
        title="Guides and help"
        titleHighlight="for Saptta users"
        titleHighlightSameLine
        subtitle="Product overviews, feature comparisons, pricing, and support — everything you need before and after rollout."
        stats={[
          { value: 'Guides', label: 'Product docs' },
          { value: 'Pricing', label: 'Plan comparison' },
          { value: '24h', label: 'Support response' },
        ]}
        theme="navy"
        gradient={HERO_GRADIENT}
        primaryLabel="Contact support"
        primaryTo="/contact"
        secondaryLabel="View pricing"
        secondaryTo="/pricing"
        heroImageKey="resourcesLearning"
        heroImageVariant="plain"
      />

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-up">
            <div className="marketing-contact-categories">
              {resourceCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`marketing-contact-cat${filter === cat.id ? ' marketing-contact-cat--active' : ''}`}
                  onClick={() => setFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </ScrollReveal>

          <Row gutter={[20, 20]} className="marketing-page__card-grid">
            {filtered.map((item, idx) => (
              <Col key={item.title} xs={24} sm={12} lg={8}>
                <ScrollReveal animation="fade-in-up" delay={idx * 60}>
                  <article
                    className="marketing-resource-card marketing-resource-card--with-img"
                    onClick={() => navigate(item.path)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(item.path)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="marketing-resource-card__thumb">
                      <MarketingImageFrame imageKey={item.imageKey} variant="card" aspect="16/10" />
                    </div>
                    <div className="marketing-resource-card__body">
                      <span className="marketing-resource-card__cat">
                        {categoryIcon[item.category]} {item.category}
                      </span>
                      <h3 className="home-card-title home-card-title--sm">{item.title}</h3>
                      <p className="home-card-body">{item.description}</p>
                      {item.readTime ? <span className="marketing-resource-card__time">{item.readTime}</span> : null}
                      <span className="marketing-resource-card__link">Read more →</span>
                    </div>
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
              eyebrow="Quick access"
              title="Popular"
              titleHighlight="links"
              titleHighlightSameLine
              theme="navy"
              maxWidth={480}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <Row gutter={[16, 16]} className="marketing-related-grid">
            {quickLinks.map((link, idx) => (
              <Col key={link.path} xs={24} md={8} className="marketing-related-grid__col">
                <ScrollReveal animation="fade-in-up" delay={idx * 70}>
                  <button type="button" className="marketing-related-card" onClick={() => navigate(link.path)}>
                    <span className="marketing-related-card__eyebrow">{link.label}</span>
                    <p className="home-card-body" style={{ margin: '8px 0 0' }}>{link.desc}</p>
                  </button>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
          <ScrollReveal animation="fade-in-up" delay={180}>
            <div className="marketing-resources-support">
              <div className="marketing-resources-support__copy">
                <span className="marketing-resources-support__eyebrow">Support</span>
                <h3 className="marketing-resources-support__title">Still need help?</h3>
                <p className="marketing-resources-support__desc">
                  Our India-based team typically responds within one business day.
                </p>
              </div>
              <button
                type="button"
                className="marketing-resources-support__btn"
                onClick={() => navigate('/contact')}
              >
                <CustomerServiceOutlined aria-hidden />
                Contact support
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
