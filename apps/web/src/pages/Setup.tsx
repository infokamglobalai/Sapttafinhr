import { useState } from 'react';
import { Form, Input, Select, Button, Steps, Switch, message, Tag } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BankOutlined, TeamOutlined, DollarOutlined, AuditOutlined,
  CheckCircleFilled, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { SapttaLogo } from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { INDIAN_STATES, INDUSTRIES } from '../types';
import { api, ApiError } from '../lib/api';

const { Option } = Select;

/**
 * Persist the company profile collected in the wizard to the FIN tenant API.
 * Signup already seeds a default Company, so we PATCH the first one. The 2-digit
 * GST state code is derived from the GSTIN prefix. Best-effort: a backend hiccup
 * shouldn't trap the user in the wizard.
 */
async function persistCompanyProfile(data: Record<string, string>): Promise<void> {
  const companies = await api.get<{ results?: { id: number }[] } | { id: number }[]>('/masters/companies/');
  const list = Array.isArray(companies) ? companies : companies.results ?? [];
  const companyId = list[0]?.id;
  if (!companyId) return; // nothing seeded yet — skip silently

  const stateCode = (data.gstin || '').slice(0, 2);
  await api.patch(`/masters/companies/${companyId}/`, {
    name: data.name,
    legal_name: data.legalName,
    gstin: data.gstin,
    pan: data.pan,
    ...(stateCode ? { state_code: stateCode } : {}),
  });
}

export default function Setup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [companyForm] = Form.useForm();
  const [hrmsForm] = Form.useForm();
  const [financeForm] = Form.useForm();

  const companyNameFromSignup = (location.state as { companyName?: string })?.companyName || '';

  const products = user?.products || ['hrms', 'finance'];
  const hasHrms = products.includes('hrms');
  const hasFinance = products.includes('finance');

  const steps: { key: string; title: string; icon: React.ReactNode }[] = [
    { key: 'company', title: 'Company Profile', icon: <BankOutlined /> },
  ];
  if (hasHrms) steps.push({ key: 'hrms', title: 'HR Setup', icon: <TeamOutlined /> });
  if (hasFinance) steps.push({ key: 'finance', title: 'Finance Setup', icon: <DollarOutlined /> });
  steps.push({ key: 'review', title: 'Review & Launch', icon: <AuditOutlined /> });

  const [currentStep, setCurrentStep] = useState(0);
  const [companyData, setCompanyData] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<string[]>(['Administration', 'Human Resources', 'Finance', 'Operations']);
  const [newDept, setNewDept] = useState('');
  const [leaveTypes] = useState([
    { name: 'Casual Leave', days: 12 },
    { name: 'Sick Leave', days: 12 },
    { name: 'Earned Leave', days: 15 },
    { name: 'Maternity Leave', days: 182 },
  ]);
  const [pfEnabled, setPfEnabled] = useState(true);
  const [esiEnabled, setEsiEnabled] = useState(true);
  const [ptEnabled, setPtEnabled] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<{ bankName: string; accountNumber: string; ifsc: string }[]>([]);
  const [coaTemplate, setCoaTemplate] = useState('indian_standard');
  const [gstRegistered, setGstRegistered] = useState(true);
  const [tdsEnabled, setTdsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepKey = steps[currentStep]?.key;

  const handleNext = async () => {
    try {
      if (currentStepKey === 'company') {
        const values = await companyForm.validateFields();
        setCompanyData(values);
      }
      if (currentStepKey === 'hrms') {
        await hrmsForm.validateFields();
      }
      if (currentStepKey === 'finance') {
        await financeForm.validateFields();
      }
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } catch {
      message.warning('Please fill all required fields.');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleLaunch = async () => {
    setIsSubmitting(true);
    try {
      // Persist the company profile to the real FIN tenant API. Don't let a
      // backend error trap the user mid-onboarding — log + continue.
      try {
        await persistCompanyProfile({ ...companyData, ...companyForm.getFieldsValue() });
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
        message.warning('Saved your setup, but could not sync the company profile — you can edit it later in Settings.');
      }
      updateUser({ setupComplete: true });
      message.success('Your company is set up! Welcome to Saptta.');
      navigate('/app');
    } catch {
      message.error('Setup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDepartment = () => {
    if (newDept.trim() && !departments.includes(newDept.trim())) {
      setDepartments([...departments, newDept.trim()]);
      setNewDept('');
    }
  };

  const removeDepartment = (dept: string) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { bankName: '', accountNumber: '', ifsc: '' }]);
  };

  const updateBankAccount = (index: number, field: string, value: string) => {
    setBankAccounts(prev => prev.map((acc, i) => i === index ? { ...acc, [field]: value } : acc));
  };

  const removeBankAccount = (index: number) => {
    setBankAccounts(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFC', display: 'flex' }}>
      {/* Left sidebar */}
      <div style={{
        width: 280, background: '#FFFFFF', borderRight: '1px solid var(--color-border)',
        padding: '32px 24px', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        <div style={{ marginBottom: 40 }}>
          <SapttaLogo />
        </div>

        <Steps
          current={currentStep}
          direction="vertical"
          size="small"
          items={steps.map((s, i) => ({
            title: <span style={{ fontSize: 13, fontWeight: i === currentStep ? 700 : 500 }}>{s.title}</span>,
            icon: <span style={{ fontSize: 16 }}>{s.icon}</span>,
          }))}
          style={{ flex: 1 }}
        />

        <div style={{ paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {products.map(p => (
              <Tag key={p} color={p === 'hrms' ? 'orange' : 'green'} style={{ fontSize: 11, fontWeight: 600, borderRadius: 8 }}>
                {p.toUpperCase()}
              </Tag>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 280, padding: '40px 48px', maxWidth: 800 }}>
        {/* Company Profile Step */}
        {currentStepKey === 'company' && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-1px' }}>
              Company Profile
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 32 }}>
              This information will be used across invoices, payslips, and compliance filings.
            </p>

            <Form form={companyForm} layout="vertical" requiredMark={false} initialValues={{ name: companyNameFromSignup, state: 'Karnataka' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name="name" label={<Label>Company Name</Label>} rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input placeholder="Acme India Pvt Ltd" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="legalName" label={<Label>Legal / Registered Name</Label>} rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input placeholder="Acme India Private Limited" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name="gstin" label={<Label>GSTIN</Label>} rules={[{ required: true }, { pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: 'Enter valid GSTIN' }]} style={{ flex: 1 }}>
                  <Input placeholder="29GGGGG1314R9Z6" size="large" style={{ borderRadius: 8, textTransform: 'uppercase' }} />
                </Form.Item>
                <Form.Item name="pan" label={<Label>PAN</Label>} rules={[{ required: true }, { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Enter valid PAN' }]} style={{ flex: 1 }}>
                  <Input placeholder="AAAAA9999A" size="large" style={{ borderRadius: 8, textTransform: 'uppercase' }} />
                </Form.Item>
              </div>

              <Form.Item name="address" label={<Label>Registered Address</Label>} rules={[{ required: true }]}>
                <Input.TextArea rows={2} placeholder="123, MG Road, Indiranagar" style={{ borderRadius: 8 }} />
              </Form.Item>

              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name="city" label={<Label>City</Label>} rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input placeholder="Bengaluru" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="state" label={<Label>State</Label>} rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Select placeholder="Select state" size="large" style={{ borderRadius: 8 }} showSearch optionFilterProp="children">
                    {INDIAN_STATES.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="pincode" label={<Label>PIN Code</Label>} rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input placeholder="560038" size="large" style={{ borderRadius: 8 }} maxLength={6} />
                </Form.Item>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name="phone" label={<Label>Phone</Label>} rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input placeholder="+91 98765 43210" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="email" label={<Label>Company Email</Label>} rules={[{ required: true, type: 'email' }]} style={{ flex: 1 }}>
                  <Input placeholder="accounts@company.com" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
              </div>

              <Form.Item name="industry" label={<Label>Industry</Label>} rules={[{ required: true }]}>
                <Select placeholder="Select industry" size="large" style={{ borderRadius: 8 }} showSearch optionFilterProp="children">
                  {INDUSTRIES.map(ind => <Option key={ind} value={ind}>{ind}</Option>)}
                </Select>
              </Form.Item>
            </Form>
          </div>
        )}

        {/* HRMS Setup Step */}
        {currentStepKey === 'hrms' && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-1px' }}>
              HR Setup
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 32 }}>
              Configure departments, leave policies, and statutory compliance for payroll.
            </p>

            <Form form={hrmsForm} layout="vertical" requiredMark={false}>
              {/* Departments */}
              <div style={{ marginBottom: 32 }}>
                <SectionLabel>Departments</SectionLabel>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  We've added common departments. Add or remove as needed.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {departments.map(dept => (
                    <Tag
                      key={dept}
                      closable
                      onClose={() => removeDepartment(dept)}
                      style={{ padding: '4px 12px', fontSize: 13, borderRadius: 8 }}
                    >
                      {dept}
                    </Tag>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    placeholder="Add department..."
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    onPressEnter={addDepartment}
                    style={{ maxWidth: 250, borderRadius: 8 }}
                  />
                  <Button icon={<PlusOutlined />} onClick={addDepartment}>Add</Button>
                </div>
              </div>

              {/* Leave Policy */}
              <div style={{ marginBottom: 32 }}>
                <SectionLabel>Default Leave Policy</SectionLabel>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  Standard Indian leave structure. You can customize later.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {leaveTypes.map(lt => (
                    <div key={lt.name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid var(--color-border)',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{lt.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#FF6D00' }}>{lt.days} days/yr</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Compliance */}
              <div style={{ marginBottom: 32 }}>
                <SectionLabel>Statutory Compliance</SectionLabel>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                  Enable payroll deductions applicable to your company.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ComplianceToggle
                    label="Provident Fund (PF)"
                    description="Employee: 12% of Basic, Employer: 12% of Basic. Applicable when 20+ employees."
                    checked={pfEnabled}
                    onChange={setPfEnabled}
                  />
                  <ComplianceToggle
                    label="ESI (Employee State Insurance)"
                    description="Employee: 0.75%, Employer: 3.25% of Gross. For salary up to ₹21,000/month."
                    checked={esiEnabled}
                    onChange={setEsiEnabled}
                  />
                  <ComplianceToggle
                    label="Professional Tax (PT)"
                    description="State-level tax deducted from salary. Rates vary by state."
                    checked={ptEnabled}
                    onChange={setPtEnabled}
                  />
                </div>
              </div>

              {/* Shift */}
              <div>
                <SectionLabel>Default Shift</SectionLabel>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Form.Item name="shiftStart" label={<Label>Start Time</Label>} initialValue="09:00" style={{ flex: 1 }}>
                    <Input type="time" size="large" style={{ borderRadius: 8 }} />
                  </Form.Item>
                  <Form.Item name="shiftEnd" label={<Label>End Time</Label>} initialValue="18:00" style={{ flex: 1 }}>
                    <Input type="time" size="large" style={{ borderRadius: 8 }} />
                  </Form.Item>
                </div>
              </div>
            </Form>
          </div>
        )}

        {/* Finance Setup Step */}
        {currentStepKey === 'finance' && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-1px' }}>
              Finance Setup
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 32 }}>
              Configure your fiscal year, chart of accounts, and banking details.
            </p>

            <Form form={financeForm} layout="vertical" requiredMark={false} initialValues={{ fiscalYearStart: '2025-04-01' }}>
              {/* Fiscal Year */}
              <div style={{ marginBottom: 32 }}>
                <SectionLabel>Fiscal Year</SectionLabel>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Form.Item name="fiscalYearStart" label={<Label>Start Date</Label>} style={{ flex: 1 }}>
                    <Input type="date" size="large" style={{ borderRadius: 8 }} />
                  </Form.Item>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                    <div style={{ padding: '10px 16px', background: 'rgba(255,109,0,0.06)', borderRadius: 10, border: '1px solid rgba(255,109,0,0.12)', fontSize: 13, color: '#FF6D00', fontWeight: 600 }}>
                      Default: April 2025 — March 2026 (Indian FY)
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart of Accounts */}
              <div style={{ marginBottom: 32 }}>
                <SectionLabel>Chart of Accounts Template</SectionLabel>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  We'll seed your accounts with a standard Indian chart of accounts. You can customize later.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { value: 'indian_standard', label: 'Indian Standard', desc: 'General-purpose COA for most businesses' },
                    { value: 'trading', label: 'Trading & Distribution', desc: 'Optimized for buy/sell businesses' },
                    { value: 'manufacturing', label: 'Manufacturing', desc: 'Includes WIP, raw materials, finished goods' },
                    { value: 'services', label: 'Services / IT', desc: 'Revenue recognition for service companies' },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => setCoaTemplate(opt.value)}
                      style={{
                        padding: '16px', borderRadius: 12, cursor: 'pointer',
                        border: coaTemplate === opt.value ? '2px solid #FF6D00' : '1px solid var(--color-border)',
                        background: coaTemplate === opt.value ? 'rgba(255,109,0,0.03)' : '#FFFFFF',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {coaTemplate === opt.value && <CheckCircleFilled style={{ color: '#FF6D00', fontSize: 14 }} />}
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{opt.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{opt.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST */}
              <div style={{ marginBottom: 32 }}>
                <SectionLabel>GST Configuration</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <Switch checked={gstRegistered} onChange={setGstRegistered} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>GST Registered</span>
                </div>
                {gstRegistered && (
                  <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                      GSTIN & state will be auto-populated from your company profile. GST rates (5%, 12%, 18%, 28%) and HSN codes are pre-configured.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Tag color="orange">CGST</Tag>
                      <Tag color="orange">SGST</Tag>
                      <Tag color="green">IGST</Tag>
                      <Tag color="blue">HSN Codes</Tag>
                    </div>
                  </div>
                )}
              </div>

              {/* TDS */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Switch checked={tdsEnabled} onChange={setTdsEnabled} />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>TDS/TCS Deductions</span>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Enable tax deducted/collected at source on vendor bills & invoices</div>
                  </div>
                </div>
              </div>

              {/* Bank Accounts */}
              <div>
                <SectionLabel>Bank Accounts</SectionLabel>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  Add your business bank accounts for reconciliation. You can add more later.
                </p>
                {bankAccounts.map((acc, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                    <Input placeholder="Bank Name" value={acc.bankName} onChange={e => updateBankAccount(i, 'bankName', e.target.value)} style={{ flex: 1, borderRadius: 8 }} />
                    <Input placeholder="Account Number" value={acc.accountNumber} onChange={e => updateBankAccount(i, 'accountNumber', e.target.value)} style={{ flex: 1, borderRadius: 8 }} />
                    <Input placeholder="IFSC Code" value={acc.ifsc} onChange={e => updateBankAccount(i, 'ifsc', e.target.value)} style={{ flex: 0.7, borderRadius: 8 }} />
                    <Button icon={<DeleteOutlined />} danger onClick={() => removeBankAccount(i)} style={{ borderRadius: 8 }} />
                  </div>
                ))}
                <Button icon={<PlusOutlined />} onClick={addBankAccount} style={{ borderRadius: 8 }}>
                  Add Bank Account
                </Button>
              </div>
            </Form>
          </div>
        )}

        {/* Review & Launch Step */}
        {currentStepKey === 'review' && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-1px' }}>
              Review & Launch
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 32 }}>
              Everything looks good. Here's a summary of your setup.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Company summary */}
              <ReviewCard title="Company Profile" items={[
                { label: 'Company', value: companyData.name || companyNameFromSignup || '—' },
                { label: 'GSTIN', value: companyData.gstin || '—' },
                { label: 'State', value: companyData.state || '—' },
                { label: 'Industry', value: companyData.industry || '—' },
              ]} />

              {hasHrms && (
                <ReviewCard title="HR Configuration" items={[
                  { label: 'Departments', value: `${departments.length} configured` },
                  { label: 'Leave Types', value: `${leaveTypes.length} types (CL, SL, EL, ML)` },
                  { label: 'PF', value: pfEnabled ? 'Enabled (12% + 12%)' : 'Disabled' },
                  { label: 'ESI', value: esiEnabled ? 'Enabled (0.75% + 3.25%)' : 'Disabled' },
                  { label: 'Professional Tax', value: ptEnabled ? 'Enabled' : 'Disabled' },
                ]} />
              )}

              {hasFinance && (
                <ReviewCard title="Finance Configuration" items={[
                  { label: 'Fiscal Year', value: 'April 2025 — March 2026' },
                  { label: 'Chart of Accounts', value: coaTemplate.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
                  { label: 'GST', value: gstRegistered ? 'Registered (CGST/SGST/IGST)' : 'Not Registered' },
                  { label: 'TDS/TCS', value: tdsEnabled ? 'Enabled' : 'Disabled' },
                  { label: 'Bank Accounts', value: `${bankAccounts.length} configured` },
                ]} />
              )}

              <div style={{
                padding: '20px 24px', background: 'rgba(0,200,83,0.04)', borderRadius: 16,
                border: '1px solid rgba(0,200,83,0.15)', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <CheckCircleFilled style={{ color: '#00C853', fontSize: 20 }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Ready to launch!</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    Your tenant will be provisioned with all the defaults. You can customize everything from Settings later.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--color-border)',
        }}>
          {currentStep > 0 ? (
            <Button size="large" onClick={handleBack} style={{ borderRadius: 10, fontWeight: 600, height: 48 }}>
              Back
            </Button>
          ) : <div />}

          {currentStepKey === 'review' ? (
            <Button
              type="primary" size="large" onClick={handleLaunch} loading={isSubmitting}
              style={{
                background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
                border: 'none', fontWeight: 700, height: 52, padding: '0 40px',
                borderRadius: 12, fontSize: 16,
                boxShadow: '0 8px 24px rgba(255,109,0,0.25)',
              }}
            >
              Launch My Company
            </Button>
          ) : (
            <Button
              type="primary" size="large" onClick={handleNext}
              style={{
                background: '#FF6D00', border: 'none', fontWeight: 600,
                height: 48, padding: '0 32px', borderRadius: 10,
              }}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{children}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>{children}</h4>;
}

function ComplianceToggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '16px 20px', borderRadius: 12,
      background: checked ? 'rgba(255,109,0,0.03)' : '#F9FAFB',
      border: `1px solid ${checked ? 'rgba(255,109,0,0.15)' : 'var(--color-border)'}`,
      transition: 'all 0.2s ease',
    }}>
      <Switch checked={checked} onChange={onChange} style={{ marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{description}</div>
      </div>
    </div>
  );
}

function ReviewCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', border: '1px solid var(--color-border)' }}>
      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircleFilled style={{ color: '#FF6D00', fontSize: 14 }} />
        {title}
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 32px' }}>
        {items.map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
