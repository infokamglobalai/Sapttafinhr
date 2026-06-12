import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Form, Input, Select, Button, message, Collapse } from 'antd';
import {
  UserOutlined,
  DollarCircleOutlined,
  MobileOutlined,
  CustomerServiceOutlined,
  CrownOutlined,
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import useBreakpoint from '../hooks/useBreakpoint';

const HERO_GRADIENT = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 70%, #eef2ff 100%)';

const { TextArea } = Input;
const { Option } = Select;

const interestOptions = [
  { value: 'hrms', label: 'HRMS', icon: <UserOutlined /> },
  { value: 'accounts', label: 'Accounts', icon: <DollarCircleOutlined /> },
  { value: 'both', label: 'HRMS + Accounts', icon: <CustomerServiceOutlined /> },
  { value: 'mobile', label: 'Mobile App', icon: <MobileOutlined /> },
  { value: 'enterprise', label: 'Enterprise', icon: <CrownOutlined /> },
];

const contactChannels = [
  { icon: <MailOutlined />, label: 'Email', value: 'info@saptta.com' },
  { icon: <MailOutlined />, label: 'Alternative Email', value: 'saptta26@gmail.com' },
  { icon: <PhoneOutlined />, label: 'Mobile / WhatsApp', value: '99 00 00 70 72' },
  { icon: <ClockCircleOutlined />, label: 'Hours', value: 'Mon–Sat · 9 AM – 7 PM IST' },
];

const faqs = [
  {
    key: '1',
    label: 'Can I start with only HRMS or only Accounts?',
    children: 'Yes. Saptta is modular — subscribe to HRMS, Finance, or the complete bundle when you are ready.',
  },
  {
    key: '2',
    label: 'How long does implementation take?',
    children: 'Most teams go live in 2–4 weeks depending on employee count, integrations, and data migration scope.',
  },
  {
    key: '3',
    label: 'Is my data secure and India-compliant?',
    children: 'We use encrypted storage, RBAC, audit logs, and built-in support for PF, ESI, TDS, and GST workflows.',
  },
  {
    key: '4',
    label: 'Do you support geofence attendance and biometrics?',
    children: 'Yes — mobile geofence punch, ZKTeco devices, and hybrid setups with Saptta HRMS.',
  },
];

export default function Contact() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const prefillInterest = (location.state as { interest?: string } | null)?.interest;
  const [interestTab, setInterestTab] = useState(prefillInterest ?? 'both');
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (prefillInterest) {
      setInterestTab(prefillInterest);
      form.setFieldValue('interest', prefillInterest);
    }
  }, [prefillInterest, form]);

  const handleSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_KEY,
          subject: `Demo request — ${values.company} (${values.name})`,
          from_name: values.name,
          email: values.email,
          company: values.company,
          phone: values.phone ?? '—',
          employees: values.employees ?? '—',
          interest: values.interest ?? interestTab,
          message: values.message ?? '—',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      message.success('Thanks! We will contact you within 24 hours.');
      setSubmitted(true);
      form.resetFields();
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Web3Forms error:', err);
      message.error('Could not send. Please email info@saptta.com');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketing-page marketing-page--contact">
      <MarketingHero
        eyebrow="Contact Saptta"
        title="Book a demo"
        titleHighlight="for your team"
        titleHighlightSameLine
        subtitle="Tell us about your HR and finance needs — we will show you HRMS, Accounts, or the complete platform."
        stats={[
          { value: '24h', label: 'Response time' },
          { value: 'Free', label: 'Demo & trial' },
          { value: 'India', label: 'Based support' },
        ]}
        theme="navy"
        gradient={HERO_GRADIENT}
        primaryLabel="Send a message"
        primaryTo="#contact-form"
        secondaryLabel="View pricing"
        secondaryTo="/pricing"
        heroImageKey="contactSupport"
        heroImageVariant="plain"
      />

      <section id="contact-form" className="marketing-section marketing-section--white">
        <div className="marketing-section__inner">
          <ScrollReveal animation="fade-in-up">
            <div className="marketing-contact-categories">
              {interestOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`marketing-contact-cat${interestTab === opt.value ? ' marketing-contact-cat--active' : ''}`}
                  onClick={() => {
                    setInterestTab(opt.value);
                    form.setFieldValue('interest', opt.value);
                  }}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </ScrollReveal>

          <Row gutter={[40, 40]} style={{ marginTop: 32 }}>
            <Col xs={24} lg={14}>
              <ScrollReveal animation="fade-in-left">
                <div className="marketing-contact-form-card">
                  <h2 className="home-card-title home-card-title--sm">Request a demo</h2>
                  <p className="home-card-body" style={{ marginBottom: 20 }}>
                    No credit card required · Response within 24 hours
                  </p>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    requiredMark={false}
                    initialValues={{ interest: interestTab }}
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Full name" name="name" rules={[{ required: true, message: 'Required' }]}>
                          <Input placeholder="Your name" size="large" className="marketing-input" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Company" name="company" rules={[{ required: true, message: 'Required' }]}>
                          <Input placeholder="Company name" size="large" className="marketing-input" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="Work email"
                          name="email"
                          rules={[{ required: true }, { type: 'email', message: 'Valid email required' }]}
                        >
                          <Input placeholder="you@company.com" size="large" className="marketing-input" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Phone" name="phone" rules={[{ required: true, message: 'Required' }]}>
                          <Input placeholder="+91 …" size="large" className="marketing-input" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Team size" name="employees">
                          <Select size="large" placeholder="Employees">
                            {['1–25', '26–50', '51–100', '101–250', '251–500', '500+'].map((r) => (
                              <Option key={r} value={r}>
                                {r}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Interested in" name="interest">
                          <Select size="large">
                            {interestOptions.map((o) => (
                              <Option key={o.value} value={o.value}>
                                {o.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="Message (optional)" name="message">
                      <TextArea rows={3} placeholder="Tell us about payroll, GST, or attendance needs…" className="marketing-input" />
                    </Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={loading}
                      className="marketing-btn marketing-btn--primary"
                      style={{ height: 50 }}
                    >
                      {submitted ? '✓ Request sent' : 'Book a demo'}
                    </Button>
                    <p className="marketing-contact-trust">✓ No spam · India-based support team</p>
                  </Form>
                </div>
              </ScrollReveal>
            </Col>

            <Col xs={24} lg={10}>
              <ScrollReveal animation="fade-in-right">
                <h3 className="home-card-title home-card-title--sm">Reach us directly</h3>
                <div className="marketing-contact-channels">
                  {contactChannels.map((ch) => (
                    <div key={ch.label} className="marketing-contact-channel">
                      <span className="marketing-contact-channel__icon">
                        {ch.icon}
                      </span>
                      <div>
                        <div className="marketing-mock__muted">{ch.label}</div>
                        <strong>{ch.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <aside className="marketing-page__aside-card">
                  <span className="marketing-page__aside-badge">Security</span>
                  <h3 className="home-card-h4">Enterprise-grade security</h3>
                  <p className="home-card-body">Encryption, RBAC, and audit trails for HR and finance data.</p>
                  <button type="button" className="marketing-page__text-link" onClick={() => navigate('/security')}>
                    Learn more →
                  </button>
                </aside>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner marketing-section__inner--narrow">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="FAQ"
              title="Common"
              titleHighlight="questions"
              titleHighlightSameLine
              theme="navy"
              maxWidth={520}
              isMobile={isMobile}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-up">
            <Collapse
              className="marketing-faq-collapse"
              bordered={false}
              expandIconPosition="end"
              items={faqs}
            />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
