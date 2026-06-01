import { useNavigate } from 'react-router-dom';
import { Button, Row, Col } from 'antd';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import useBreakpoint from '../hooks/useBreakpoint';

export default function Careers() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  return (
    <div className="marketing-page">
      <section className={`marketing-hero${isMobile ? ' marketing-hero--stacked' : ''}`} style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%)' }}>
        <div className="marketing-hero__orb marketing-hero__orb--1" />
        <div className="marketing-hero__inner marketing-hero__inner--split">
          <ScrollReveal animation="fade-in-left">
            <HomeSectionHeader
              eyebrow="Careers"
              title="Build the future of"
              titleHighlight="HR & Finance software"
              subtitle="Join Saptta to solve impactful problems across payroll, compliance, analytics, and product experience for Indian businesses."
              align="left"
              theme="purple"
              isMobile={isMobile}
              maxWidth={480}
            />
            <Button size="large" className="marketing-btn marketing-btn--primary" onClick={() => navigate('/contact')}>
              View open roles
            </Button>
          </ScrollReveal>
          <ScrollReveal animation="fade-in-right">
            <MarketingImageFrame imageKey="careersCulture" variant="arch" aspect="4/3" caption="Collaborative product & engineering culture" />
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} md={12}>
              <ScrollReveal animation="fade-in-left">
                <MarketingImageFrame imageKey="aboutTeam" variant="tilt" aspect="16/10" />
              </ScrollReveal>
            </Col>
            <Col xs={24} md={12}>
              <ScrollReveal animation="fade-in-right">
                <HomeSectionHeader
                  eyebrow="Why Saptta"
                  title="Work on products"
                  titleHighlight="teams rely on daily"
                  subtitle="We ship HRMS and Accounts used for real payroll runs, GST filings, and statutory compliance — not slide decks."
                  align="left"
                  theme="navy"
                  maxWidth={440}
                />
                <ul className="marketing-module-card__features" style={{ marginTop: 16 }}>
                  {['Remote-friendly hybrid', 'Learning budget', 'Early ownership', 'India-first compliance'].map((item) => (
                    <li key={item}>
                      <span style={{ color: '#6C3BFF' }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>
    </div>
  );
}
