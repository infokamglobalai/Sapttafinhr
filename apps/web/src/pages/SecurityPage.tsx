import { Link, useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import {
  LockOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import LegalPageLayout from '../components/legal/LegalPageLayout';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import SecurityIllustration from '../components/marketing/SecurityIllustration';
import useBreakpoint from '../hooks/useBreakpoint';
import { LEGAL_LAST_UPDATED, securitySections } from '../data/legal-pages-data';

const pillars = [
  { icon: <LockOutlined />, title: 'Encryption', desc: 'TLS in transit and encryption at rest for production data.', color: '#1E2A78' },
  { icon: <SafetyCertificateOutlined />, title: 'Access control', desc: 'RBAC, tenant isolation, and session security.', color: '#1E2A78' },
  { icon: <AuditOutlined />, title: 'Audit logs', desc: 'Track payroll runs, approvals, and admin changes.', color: '#FF6D00' },
  { icon: <CloudServerOutlined />, title: 'Resilience', desc: 'Backups, monitoring, and incident response.', color: '#1E2A78' },
];

export default function SecurityPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  return (
    <div className="marketing-page">
      <section className={`marketing-hero${isMobile ? ' marketing-hero--stacked' : ''}`} style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFF 55%, rgba(255,109,0,0.08) 100%)' }}>
        <div className="marketing-hero__inner marketing-hero__inner--split">
          <ScrollReveal animation="fade-in-left">
            <HomeSectionHeader
              eyebrow="Trust & security"
              title="Your HR & finance data,"
              titleHighlight="protected"
              subtitle="Enterprise-grade controls for Indian payroll, employee records, and statutory compliance data."
              align="left"
              theme="purple"
              isMobile={isMobile}
              maxWidth={480}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Button type="primary" className="marketing-btn marketing-btn--primary" onClick={() => navigate('/contact')}>
                Security questionnaire
              </Button>
              <Button className="marketing-btn marketing-btn--ghost" onClick={() => navigate('/privacy')}>
                Privacy Policy →
              </Button>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-in-right">
            <div className="security-page__visual">
              <SecurityIllustration compact={isMobile} />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <Row gutter={[20, 20]}>
            {pillars.map((p, idx) => (
              <Col key={p.title} xs={24} sm={12} lg={6}>
                <ScrollReveal animation="fade-in-up" delay={idx * 60}>
                  <div className="legal-pillar-card" style={{ borderTopColor: p.color }}>
                    <span className="legal-pillar-card__icon" style={{ color: p.color, background: `${p.color}14` }}>
                      {p.icon}
                    </span>
                    <h3 className="home-card-h4">{p.title}</h3>
                    <p className="home-card-body">{p.desc}</p>
                  </div>
                </ScrollReveal>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner">
          <Row gutter={[40, 32]} align="middle">
            <Col xs={24} md={12}>
              <MarketingImageFrame imageKey="security" variant="glass" aspect="16/10" />
            </Col>
            <Col xs={24} md={12}>
              <HomeSectionHeader
                eyebrow="Report a concern"
                title="Found a vulnerability?"
                subtitle="Email security@saptta.com with details. We appreciate responsible disclosure and will respond promptly."
                align="left"
                theme="navy"
                maxWidth={440}
              />
            </Col>
          </Row>
        </div>
      </section>

      <LegalPageLayout
        embedded
        eyebrow="Details"
        title="Security"
        titleHighlight="practices"
        subtitle="Technical and organisational measures we use to safeguard the Saptta platform."
        lastUpdated={LEGAL_LAST_UPDATED}
        sections={securitySections}
        relatedLinks={[
          { label: 'Privacy Policy', to: '/privacy' },
          { label: 'Terms of Service', to: '/terms' },
          { label: 'System status', to: '/status' },
          { label: 'Contact', to: '/contact' },
        ]}
      />
    </div>
  );
}
