import { useState } from 'react';
import { Table, Tag, Button, Modal, Tabs, message } from 'antd';
import { PlayCircleOutlined, DownloadOutlined, EyeOutlined, CheckCircleFilled } from '@ant-design/icons';
import { MOCK_PAYROLL_RUNS, MOCK_PAYSLIPS, formatINR, type PayrollRun, type Payslip } from '../../data/hrms-mock';

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: 'Draft' },
  processing: { color: 'blue', label: 'Processing' },
  completed: { color: 'green', label: 'Completed' },
  paid: { color: 'purple', label: 'Paid' },
};

export default function Payroll() {
  const [runs, setRuns] = useState<PayrollRun[]>(MOCK_PAYROLL_RUNS);
  const [payslips] = useState<Payslip[]>(MOCK_PAYSLIPS);
  const [viewPayslip, setViewPayslip] = useState<Payslip | null>(null);
  const [tab, setTab] = useState('runs');

  const handleRunPayroll = (runId: string) => {
    Modal.confirm({
      title: 'Run May 2026 Payroll?',
      content: 'This will calculate salary, PF, ESI, PT, and TDS for all active employees. The run can be reviewed before marking as paid.',
      okText: 'Process Payroll',
      okButtonProps: { style: { background: '#FF6D00', border: 'none', fontWeight: 600 } },
      onOk: () => {
        const totalGross = payslips.reduce((s, p) => s + p.grossEarnings, 0);
        const totalDed = payslips.reduce((s, p) => s + p.totalDeductions, 0);
        const totalNet = payslips.reduce((s, p) => s + p.netPay, 0);
        setRuns(prev => prev.map(r => r.id === runId ? {
          ...r, status: 'completed' as const,
          totalGross, totalDeductions: totalDed, totalNet,
          employeeCount: payslips.length,
          processedOn: new Date().toISOString().split('T')[0],
        } : r));
        message.success('Payroll processed successfully for 10 employees!');
      },
    });
  };

  const runColumns = [
    {
      title: 'Period', key: 'period',
      render: (_: unknown, r: PayrollRun) => (
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{r.month} {r.year}</span>
      ),
    },
    {
      title: 'Status', key: 'status',
      render: (_: unknown, r: PayrollRun) => <Tag color={statusConfig[r.status].color} style={{ fontSize: 11, borderRadius: 6 }}>{statusConfig[r.status].label}</Tag>,
    },
    {
      title: 'Employees', dataIndex: 'employeeCount', key: 'count',
      render: (v: number) => <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Gross', key: 'gross',
      render: (_: unknown, r: PayrollRun) => <span style={{ fontSize: 13, fontWeight: 600 }}>{r.totalGross > 0 ? formatINR(r.totalGross) : '—'}</span>,
    },
    {
      title: 'Deductions', key: 'ded',
      render: (_: unknown, r: PayrollRun) => <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>{r.totalDeductions > 0 ? formatINR(r.totalDeductions) : '—'}</span>,
    },
    {
      title: 'Net Pay', key: 'net',
      render: (_: unknown, r: PayrollRun) => <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{r.totalNet > 0 ? formatINR(r.totalNet) : '—'}</span>,
    },
    {
      title: '', key: 'actions', width: 160,
      render: (_: unknown, r: PayrollRun) => r.status === 'draft' ? (
        <Button icon={<PlayCircleOutlined />} onClick={() => handleRunPayroll(r.id)}
          style={{ background: '#FF6D00', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Run Payroll
        </Button>
      ) : (
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Download</Button>
      ),
    },
  ];

  const payslipColumns = [
    {
      title: 'Employee', key: 'employee',
      render: (_: unknown, r: Payslip) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#FF6D00' }}>
            {r.employeeName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.employeeName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.empCode}</div>
          </div>
        </div>
      ),
    },
    { title: 'Basic', key: 'basic', render: (_: unknown, r: Payslip) => <span style={{ fontSize: 13 }}>{formatINR(r.basic)}</span> },
    { title: 'HRA', key: 'hra', render: (_: unknown, r: Payslip) => <span style={{ fontSize: 13 }}>{formatINR(r.hra)}</span> },
    { title: 'Gross', key: 'gross', render: (_: unknown, r: Payslip) => <span style={{ fontSize: 13, fontWeight: 600 }}>{formatINR(r.grossEarnings)}</span> },
    { title: 'PF', key: 'pf', render: (_: unknown, r: Payslip) => <span style={{ fontSize: 13, color: '#EF4444' }}>{formatINR(r.pfEmployee)}</span> },
    { title: 'TDS', key: 'tds', render: (_: unknown, r: Payslip) => <span style={{ fontSize: 13, color: '#EF4444' }}>{formatINR(r.tds)}</span> },
    { title: 'Net Pay', key: 'net', render: (_: unknown, r: Payslip) => <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{formatINR(r.netPay)}</span> },
    {
      title: '', key: 'view', width: 80,
      render: (_: unknown, r: Payslip) => (
        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setViewPayslip(r)} style={{ color: '#FF6D00' }} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px' }}>Payroll</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Process salary, view payslips, and manage statutory deductions.</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total PF (Employer)', value: formatINR(payslips.reduce((s, p) => s + p.pfEmployer, 0)), color: '#6366F1' },
          { label: 'Total ESI (Employer)', value: formatINR(payslips.reduce((s, p) => s + p.esiEmployer, 0)), color: '#0EA5E9' },
          { label: 'Total TDS', value: formatINR(payslips.reduce((s, p) => s + p.tds, 0)), color: '#EF4444' },
          { label: 'Total Net Payout', value: formatINR(payslips.reduce((s, p) => s + p.netPay, 0)), color: '#10B981' },
        ].map(card => (
          <div key={card.label} style={{ background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: card.color, letterSpacing: '-0.5px' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'runs',
          label: 'Payroll Runs',
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table dataSource={runs} columns={runColumns} rowKey="id" pagination={false} size="middle" />
            </div>
          ),
        },
        {
          key: 'payslips',
          label: 'Payslips (April 2026)',
          children: (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <Table dataSource={payslips} columns={payslipColumns} rowKey="id" pagination={{ pageSize: 10 }} size="middle" />
            </div>
          ),
        },
      ]} />

      {/* Payslip detail modal */}
      <Modal
        open={!!viewPayslip} onCancel={() => setViewPayslip(null)} footer={null} width={560}
        title={<span style={{ fontWeight: 700 }}>Payslip — {viewPayslip?.employeeName}</span>}
      >
        {viewPayslip && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '16px', background: '#F9FAFB', borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Employee</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{viewPayslip.employeeName}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{viewPayslip.empCode}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Period</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{viewPayslip.month} {viewPayslip.year}</div>
              </div>
            </div>

            <SlipSection title="Earnings" items={[
              { label: 'Basic Salary', value: formatINR(viewPayslip.basic) },
              { label: 'HRA', value: formatINR(viewPayslip.hra) },
              { label: 'Conveyance', value: formatINR(viewPayslip.conveyance) },
              { label: 'Special Allowance', value: formatINR(viewPayslip.specialAllowance) },
            ]} total={{ label: 'Gross Earnings', value: formatINR(viewPayslip.grossEarnings), color: '#0A1128' }} />

            <SlipSection title="Deductions" items={[
              { label: 'PF (Employee 12%)', value: formatINR(viewPayslip.pfEmployee) },
              { label: 'ESI (Employee 0.75%)', value: viewPayslip.esiEmployee > 0 ? formatINR(viewPayslip.esiEmployee) : '—' },
              { label: 'Professional Tax', value: viewPayslip.professionalTax > 0 ? formatINR(viewPayslip.professionalTax) : '—' },
              { label: 'TDS', value: formatINR(viewPayslip.tds) },
            ]} total={{ label: 'Total Deductions', value: formatINR(viewPayslip.totalDeductions), color: '#EF4444' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderTop: '2px dashed var(--color-border)', marginTop: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>Net Pay</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#10B981' }}>{formatINR(viewPayslip.netPay)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,109,0,0.04)', borderRadius: 10, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Employer PF: {formatINR(viewPayslip.pfEmployer)}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Employer ESI: {viewPayslip.esiEmployer > 0 ? formatINR(viewPayslip.esiEmployer) : '—'}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SlipSection({ title, items, total }: {
  title: string;
  items: { label: string; value: string }[];
  total: { label: string; value: string; color: string };
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{title}</div>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.value}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--color-border)', marginTop: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: total.color }}>{total.label}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: total.color }}>{total.value}</span>
      </div>
    </div>
  );
}
