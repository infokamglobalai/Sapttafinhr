import { useState } from 'react';
import { Row, Col, Tag, Button } from 'antd';
import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import type { HomeSectionTheme } from '../shared/HomeSectionHeader';
import type { ShowcaseVariant } from '../../data/product-pages-data';
import { HrmsFloatingDashboard, FinanceFloatingDashboard } from './FloatingDashboard';

interface InteractiveShowcaseProps {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  variant: ShowcaseVariant;
  theme?: HomeSectionTheme;
}

export default function InteractiveShowcase({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  variant,
  theme = 'navy',
}: InteractiveShowcaseProps) {
  const [isMobile] = useState(() => window.innerWidth < 992);
  const showcase = useShowcaseState(variant);

  return (
    <section className="marketing-section marketing-section--white">
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
                isMobile={isMobile}
                maxWidth={480}
              />
              <ShowcaseControls variant={variant} showcase={showcase} />
            </ScrollReveal>
          </Col>
          <Col xs={24} lg={13}>
            <ScrollReveal animation="fade-in-right">
              <ShowcasePanel variant={variant} showcase={showcase} />
            </ScrollReveal>
          </Col>
        </Row>
      </div>
    </section>
  );
}

type ShowcaseState =
  | { type: 'hrms-roster'; shift: 'day' | 'night'; setShift: (s: 'day' | 'night') => void; bump: () => void; key: number }
  | { type: 'finance-ledger'; item: 'payroll' | 'invoice' | 'subscription'; setItem: (i: 'payroll' | 'invoice' | 'subscription') => void; bump: () => void; key: number }
  | { type: 'mobile-app'; screen: 'punch' | 'leave' | 'payslip'; setScreen: (s: 'punch' | 'leave' | 'payslip') => void; bump: () => void; key: number }
  | { type: 'platform-plans'; plan: 'starter' | 'professional' | 'enterprise'; setPlan: (p: 'starter' | 'professional' | 'enterprise') => void; bump: () => void; key: number };

function useShowcaseState(variant: ShowcaseVariant): ShowcaseState {
  const [key, setKey] = useState(0);
  const bump = () => setKey((k) => k + 1);

  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [item, setItem] = useState<'payroll' | 'invoice' | 'subscription'>('payroll');
  const [screen, setScreen] = useState<'punch' | 'leave' | 'payslip'>('punch');
  const [plan, setPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');

  if (variant === 'hrms-roster') return { type: 'hrms-roster', shift, setShift, bump, key };
  if (variant === 'finance-ledger') return { type: 'finance-ledger', item, setItem, bump, key };
  if (variant === 'mobile-app') return { type: 'mobile-app', screen, setScreen, bump, key };
  return { type: 'platform-plans', plan, setPlan, bump, key };
}

function ShowcaseControls({ variant, showcase }: { variant: ShowcaseVariant; showcase: ShowcaseState }) {
  if (showcase.type === 'hrms-roster') {
    return (
      <div className="marketing-showcase-controls">
        {(['day', 'night'] as const).map((s) => (
          <Button
            key={s}
            className={`marketing-chip-btn${showcase.shift === s ? (s === 'day' ? ' marketing-chip-btn--active' : ' marketing-chip-btn--active-purple') : ''}`}
            onClick={() => { showcase.setShift(s); showcase.bump(); }}
          >
            {s === 'day' ? '☀️ Day shift' : '🌙 Night shift'}
          </Button>
        ))}
      </div>
    );
  }
  if (showcase.type === 'finance-ledger') {
    const opts = [
      { key: 'payroll' as const, label: 'Payroll → ledger post' },
      { key: 'invoice' as const, label: 'Client invoice payment' },
      { key: 'subscription' as const, label: 'Vendor autopay' },
    ];
    return (
      <div className="marketing-showcase-controls marketing-showcase-controls--stack">
        {opts.map((o) => (
          <Button
            key={o.key}
            className={`marketing-chip-btn marketing-chip-btn--block${showcase.item === o.key ? ' marketing-chip-btn--active-green' : ''}`}
            onClick={() => { showcase.setItem(o.key); showcase.bump(); }}
          >
            {o.label}
          </Button>
        ))}
      </div>
    );
  }
  if (showcase.type === 'mobile-app') {
    const opts = [
      { key: 'punch' as const, label: 'Geofence attendance punch' },
      { key: 'leave' as const, label: 'Leave request & balance' },
      { key: 'payslip' as const, label: 'Download PDF payslip' },
    ];
    return (
      <div className="marketing-showcase-controls marketing-showcase-controls--stack">
        {opts.map((o) => (
          <Button
            key={o.key}
            className={`marketing-chip-btn marketing-chip-btn--block${showcase.screen === o.key ? ' marketing-chip-btn--active' : ''}`}
            onClick={() => { showcase.setScreen(o.key); showcase.bump(); }}
          >
            {o.label}
          </Button>
        ))}
      </div>
    );
  }
  return (
    <div className="marketing-showcase-controls">
      {(['starter', 'professional', 'enterprise'] as const).map((p) => (
        <Button
          key={p}
          className={`marketing-chip-btn${showcase.plan === p ? ' marketing-chip-btn--active' : ''}`}
          onClick={() => { showcase.setPlan(p); showcase.bump(); }}
          style={{ flex: 1, textTransform: 'capitalize' }}
        >
          {p}
        </Button>
      ))}
    </div>
  );
}

function ShowcasePanel({ variant, showcase }: { variant: ShowcaseVariant; showcase: ShowcaseState }) {
  if (showcase.type === 'hrms-roster') {
    return <HrmsFloatingDashboard shift={showcase.shift} key={`hrms-${showcase.shift}-${showcase.key}`} />;
  }

  if (showcase.type === 'finance-ledger') {
    return <FinanceFloatingDashboard item={showcase.item} key={`fin-${showcase.item}-${showcase.key}`} />;
  }

  if (showcase.type === 'mobile-app') {
    const screens = {
      punch: { header: 'Attendance punch', status: 'Inside geofence', details: 'GPS verified · Punch recorded at 09:02 AM', accent: '#6C3BFF' },
      leave: { header: 'Leave request', status: 'Casual leave · 2 days', details: 'Balance: 4 days left · Sent to manager', accent: '#2BB673' },
      payslip: { header: 'Payslip download', status: 'April 2026', details: 'PF, ESI, TDS breakdown · PDF ready', accent: '#1E2A78' },
    };
    const s = screens[showcase.screen];
    return (
      <div className="marketing-phone-wrap">
        <div className="marketing-phone" key={`mob-${showcase.screen}-${showcase.key}`}>
          <div className="marketing-phone__notch" />
          <div className="marketing-phone__screen">
            <div className="marketing-phone__top">
              <span>Saptta Mobile</span>
              <span className="marketing-phone__dot" />
            </div>
            <div className="marketing-phone__card">
              <div className="marketing-phone__label">Employee</div>
              <strong>Rahul Mehta</strong>
              <span className="marketing-mock__muted">Operations · Field</span>
            </div>
            <div className="marketing-phone__widget chat-message-reveal" style={{ borderColor: `${s.accent}33` }}>
              <div className="marketing-phone__widget-title" style={{ color: s.accent }}>{s.header}</div>
              <div className="marketing-phone__widget-status">{s.status}</div>
              <p>{s.details}</p>
            </div>
            <div className="marketing-phone__nav">
              {(['punch', 'leave', 'payslip'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={showcase.screen === tab ? 'active' : ''}
                  onClick={() => { showcase.setScreen(tab); showcase.bump(); }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const plans = {
    starter: { title: 'Starter', limit: 'Up to 50 employees', accent: '#1E2A78', core: ['Geofence attendance', 'PF & ESI payroll', 'GST invoicing', 'Bank reco'] },
    professional: { title: 'Professional', limit: 'Up to 500 employees', accent: '#6C3BFF', core: ['Biometric devices', 'TDS on salary', 'GSTR summaries', 'AI payroll checks'] },
    enterprise: { title: 'Enterprise', limit: 'Unlimited scale', accent: '#2BB673', core: ['Multi-company', 'Custom API', 'Dedicated support', 'Advanced RBAC'] },
  };
  const p = plans[showcase.plan];
  return (
    <div className="marketing-mock marketing-mock--plan" key={`plan-${showcase.plan}-${showcase.key}`} style={{ borderColor: `${p.accent}33` }}>
      <div className="marketing-mock__header"><span>{p.title} plan</span><Tag color="processing">{p.limit}</Tag></div>
      <div className="marketing-mock__body chat-message-reveal">
        <ul className="marketing-plan-list">
          {p.core.map((c, i) => (
            <li key={c} className="animate-row" style={{ animationDelay: `${i * 0.06}s` }}>
              <span style={{ color: p.accent }}>✓</span> {c}
            </li>
          ))}
        </ul>
      </div>
      <div className="marketing-mock__footer">Modular HRMS + Accounts · combine anytime</div>
    </div>
  );
}
