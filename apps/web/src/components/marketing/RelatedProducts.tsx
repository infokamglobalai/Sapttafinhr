import { useNavigate } from 'react-router-dom';
import { Row, Col } from 'antd';
import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import { productsOverview } from '../../data/product-pages-data';

export default function RelatedProducts({ currentPath }: { currentPath: string }) {
  const navigate = useNavigate();
  const cards = productsOverview.productCards.filter((c) => c.path !== currentPath);

  return (
    <section className="marketing-section marketing-section--muted">
      <div className="marketing-section__inner">
        <ScrollReveal animation="fade-in-down">
          <HomeSectionHeader
            eyebrow="Explore more"
            title="Other Saptta"
            titleHighlight="products"
            subtitle="Modular HRMS and Finance — subscribe to one or combine both on the complete bundle."
            theme="navy"
            maxWidth={560}
          />
        </ScrollReveal>
        <Row gutter={[20, 20]}>
          {cards.map((card, idx) => (
            <Col key={card.path} xs={24} md={12}>
              <ScrollReveal animation="fade-in-up" delay={idx * 80}>
                <button
                  type="button"
                  className="marketing-related-card"
                  style={{ borderColor: `${card.accent}33` }}
                  onClick={() => navigate(card.path)}
                >
                  <span className="marketing-related-card__eyebrow" style={{ color: card.accent }}>
                    {card.title}
                  </span>
                  <h3 className="home-card-title home-card-title--sm">{card.highlight}</h3>
                  <p className="home-card-body">{card.desc}</p>
                  <div className="marketing-related-card__stats">
                    {card.stats.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <span className="marketing-related-card__link" style={{ color: card.accent }}>
                    Learn more →
                  </span>
                </button>
              </ScrollReveal>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}
