import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col } from 'antd';
import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import type { HomeSectionTheme } from '../shared/HomeSectionHeader';

export interface AccordionItem {
  id: string;
  title: string;
  desc: string;
  ctaLabel?: string;
  ctaTo?: string;
}

interface FeatureAccordionProps {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  items: AccordionItem[];
  theme?: HomeSectionTheme;
  defaultOpenId?: string;
}

export default function FeatureAccordion({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  items,
  theme = 'navy',
  defaultOpenId,
}: FeatureAccordionProps) {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(defaultOpenId ?? items[0]?.id ?? '');

  return (
    <section className="marketing-section marketing-section--muted">
      <div className="marketing-section__inner">
        <Row gutter={[48, 40]} align="middle">
          <Col xs={24} lg={11}>
            <ScrollReveal animation="fade-in-left">
              <HomeSectionHeader
                eyebrow={eyebrow}
                title={title}
                titleHighlight={titleHighlight}
                subtitle={subtitle}
                align="left"
                theme={theme}
                maxWidth={440}
              />
            </ScrollReveal>
          </Col>
          <Col xs={24} lg={13}>
            <ScrollReveal animation="fade-in-right">
              <div className="marketing-accordion">
                {items.map((item) => {
                  const open = openId === item.id;
                  return (
                    <div key={item.id} className={`marketing-accordion__item${open ? ' marketing-accordion__item--open' : ''}`}>
                      <button
                        type="button"
                        className="marketing-accordion__trigger"
                        onClick={() => setOpenId(open ? '' : item.id)}
                        aria-expanded={open}
                      >
                        <span>{item.title}</span>
                        <span className="marketing-accordion__chevron">{open ? '−' : '+'}</span>
                      </button>
                      {open ? (
                        <div className="marketing-accordion__panel chat-message-reveal">
                          <p>{item.desc}</p>
                          {item.ctaLabel && item.ctaTo ? (
                            <button type="button" className="marketing-accordion__cta" onClick={() => navigate(item.ctaTo!)}>
                              {item.ctaLabel} →
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </ScrollReveal>
          </Col>
        </Row>
      </div>
    </section>
  );
}
