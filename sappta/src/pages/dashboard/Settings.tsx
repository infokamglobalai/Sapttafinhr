import { useState } from 'react';
import { Form, Input, Select, Button, Switch, Tabs, Tag, message } from 'antd';
import { SaveOutlined, KeyOutlined, GlobalOutlined, BellOutlined, LinkOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { INDIAN_STATES, INDUSTRIES } from '../../types';

const { Option } = Select;

export default function Settings() {
  const { user } = useAuth();
  const [companyForm] = Form.useForm();
  const [tab, setTab] = useState('company');
  const [emailNotif, setEmailNotif] = useState(true);
  const [whatsappNotif, setWhatsappNotif] = useState(false);
  const [smsNotif, setSmsNotif] = useState(false);

  const handleSaveCompany = () => {
    companyForm.validateFields().then(() => {
      message.success('Company settings saved');
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Settings</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Company profile, integrations, API keys & notification preferences</p>
      </div>

      <Tabs activeKey={tab} onChange={setTab} tabPosition="left" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', minHeight: 500 }} items={[
        {
          key: 'company',
          label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlobalOutlined /> Company</span>,
          children: (
            <div style={{ padding: '24px 32px', maxWidth: 600 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Company Profile</h3>
              <Form form={companyForm} layout="vertical" requiredMark={false}
                initialValues={{ name: 'Saptta Tech Solutions', legalName: 'Saptta Tech Solutions Pvt Ltd', gstin: '29GGGGG1314R9Z6', pan: 'AAAAA9999A', state: 'Karnataka', city: 'Bengaluru', industry: 'IT & Software' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item name="name" label="Company Name" style={{ flex: 1 }}><Input /></Form.Item>
                  <Form.Item name="legalName" label="Legal Name" style={{ flex: 1 }}><Input /></Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item name="gstin" label="GSTIN" style={{ flex: 1 }}><Input style={{ textTransform: 'uppercase' }} /></Form.Item>
                  <Form.Item name="pan" label="PAN" style={{ flex: 1 }}><Input style={{ textTransform: 'uppercase' }} /></Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item name="city" label="City" style={{ flex: 1 }}><Input /></Form.Item>
                  <Form.Item name="state" label="State" style={{ flex: 1 }}>
                    <Select showSearch optionFilterProp="children">{INDIAN_STATES.map(s => <Option key={s} value={s}>{s}</Option>)}</Select>
                  </Form.Item>
                </div>
                <Form.Item name="industry" label="Industry">
                  <Select showSearch optionFilterProp="children">{INDUSTRIES.map(i => <Option key={i} value={i}>{i}</Option>)}</Select>
                </Form.Item>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveCompany}
                  style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600 }}>Save Changes</Button>
              </Form>

              <div style={{ marginTop: 32, borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Fiscal Year</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8 }}>FY 2025–26</Tag>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>April 2025 — March 2026</span>
                </div>
              </div>

              <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Books Closing</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8 }}>Closed through: March 2026</Tag>
                  <Button size="small" style={{ borderRadius: 6, fontSize: 12 }}>Close April</Button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
                  Closing a period prevents editing journal entries with dates in that period.
                </p>
              </div>
            </div>
          ),
        },
        {
          key: 'notifications',
          label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BellOutlined /> Notifications</span>,
          children: (
            <div style={{ padding: '24px 32px', maxWidth: 500 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Notification Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <NotifToggle label="Email Notifications" desc="Receive daily digest, alerts, and approval requests via email" checked={emailNotif} onChange={setEmailNotif} />
                <NotifToggle label="WhatsApp Notifications" desc="Receive alerts via WhatsApp Business API" checked={whatsappNotif} onChange={setWhatsappNotif} />
                <NotifToggle label="SMS Alerts" desc="Critical alerts only — overdue invoices, payroll failures" checked={smsNotif} onChange={setSmsNotif} />
              </div>
              <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(255,109,0,0.04)', borderRadius: 10, border: '1px solid rgba(255,109,0,0.1)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#FF6D00' }}>In-app notifications are always on</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>You'll see a bell icon in the dashboard with real-time alerts.</div>
              </div>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('Notification preferences saved')} style={{ background: '#FF6D00', border: 'none', borderRadius: 8, fontWeight: 600, marginTop: 20 }}>
                Save Preferences
              </Button>
            </div>
          ),
        },
        {
          key: 'api',
          label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><KeyOutlined /> API Keys</span>,
          children: (
            <div style={{ padding: '24px 32px', maxWidth: 600 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>API Keys & Webhooks</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                Manage your public API keys for third-party integrations.
              </p>
              <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '20px', border: '1px solid var(--color-border)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Production Key</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Created 15 Apr 2026</div>
                  </div>
                  <Tag color="green" style={{ borderRadius: 6 }}>Active</Tag>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-secondary)', background: '#FFFFFF', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                  sk_live_••••••••••••••••••••4f2a
                </div>
              </div>
              <Button icon={<KeyOutlined />} style={{ borderRadius: 8 }}>Generate New Key</Button>

              <div style={{ marginTop: 32, borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Webhooks</h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                  Receive real-time POST notifications when events occur (invoice.created, receipt.posted, etc.)
                </p>
                <Button icon={<LinkOutlined />} style={{ borderRadius: 8 }}>Add Webhook Endpoint</Button>
              </div>
            </div>
          ),
        },
        {
          key: 'integrations',
          label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LinkOutlined /> Integrations</span>,
          children: (
            <div style={{ padding: '24px 32px', maxWidth: 600 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Integrations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: 'Razorpay', desc: 'Payment gateway for online collection', status: 'available', color: '#0EA5E9' },
                  { name: 'Tally', desc: 'Import/export data from Tally ERP', status: 'available', color: '#EF4444' },
                  { name: 'WhatsApp Business', desc: 'Send invoice PDFs, reminders via WhatsApp', status: 'pending', color: '#10B981' },
                  { name: 'ZKTeco Biometric', desc: 'Sync attendance from biometric devices', status: 'connected', color: '#FF6D00' },
                  { name: 'GST Portal (NIC)', desc: 'e-Invoice IRN generation & e-Way Bill', status: 'pending', color: '#8B5CF6' },
                ].map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#F9FAFB', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontWeight: 800, fontSize: 14 }}>
                        {item.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</div>
                      </div>
                    </div>
                    {item.status === 'connected'
                      ? <Tag color="green" style={{ borderRadius: 6 }}>Connected</Tag>
                      : item.status === 'pending'
                        ? <Tag color="orange" style={{ borderRadius: 6 }}>Pending Setup</Tag>
                        : <Button size="small" style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Connect</Button>
                    }
                  </div>
                ))}
              </div>
            </div>
          ),
        },
      ]} />
    </div>
  );
}

function NotifToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 18px', borderRadius: 12, background: checked ? 'rgba(255,109,0,0.03)' : '#F9FAFB', border: `1px solid ${checked ? 'rgba(255,109,0,0.12)' : 'var(--color-border)'}` }}>
      <Switch checked={checked} onChange={onChange} style={{ marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}
