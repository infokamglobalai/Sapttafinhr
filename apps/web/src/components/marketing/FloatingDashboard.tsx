import { Tag } from 'antd';

/** Remote-style stacked UI cards on a grid canvas — Saptta brand colors */

export function HrmsFloatingDashboard({ shift }: { shift: 'day' | 'night' }) {
  const total = shift === 'day' ? '₹ 2,08,000' : '₹ 2,24,500';
  return (
    <div className="marketing-float-canvas" key={shift}>
      <div className="marketing-float-card marketing-float-card--profile">
        <Tag color="purple" className="marketing-float-card__tag">Payroll ready</Tag>
        <div className="marketing-float-card__avatar">PS</div>
        <strong>Hello, Priya</strong>
        <span className="marketing-mock__muted">Head of HR · 324 employees</span>
      </div>
      <div className="marketing-float-card marketing-float-card--chart">
        <div className="marketing-float-card__label">Payroll breakdown</div>
        <div className="marketing-float-bars">
          {[
            { label: 'Salary', w: '72%', c: '#1E2A78' },
            { label: 'PF/ESI', w: '48%', c: '#FF6D00' },
            { label: 'TDS', w: '32%', c: 'rgba(30,42,120,0.55)' },
          ].map((b) => (
            <div key={b.label} className="marketing-float-bar-row">
              <span>{b.label}</span>
              <div className="marketing-float-bar-track">
                <div className="marketing-float-bar-fill" style={{ width: b.w, background: b.c }} />
              </div>
            </div>
          ))}
        </div>
        <div className="marketing-float-card__total">Total payroll <strong>{total}</strong></div>
      </div>
      <div className="marketing-float-card marketing-float-card--timeline">
        <div className="marketing-float-card__label">This cycle</div>
        {[
          { label: 'Review attendance', done: true },
          { label: 'Run payroll', done: true },
          { label: 'Manager approval', done: shift === 'day' },
          { label: 'Disburse & file', done: false },
        ].map((step) => (
          <div key={step.label} className="marketing-float-step">
            <span className={`marketing-float-step__dot${step.done ? ' marketing-float-step__dot--done' : ''}`} />
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinanceFloatingDashboard({ item }: { item: 'payroll' | 'invoice' | 'subscription' }) {
  const meta = {
    payroll: { title: 'HRMS payroll post', amount: '₹ 2,08,000', sub: 'Debit & credit matched' },
    invoice: { title: 'GST invoice #2041', amount: '₹ 88,500', sub: 'Razorpay reconciled' },
    subscription: { title: 'Vendor payment', amount: '₹ 15,200', sub: 'Auto-debit cleared' },
  }[item];

  return (
    <div className="marketing-float-canvas" key={item}>
      <div className="marketing-float-card marketing-float-card--tabs">
        <div className="marketing-float-tabs">
          <span className="active">Ledger</span>
          <span>GST</span>
          <span>Bank</span>
        </div>
        <div className="marketing-float-table">
          <div className="marketing-float-table__head">
            <span>Account</span>
            <span>Amount</span>
          </div>
          {[
            { name: 'Salary expense', amt: meta.amount },
            { name: 'Payable / Bank', amt: meta.amount },
          ].map((row) => (
            <div key={row.name} className="marketing-float-table__row">
              <span>{row.name}</span>
              <strong>{row.amt}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="marketing-float-card marketing-float-card--chart">
        <div className="marketing-float-card__label">{meta.title}</div>
        <div className="marketing-float-card__total" style={{ marginTop: 8 }}>
          <strong style={{ fontSize: '1.35rem' }}>{meta.amount}</strong>
        </div>
        <p className="marketing-mock__muted" style={{ marginTop: 8 }}>{meta.sub}</p>
        <Tag color="green" style={{ marginTop: 12 }}>Balanced ✓</Tag>
      </div>
    </div>
  );
}
