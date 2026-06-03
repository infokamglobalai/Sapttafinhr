import { Row, Col } from 'antd';
import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import type { HomeSectionTheme } from '../shared/HomeSectionHeader';
import type { ProductModule } from '../../data/product-pages-data';

interface ModuleGridProps {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  items: ProductModule[];
  theme?: HomeSectionTheme;
  featuredCode?: string;
}

export default function ModuleGrid({ eyebrow, title, titleHighlight, subtitle, items, theme = 'navy', featuredCode }: ModuleGridProps) {
  return (
    <section className="marketing-section marketing-section--muted">
      <div className="marketing-section__inner">
        <ScrollReveal animation="fade-in-down">
          <HomeSectionHeader
            eyebrow={eyebrow}
            title={title}
            titleHighlight={titleHighlight}
            titleHighlightSameLine
            subtitle={subtitle}
            theme={theme}
            maxWidth={720}
          />
        </ScrollReveal>
        <Row gutter={[20, 20]} className="marketing-module-grid">
          {items.map((mod, idx) => {
            const featured = featuredCode ? mod.code === featuredCode : idx === 1;
            return (
            <Col key={mod.title} xs={24} md={12} lg={8} className="marketing-module-grid__col">
              <ScrollReveal animation="fade-in-up" delay={idx * 60}>
                <article
                  className={`marketing-module-card${featured ? ' marketing-module-card--featured' : ''}`}
                  style={{ ['--module-accent' as string]: mod.accent }}
                >
                  <div className="marketing-module-card__top">
                    <span className="marketing-module-card__code" style={{ color: mod.accent }}>{mod.code}</span>
                    <span className="marketing-module-card__tag">{mod.tag}</span>
                  </div>
                  <h3 className="home-card-title home-card-title--sm">{mod.title}</h3>
                  <p className="home-card-body" style={{ marginBottom: 16 }}>{mod.desc}</p>
                  <ul className="marketing-module-card__features">
                    {mod.features.map((f) => (
                      <li key={f}>
                        <span style={{ color: mod.accent }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </article>
              </ScrollReveal>
            </Col>
          );
          })}
        </Row>
      </div>
    </section>
  );
}
