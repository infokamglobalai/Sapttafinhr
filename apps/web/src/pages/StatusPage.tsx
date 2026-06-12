import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import useBreakpoint from '../hooks/useBreakpoint';
import { statusComponents, statusIncidents } from '../data/legal-pages-data';

const statusLabel: Record<string, { text: string; className: string }> = {
  operational: { text: 'Operational', className: 'status-pill--ok' },
  degraded: { text: 'Degraded', className: 'status-pill--warn' },
  maintenance: { text: 'Maintenance', className: 'status-pill--warn' },
  outage: { text: 'Outage', className: 'status-pill--down' },
};

export default function StatusPage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const allOperational = statusComponents.every((c) => c.status === 'operational');

  return (
    <div className="marketing-page status-page">
      <section className="status-page__hero">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="System status"
              title="Saptta"
              titleHighlight="platform status"
              subtitle="Real-time overview of Saptta website, HRMS, Accounts, and related services."
              theme="green"
              maxWidth={560}
            />
            <div className={`status-page__banner${allOperational ? ' status-page__banner--ok' : ''}`}>
              <CheckCircleFilled style={{ fontSize: 28, color: allOperational ? '#16a34a' : '#d97706' }} />
              <div>
                <strong>{allOperational ? 'All systems operational' : 'Some systems affected'}</strong>
                <p>Last checked: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-up">
            <h2 className="home-card-title home-card-title--sm" style={{ marginBottom: 20 }}>
              Current services
            </h2>
            <ul className="status-page__list">
              {statusComponents.map((item) => (
                <li key={item.name} className="status-page__row">
                  <div>
                    <strong>{item.name}</strong>
                    <span className="status-page__desc">{item.description}</span>
                  </div>
                  <span className={`status-pill ${statusLabel[item.status].className}`}>
                    {statusLabel[item.status].text}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-up">
            <h2 className="home-card-title home-card-title--sm" style={{ marginBottom: 20 }}>
              Incident history
            </h2>
            {statusIncidents.length === 0 ? (
              <p className="home-card-body">No incidents reported in the last 90 days.</p>
            ) : (
              <ul className="status-page__incidents">
                {statusIncidents.map((inc) => (
                  <li key={inc.title + inc.date} className="status-page__incident">
                    <div className="status-page__incident-head">
                      <ClockCircleOutlined />
                      <time>{inc.date}</time>
                      <span className={`status-pill status-pill--${inc.status === 'resolved' ? 'ok' : 'warn'}`}>
                        {inc.status === 'resolved' ? 'Resolved' : 'Investigating'}
                      </span>
                    </div>
                    <h3 className="home-card-h4">{inc.title}</h3>
                    <p className="home-card-body">{inc.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </ScrollReveal>
        </div>
      </section>

      <section className="marketing-section marketing-section--white">
        <div className="marketing-section__inner" style={{ textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-up">
            <p className="home-card-body" style={{ maxWidth: 480, margin: '0 auto 20px' }}>
              Subscribe to updates or report an issue affecting your organisation.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              <Button type="primary" className="marketing-btn marketing-btn--primary" size="large" onClick={() => navigate('/contact')}>
                Contact support
              </Button>
              <Button className="marketing-btn marketing-btn--ghost" size="large" onClick={() => navigate('/security')}>
                Security →
              </Button>
            </div>
            {!isMobile && (
              <p className="legal-page__meta" style={{ marginTop: 24 }}>
                Status page reflects Saptta cloud services. For planned maintenance we notify admins by email.
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
