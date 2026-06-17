import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Form, Input, Select, Button, message, Collapse } from 'antd';
import {
  CalendarOutlined,
  CustomerServiceOutlined,
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { SAPTTA_PHONES } from '../data/contact-info';

const { TextArea } = Input;
const { Option } = Select;

const interestOptions = [
  { value: 'hrms', label: 'HRMS only' },
  { value: 'accounts', label: 'Accounts only' },
  { value: 'both', label: 'HRMS + Accounts' },
  { value: 'mobile', label: 'Mobile app' },
  { value: 'enterprise', label: 'Enterprise rollout' },
];

const helpTopics = [
  {
    icon: <CalendarOutlined />,
    title: 'Product demo',
    desc: 'Walk through HRMS, finance, or the full platform with our team.',
  },
  {
    icon: <TeamOutlined />,
    title: 'Sales & onboarding',
    desc: 'Plan selection, rollout timeline, and migration questions.',
  },
  {
    icon: <CustomerServiceOutlined />,
    title: 'Customer support',
    desc: 'Help for existing Saptta workspaces and billing queries.',
  },
];

type ContactChannel =
  | { icon: React.ReactNode; label: string; value: string; href: string }
  | { icon: React.ReactNode; label: string; value: string }
  | { icon: React.ReactNode; label: string; phones: typeof SAPTTA_PHONES };

const contactChannels: ContactChannel[] = [
  {
    icon: <MailOutlined />,
    label: 'Email',
    value: 'info@saptta.com',
    href: 'mailto:info@saptta.com',
  },
  {
    icon: <MailOutlined />,
    label: 'Alternate email',
    value: 'saptta26@gmail.com',
    href: 'mailto:saptta26@gmail.com',
  },
  {
    icon: <PhoneOutlined />,
    label: 'Phone / WhatsApp',
    phones: SAPTTA_PHONES,
  },
  {
    icon: <ClockCircleOutlined />,
    label: 'Support hours',
    value: 'Mon–Sat · 9 AM – 7 PM IST',
  },
];

const faqs = [
  {
    key: '1',
    label: 'How quickly will someone respond?',
    children: 'We reply to demo and sales requests within one business day. Urgent support issues from active customers are prioritized.',
  },
  {
    key: '2',
    label: 'Can I start with only HRMS or only Accounts?',
    children: 'Yes. Saptta is modular — subscribe to HRMS, Finance, or the complete bundle when you are ready.',
  },
  {
    key: '3',
    label: 'Do you help with implementation and data migration?',
    children: 'Yes. Onboarding includes guided setup, and our team can advise on employee imports, chart of accounts, and compliance configuration.',
  },
  {
    key: '4',
    label: 'Is Saptta built for Indian compliance?',
    children: 'PF, ESI, TDS, professional tax, and GST workflows are built in, with encryption, RBAC, and audit trails for HR and finance data.',
  },
];

export default function Contact() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const prefillInterest = (location.state as { interest?: string } | null)?.interest;

  useEffect(() => {
    if (prefillInterest) {
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
          subject: `Contact — ${values.company} (${values.name})`,
          from_name: values.name,
          email: values.email,
          company: values.company,
          phone: values.phone ?? '—',
          employees: values.employees ?? '—',
          interest: values.interest ?? 'both',
          message: values.message ?? '—',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      message.success('Message sent. We will get back to you within 24 hours.');
      setSubmitted(true);
      form.resetFields();
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Web3Forms error:', err);
      message.error('Could not send. Please email info@saptta.com directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-page__hero">
        <div className="contact-page__hero-inner">
          <div className="contact-page__hero-copy">
            <p className="contact-page__eyebrow">Contact Saptta</p>
            <h1 className="contact-page__title">We&apos;re here to help you get started</h1>
            <p className="contact-page__subtitle">
              Book a demo, ask about pricing, or reach support — our India-based team responds within one business day.
            </p>
          </div>

          <div className="contact-page__channel-grid">
            {contactChannels.map((ch) => (
              <div key={'phones' in ch ? ch.label : `${ch.label}-${ch.value}`} className="contact-page__channel">
                <span className="contact-page__channel-icon" aria-hidden>{ch.icon}</span>
                <div>
                  <span className="contact-page__channel-label">{ch.label}</span>
                  {'phones' in ch ? (
                    <div className="contact-page__channel-values">
                      {ch.phones.map((phone) => (
                        <a key={phone.tel} href={`tel:${phone.tel}`} className="contact-page__channel-value">
                          {phone.display}
                        </a>
                      ))}
                    </div>
                  ) : 'href' in ch ? (
                    <a href={ch.href} className="contact-page__channel-value">{ch.value}</a>
                  ) : (
                    <strong className="contact-page__channel-value">{ch.value}</strong>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact-form" className="contact-page__main">
        <div className="contact-page__layout">
          <div className="contact-page__form-panel">
            <header className="contact-page__form-header">
              <h2>Send us a message</h2>
              <p>Tell us a little about your team and what you&apos;re looking to solve.</p>
            </header>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
              className="contact-page__form"
              initialValues={{ interest: prefillInterest ?? 'both' }}
            >
              <div className="contact-page__form-row">
                <Form.Item label="Full name" name="name" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="Your name" size="large" />
                </Form.Item>
                <Form.Item label="Company" name="company" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="Company name" size="large" />
                </Form.Item>
              </div>

              <div className="contact-page__form-row">
                <Form.Item
                  label="Work email"
                  name="email"
                  rules={[{ required: true }, { type: 'email', message: 'Valid email required' }]}
                >
                  <Input placeholder="you@company.com" size="large" />
                </Form.Item>
                <Form.Item label="Phone" name="phone" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="+91 …" size="large" />
                </Form.Item>
              </div>

              <div className="contact-page__form-row">
                <Form.Item label="Team size" name="employees">
                  <Select size="large" placeholder="Number of employees">
                    {['1–25', '26–50', '51–100', '101–250', '251–500', '500+'].map((r) => (
                      <Option key={r} value={r}>{r}</Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="Interested in" name="interest">
                  <Select size="large">
                    {interestOptions.map((o) => (
                      <Option key={o.value} value={o.value}>{o.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              <Form.Item label="How can we help?" name="message">
                <TextArea rows={4} placeholder="Payroll, GST, attendance, migration, pricing — share any context that helps." />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                className="contact-page__submit"
              >
                {submitted ? 'Message sent — thank you' : 'Send message'}
              </Button>

              <p className="contact-page__form-note">
                No spam. By submitting, you agree to our{' '}
                <Link to="/privacy">Privacy Policy</Link>.
              </p>
            </Form>
          </div>

          <aside className="contact-page__aside">
            <div className="contact-page__help-card">
              <h3>How we can help</h3>
              <ul>
                {helpTopics.map((topic) => (
                  <li key={topic.title}>
                    <span className="contact-page__help-icon" aria-hidden>{topic.icon}</span>
                    <div>
                      <strong>{topic.title}</strong>
                      <p>{topic.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="contact-page__links-card">
              <h3>Looking for something else?</h3>
              <Link to="/pricing" className="contact-page__link-item">View pricing &amp; plans →</Link>
              {isAuthenticated ? (
                <Link to="/app" className="contact-page__link-item">Go to your dashboard →</Link>
              ) : (
                <Link to="/signup" className="contact-page__link-item">Start a free trial →</Link>
              )}
              <Link to="/security" className="contact-page__link-item">
                <SafetyCertificateOutlined aria-hidden />
                Security &amp; compliance →
              </Link>
            </div>

            <div className="contact-page__response-card">
              <span className="contact-page__response-badge">Typical response</span>
              <strong>Within 24 hours</strong>
              <p>Monday to Saturday, India business hours. Existing customers with active subscriptions receive priority support routing.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="contact-page__faq">
        <div className="contact-page__faq-inner">
          <header className="contact-page__faq-header">
            <p className="contact-page__eyebrow">Before you write</p>
            <h2>Quick answers</h2>
          </header>
          <Collapse
            className="contact-page__faq-collapse"
            bordered={false}
            expandIconPosition="end"
            items={faqs}
          />
        </div>
      </section>
    </div>
  );
}
