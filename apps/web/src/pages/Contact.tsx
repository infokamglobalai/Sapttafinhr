import { useState } from 'react';
import { Row, Col, Form, Input, Select, Button, message } from 'antd';
import ScrollReveal from '../components/shared/ScrollReveal';

const { TextArea } = Input;
const { Option } = Select;

const contactInfo = [
  { code: 'EM', label: 'SYSTEM INQUIRY EMAIL', value: 'info@saptta.com', accent: '#FF6D00' },
  { code: 'WA', label: 'WHATSAPP SUPPORT', value: '+91 9900007072', accent: '#FF6D00' },
  { code: 'HR', label: 'WORKING HOURS', value: 'Mon–Sat: 9 AM – 7 PM IST', accent: '#FF6D00' },
];

export default function Contact() {
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_KEY,
          subject: `New Demo Request — ${values.company} (${values.name})`,
          from_name: values.name,
          email: values.email,
          company: values.company,
          phone: values.phone ?? '—',
          employees: values.employees ?? '—',
          interest: values.interest ?? '—',
          message: values.message ?? '—',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      message.success('Demo request sent! We will contact you within 24 hours.');
      setSubmitted(true);
      form.resetFields();
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Web3Forms error:', err);
      message.error('Could not send your request. Please email us directly at info@saptta.com');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#FAFAFC', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-orange" style={{ width: 450, height: 450, top: -160, left: -100, opacity: 0.08 }} />
        <div className="orb-purple" style={{ width: 450, height: 450, bottom: -160, right: -100, opacity: 0.08 }} />
        <div style={{ position: 'relative', zIndex: 5 }}>
          <ScrollReveal animation="fade-in-down">
            <h1>Initiate System Migration</h1>
            <p style={{ color: 'rgba(10,17,40,0.6)', fontWeight: 500 }}>
              Connect with a corporate operational specialist to configure your custom workspace parameters.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Form Section */}
      <section style={{ padding: '80px 24px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Row gutter={[48, 40]}>
            {/* Form Column */}
            <Col xs={24} md={14}>
              <ScrollReveal animation="fade-in-left">
                <div style={{
                  background: '#FFFFFF', borderRadius: 24, padding: '36px',
                  border: '1.5px solid rgba(255, 109, 0, 0.18)',
                  boxShadow: '0 16px 48px rgba(10, 17, 40, 0.04)',
                }}>
                  <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0A1128', marginBottom: 6, letterSpacing: '-0.5px' }}>
                    Request Workspace Demo
                  </h2>
                  <p style={{ color: 'rgba(10, 17, 40, 0.55)', marginBottom: 28, fontSize: 13.5 }}>
                    Provide your active employee scaling parameters to schedule an architect migration walkthrough.
                  </p>

                  <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Please enter your name' }]}>
                          <Input placeholder="Your Name" size="large" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Company Name" name="company" rules={[{ required: true, message: 'Please enter company name' }]}>
                          <Input placeholder="Your Company" size="large" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Email Address" name="email" rules={[{ required: true, message: 'Please enter email' }, { type: 'email', message: 'Enter a valid email' }]}>
                          <Input placeholder="you@company.com" size="large" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: 'Please enter phone' }]}>
                          <Input placeholder="+91 9900007072" size="large" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Active Employee Scale" name="employees">
                          <Select size="large" placeholder="Select active range">
                            {['1–25','26–50','51–100','101–250','251–500','500+'].map(r => <Option key={r} value={r}>{r} Employees</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Module Interest Scope" name="interest">
                          <Select size="large" placeholder="Select module parameters">
                            <Option value="hrms">Core HRMS only</Option>
                            <Option value="accounts">GST Ledger bookkeeping only</Option>
                            <Option value="both">HRMS + GST Ledger</Option>
                            <Option value="all">Full Unified platform cockpit</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label="System Requirements (optional)" name="message">
                      <TextArea rows={4} placeholder="Describe your operational rosters or legacy databases migration parameters..." style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item style={{ margin: 0 }}>
                      <Button
                        type="primary" htmlType="submit" size="large" block
                        loading={loading}
                        style={{
                          fontWeight: 700, height: 50, borderRadius: 8, fontSize: 15,
                          background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
                          border: 'none',
                          boxShadow: '0 6px 24px rgba(255, 109, 0, 0.2)',
                          transition: 'all 0.25s ease',
                        }}
                        className="card-hover"
                      >
                        {submitted ? '✓ Request Sent!' : loading ? 'Sending…' : 'Book a Demo'}
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              </ScrollReveal>
            </Col>

            {/* Info Column */}
            <Col xs={24} md={10}>
              <ScrollReveal animation="fade-in-right">
                <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0A1128', marginBottom: 8, letterSpacing: '-0.5px' }}>
                  Secure Intake Channels
                </h2>
                <p style={{ color: 'rgba(10, 17, 40, 0.6)', lineHeight: 1.7, marginBottom: 28, fontSize: 13.5 }}>
                  Our corporate integration team maintains isolated systems to transition your workforce rosters and financial bookkeeping ledgers cleanly.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                  {contactInfo.map((info, idx) => (
                    <div
                      key={info.label}
                      className="animate-row"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 18px', borderRadius: 12,
                        background: '#FAFAFC',
                        border: '1.5px solid rgba(255,109,0,0.12)',
                        boxShadow: '0 2px 8px rgba(10,17,40,0.02)',
                        animationDelay: `${idx * 0.08}s`,
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(255,109,0,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12.5, fontWeight: 900, color: info.accent,
                      }}>
                        {info.code}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(10, 17, 40, 0.45)', fontWeight: 700 }}>{info.label}</div>
                        <div style={{ fontSize: 14, color: '#0A1128', fontWeight: 800 }}>{info.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,109,0,0.06) 0%, #FFFFFF 100%)',
                  borderRadius: 16, padding: 22,
                  border: '1px solid rgba(255, 109, 0, 0.15)',
                }}>
                  <h4 style={{ color: '#FF6D00', fontWeight: 800, marginBottom: 8, fontSize: 14.5 }}>
                    ✓ Whitelisted Systems Guarantee
                  </h4>
                  <p style={{ color: 'rgba(10, 17, 40, 0.7)', fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                    All intake channels are monitored by system security engineers. Roster database whitelists and double-entry files audits are completed within 24 hours.
                  </p>
                </div>
              </ScrollReveal>
            </Col>
          </Row>
        </div>
      </section>
    </div>
  );
}
