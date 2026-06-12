import { useNavigate } from 'react-router-dom';
import { Row, Col } from 'antd';
import { ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import useBreakpoint from '../hooks/useBreakpoint';

const perks = ['Remote-friendly hybrid', 'Learning budget', 'Early ownership', 'India-first compliance'];

const HERO_GRADIENT = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 70%, #eef2ff 100%)';

export default function Careers() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  return (
    <div className="marketing-page marketing-page--careers">
      <MarketingHero
        eyebrow="Careers"
        title="Build HR & Finance"
        titleHighlight="software for India"
        titleHighlightSameLine
        subtitle="Join Saptta to solve impactful problems across payroll, compliance, analytics, and product experience for growing businesses."
        stats={[
          { value: 'Hybrid', label: 'Work model' },
          { value: 'Impact', label: 'Real payroll runs' },
          { value: 'Growth', label: 'Early ownership' },
        ]}
        theme="navy"
        gradient={HERO_GRADIENT}
        primaryLabel="Get in touch"
        primaryTo="/contact"
        secondaryLabel="About Saptta"
        secondaryTo="/about"
        heroImageKey="careersCulture"
        heroImageVariant="plain"
      />

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <Row gutter={[40, 40]} align="middle">
            <Col xs={24} md={12}>
              <ScrollReveal animation="fade-in-left">
                <MarketingImageFrame imageKey="careersWhySaptta" variant="plain" aspect="16/10" />
              </ScrollReveal>
            </Col>
            <Col xs={24} md={12}>
              <ScrollReveal animation="fade-in-right">
                <HomeSectionHeader
                  eyebrow="Why Saptta"
                  title="Work on products"
                  titleHighlight="teams rely on"
                  titleHighlightSameLine
                  subtitle="We ship HRMS and Accounts used for real payroll runs, GST filings, and statutory compliance — not slide decks."
                  align="left"
                  theme="navy"
                  maxWidth={480}
                  isMobile={isMobile}
                />
                <ul className="marketing-page__perks">
                  {perks.map((item) => (
                    <li key={item}>
                      <CheckOutlined className="marketing-page__perk-check" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="careers-roles-cta"
                  onClick={() => navigate('/contact')}
                >
                  View open roles
                  <ArrowRightOutlined aria-hidden />
                </button>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>
    </div>
  );
}
