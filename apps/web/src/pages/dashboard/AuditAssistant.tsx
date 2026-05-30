import { useState, useRef, useEffect } from 'react';
import { Input, Button, Tag } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, BulbOutlined, ThunderboltOutlined } from '@ant-design/icons';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

const STARTER_PROMPTS = [
  'Run a compliance check on last month\'s payroll',
  'Summarize outstanding receivables with aging',
  'Check for duplicate invoice entries this quarter',
  'Identify employees with > 3 late marks this month',
  'Generate GST reconciliation summary for April',
  'Flag any journal entries that violate double-entry rules',
];

const AI_RESPONSES: Record<string, string> = {
  'payroll': `**Payroll Compliance Audit — April 2026**

I've analyzed payroll data for 10 employees. Here are the findings:

**PF Compliance** — All 10 employees have PF deductions correctly calculated at 12% of Basic (capped at ₹15,000).

**ESI Compliance** — 4 employees qualify (salary ≤ ₹21,000). Deductions verified at 0.75% employee + 3.25% employer.

**Professional Tax** — 8 employees in Karnataka slab (₹200/month). 2 employees exempt (salary < ₹15,000).

**Issues Found:**
1. Employee SAP-009 (Deepak Singh): ESI contribution seems ₹48 short. Recommend recalculating based on updated gross.
2. Employee SAP-008 (Kavitha Nair): Probation period payroll — confirm if PF registration is complete.

**TDS:** All TDS computations match declared investment proofs. No discrepancies.

✅ Overall: 2 minor items need attention. No critical violations.`,

  'receivables': `**Accounts Receivable Summary — As of 27 May 2026**

| Customer | Outstanding | Days Overdue | Risk |
|----------|------------|-------------|------|
| TechCorp India | ₹1,88,500 | 22 days | **High** |
| GreenLeaf Exports | ₹94,200 | 15 days | Medium |
| QuickServe Logistics | ₹41,299 | Current | Low |

**Total Outstanding:** ₹3,23,999
**Overdue (>30 days):** ₹0
**Overdue (0-30 days):** ₹1,88,500

**Recommendation:** Send a follow-up to TechCorp India — their INV-2026-001 (₹2,06,500) has only ₹18,000 paid. Consider offering a 2% early payment discount to accelerate collection.`,

  'duplicate': `**Duplicate Invoice Scan — Q1 FY26**

Scanned 5 invoices for potential duplicates based on: party + amount + date proximity (±3 days).

**Result: No duplicates found.**

All invoices have unique combinations of:
- Invoice number sequence (INV-2026-001 through 005)
- Party + amount pairs
- HSN code + quantity combinations

✅ Clean — no duplicate or suspicious entries detected.`,

  'late': `**Late Attendance Report — May 2026**

Employees with 3+ late marks this month:

| Employee | Late Marks | Pattern |
|----------|-----------|---------|
| Amit Kumar (SAP-003) | 4 | Consistently late on Mondays (post-weekend pattern) |
| Deepak Singh (SAP-009) | 3 | Late arrivals on field visit return days |

**Recommendations:**
1. **Amit Kumar:** Schedule a manager conversation. Consider flexible start time if role permits.
2. **Deepak Singh:** Field visits causing late next-day arrivals — consider adjusting shift for field days.

All other employees have ≤ 2 late marks. Company average: 1.2 late marks/employee/month.`,

  'default': `I've analyzed your request across the HRMS and Finance modules. Here's what I found:

**System Health:**
- Double-entry integrity: ✅ All journal entries balanced (Σ Debit = Σ Credit)
- Period lock: ✅ Books closed through March 2026
- Employee data completeness: 98% (1 missing ESI number)
- Invoice sequence: ✅ No gaps in numbering

**Key Metrics:**
- Payroll cost ratio: 72% of revenue (industry avg: 65%)
- AR turnover: 45 days (needs improvement)
- Current ratio: 2.1:1 (healthy)

Would you like me to drill deeper into any of these areas?`,
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('payroll') || lower.includes('compliance')) return AI_RESPONSES['payroll'];
  if (lower.includes('receivable') || lower.includes('outstanding') || lower.includes('aging')) return AI_RESPONSES['receivables'];
  if (lower.includes('duplicate') || lower.includes('invoice entries')) return AI_RESPONSES['duplicate'];
  if (lower.includes('late') || lower.includes('attendance')) return AI_RESPONSES['late'];
  return AI_RESPONSES['default'];
}

export default function AuditAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm0', role: 'assistant', timestamp: new Date().toISOString(),
      content: 'Hello! I\'m your AI Audit Assistant powered by Claude. I can analyze your HRMS and Finance data to find compliance issues, anomalies, and insights. What would you like me to look into?',
      suggestions: STARTER_PROMPTS.slice(0, 4),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: 'u_' + Date.now(), role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getResponse(text);
      const aiMsg: Message = {
        id: 'a_' + Date.now(), role: 'assistant', content: response, timestamp: new Date().toISOString(),
        suggestions: ['Run another check', 'Export this report', 'Show me more details'],
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxHeight: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThunderboltOutlined style={{ color: '#FF6D00' }} />
            AI Audit Assistant
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Powered by Claude — analyzes HRMS & Finance data for compliance, anomalies & insights</p>
        </div>
        <Tag color="orange" style={{ fontSize: 11, borderRadius: 8, padding: '4px 12px' }}>Beta</Tag>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, background: '#FFFFFF', borderRadius: 16, border: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'linear-gradient(135deg, #0B0F19, #1A202C)' : 'linear-gradient(135deg, #FF6D00, #FFA000)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14,
              }}>
                {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
              </div>
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  padding: '14px 18px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#0B0F19' : '#F9FAFB',
                  color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                  fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                }}>
                  {msg.content}
                </div>
                {msg.suggestions && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {msg.suggestions.map(s => (
                      <button key={s} onClick={() => sendMessage(s)} style={{
                        background: 'rgba(255,109,0,0.06)', border: '1px solid rgba(255,109,0,0.15)',
                        borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#FF6D00', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,109,0,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,109,0,0.06)'; }}
                      >
                        <BulbOutlined style={{ marginRight: 4 }} />{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6D00, #FFA000)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>
                <RobotOutlined />
              </div>
              <div style={{ padding: '14px 18px', borderRadius: '16px 16px 16px 4px', background: '#F9FAFB', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6D00', animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={() => sendMessage(input)}
            placeholder="Ask about payroll compliance, invoice audits, attendance patterns..."
            size="large"
            style={{ borderRadius: 10 }}
            disabled={isTyping}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            size="large"
            style={{ background: '#FF6D00', border: 'none', borderRadius: 10, width: 48 }}
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
