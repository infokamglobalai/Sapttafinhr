import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import {
  BookOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import CTABanner from '../components/shared/CTABanner';
import { resources, quickLinks, resourceCategories } from '../data/resources-data';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import useBreakpoint from '../hooks/useBreakpoint';

const categoryIcon: Record<string, React.ReactNode> = {
  Product: <RocketOutlined />,
  Guide: <BookOutlined />,
  Support: <QuestionCircleOutlined />,
  Pricing: <DollarOutlined />,
};

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
    <div className="marketing-page">
      <section className={`marketing-hero${isMobile ? ' marketing-hero--stacked' : ''}`} style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #F8FAFF 50%, #FFFFFF 100%)' }}>
        <div className="marketing-hero__orb marketing-hero__orb--1" />
        <div className="marketing-hero__inner marketing-hero__inner--split">
          <ScrollReveal animation="fade-in-left">
            <HomeSectionHeader
              eyebrow="Resources"
              title="Guides & help"
              titleHighlight="for Saptta users"
              subtitle="Product overviews, feature comparisons, pricing, and support — everything you need before and after rollout."
              theme="purple"
              align="left"
              isMobile={isMobile}
              maxWidth={520}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-right">
            <MarketingImageFrame imageKey="resourcesLearning" variant="polaroid" aspect="4/3" />
          </ScrollReveal>
        </div>
      </section>

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

          <Row gutter={[20, 20]} style={{ marginTop: 28 }}>
            {filtered.map((item, idx) => (
              <Col key={item.title} xs={24} sm={12} lg={8}>
                <ScrollReveal animation="fade-in-up" delay={idx * 60}>
                  <article
                    className="marketing-resource-card"
                    onClick={() => navigate(item.path)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(item.path)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="marketing-resource-card__thumb">
                      <MarketingImageFrame imageKey={item.imageKey} variant={item.frame ?? 'card'} aspect="16/10" />
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
            <HomeSectionHeader eyebrow="Quick access" title="Popular links" theme="navy" maxWidth={480} />
          </ScrollReveal>
          <Row gutter={[16, 16]}>
            {quickLinks.map((link, idx) => (
              <Col key={link.path} xs={24} md={8}>
                <ScrollReveal animation="fade-in-up" delay={idx * 70}>
                  <button type="button" className="marketing-related-card" onClick={() => navigate(link.path)}>
                    <span className="home-section-eyebrow" style={{ color: '#1E2A78', background: '#EEF2FF', borderColor: '#D8E0FA' }}>
                      {link.label}
                    </span>
                    <p className="home-card-body" style={{ margin: '8px 0 0' }}>{link.desc}</p>
                  </button>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Button size="large" className="marketing-btn marketing-btn--primary" onClick={() => navigate('/contact')}>
              Contact support
            </Button>
          </div>
        </div>
      </section>

      <CTABanner title="Need hands-on help?" subtitle="Book a demo and we will walk through HRMS, Accounts, or migration from your current tools." />
    </div>
  );
}
