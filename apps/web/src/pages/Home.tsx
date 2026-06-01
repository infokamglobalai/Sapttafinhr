import { useEffect, useRef, useState } from 'react';
import { Button, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  WalletOutlined,
  CalendarOutlined,
  TrophyOutlined,
  DollarCircleOutlined,
  LineChartOutlined,
  FundProjectionScreenOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  CloudServerOutlined,
  AuditOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import CTABanner from '../components/shared/CTABanner';
import { useInView, useInViewMulti } from '../hooks/useInView';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import SecurityIllustration from '../components/marketing/SecurityIllustration';
import MarketingImageFrame from '../components/marketing/MarketingImageFrame';
import { getMarketingImageSrc } from '../data/marketing-images';

function HeroCarousel() {
  const navigate = useNavigate();
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const isTablet = viewportWidth >= 992 && viewportWidth < 1280;
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setIsMobile(window.innerWidth < 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [rotatingIndex, setRotatingIndex] = useState(0);
  const rotatingWords = ['manage & grow', 'automate & scale', 'unify & streamline', 'empower & run'];

  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const goToAuth = (product: 'hrms' | 'finance', nextPath: string) => {
    navigate(`/login?product=${product}&next=${encodeURIComponent(nextPath)}`);
  };

  return (
    <section className="responsive-padding home-hero" style={{
      minHeight: isMobile ? 'auto' : '68vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '20px 12px 18px' : isTablet ? '28px 16px 22px' : '34px 18px 24px',
      borderBottom: '1px solid #EAECEF',
      background: 'linear-gradient(180deg, #FFFFFF 0%, #FCFCFF 100%)',
      justifyContent: 'flex-start',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: -120,
        right: -110,
        width: 340,
        height: 340,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, rgba(79,70,229,0) 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -180,
        left: -160,
        width: 360,
        height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,151,241,0.10) 0%, rgba(37,151,241,0) 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 12 : isTablet ? 12 : 18,
        width: '100%',
        maxWidth: 1360,
        margin: '0 auto',
      }}>
        <ScrollReveal animation="fade-in-left">
        <div style={{
          flex: isTablet ? '0 0 42%' : '0 0 41%',
          maxWidth: isMobile ? '100%' : isTablet ? 500 : 560,
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <p className="home-hero-tagline" style={{ textAlign: isMobile ? 'center' : 'left' }}>
            One Platform. Every Workforce &amp; Finance Workflow.
          </p>
          <h1 className="home-hero-title" style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <span style={{ display: 'block', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>Everything you need to</span>
            <span style={{ display: 'block' }}>
              <span className="home-hero-highlight animate-word-rotator" style={{ whiteSpace: isMobile ? 'normal' : 'nowrap' }}>
                {rotatingWords[rotatingIndex]}
              </span>
            </span>
            <span style={{ display: 'block' }}>
              your business
            </span>
          </h1>
          <p className="home-hero-subtitle" style={{ marginLeft: isMobile ? 'auto' : 0, marginRight: isMobile ? 'auto' : undefined, textAlign: isMobile ? 'center' : 'left' }}>
            Saptta simplifies HR, payroll, accounting, and compliance so you can focus on building a productive team and a successful business.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: isMobile ? 'center' : 'flex-start' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}>
              {['PF', 'ESI', 'TDS', 'GST Ready', 'Razorpay', 'Bank Reco', 'API Access'].map((chip) => (
                <span key={chip} className="home-hero-chip">
                  {chip}
                </span>
              ))}
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}>
              <button
                onClick={() => navigate('/hrms')}
                style={{
                  border: '1px solid #D8E0FA',
                  background: '#EEF2FF',
                  color: '#1E2A78',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '7px 12px',
                  cursor: 'pointer',
                }}
              >
                Explore HRMS
              </button>
              <button
                onClick={() => navigate('/accounts')}
                style={{
                  border: '1px solid #D7F0E1',
                  background: '#EAFBF3',
                  color: '#1C8D58',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '7px 12px',
                  cursor: 'pointer',
                }}
              >
                Explore Accounts
              </button>
              <button
                onClick={() => navigate('/contact')}
                style={{
                  border: '1px solid #E5EAF5',
                  background: '#FFFFFF',
                  color: '#374151',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '7px 12px',
                  cursor: 'pointer',
                }}
              >
                Book Demo
              </button>
            </div>
          </div>
        </div>
        </ScrollReveal>
        <div style={{
          flex: isTablet ? '0 0 60%' : '0 0 62%',
          width: '100%',
          maxWidth: isMobile ? 760 : 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ScrollReveal animation="fade-in-up" delay={120}>
          <div style={{
            width: '100%',
            border: 'none',
            borderRadius: isMobile ? 16 : 22,
            background: 'transparent',
            padding: isMobile ? 8 : isTablet ? 10 : 12,
            boxShadow: 'none',
          }}>
            <div className="home-hero-mock-dashboard" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 14 }}>
              <div style={{ border: 'none', borderRadius: 14, overflow: 'visible', background: 'transparent', boxShadow: 'none' }}>
                <button onClick={() => goToAuth('hrms', '/app/hrms')} style={{ width: '100%', background: 'linear-gradient(90deg, #E0E7FF, #EEF2FF)', color: '#1E2A78', fontSize: 15, fontWeight: 900, padding: '10px 14px', textAlign: 'center', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 900 }}>
                    <UserOutlined style={{ fontSize: 16 }} />
                    HRMS
                  </span>
                </button>
                <div style={{ padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, minmax(64px, auto))', gap: 8 }}>
                  <button onClick={() => goToAuth('hrms', '/app/hrms/employees')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 8, textAlign: 'left', background: '#FFFFFF', cursor: 'pointer', minHeight: 86 }}>
                    <div style={{ color: '#1E2A78', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>Employees</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#EEF2FF', color: '#1E2A78', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><UserOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>324</div>
                        <div style={{ fontSize: 11, color: '#4338CA', fontWeight: 800 }}>Total Employees</div>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => goToAuth('hrms', '/app/hrms/payroll')} style={{ gridColumn: 2, gridRow: '1 / span 3', border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 8, textAlign: 'center', background: '#FFFFFF', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#1E2A78', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Payroll</div>
                    <div style={{ flex: 1, minHeight: 132, borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(180deg, #F5F8FF 0%, #ECF2FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                      <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(30,42,120,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <span style={{ fontSize: 34, lineHeight: 1 }}>👨‍💼</span>
                        <div style={{ position: 'absolute', bottom: -8, width: 68, height: 40, background: '#DDE6FF', borderRadius: 8, transform: 'rotate(-12deg)', border: '1px solid rgba(30,42,120,0.24)' }} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8, color: '#4338CA', fontSize: 11, fontWeight: 800 }}>Payroll Processed</div>
                    <div style={{ color: '#0F172A', fontWeight: 800, fontSize: 15, marginTop: 2 }}>$120,000</div>
                  </button>

                  <button onClick={() => goToAuth('hrms', '/app/hrms/attendance')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 8, textAlign: 'left', background: '#FFFFFF', cursor: 'pointer', minHeight: 86 }}>
                    <div style={{ color: '#1E2A78', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>Attendance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#EEF2FF', color: '#1E2A78', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CalendarOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>98%</div>
                        <div style={{ fontSize: 11, color: '#4338CA', fontWeight: 800 }}>This Month</div>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => goToAuth('hrms', '/app/hrms/leave')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 8, textAlign: 'left', background: '#FFFFFF', cursor: 'pointer', minHeight: 86 }}>
                    <div style={{ color: '#1E2A78', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>Leave Requests</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#EEF2FF', color: '#1E2A78', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><WalletOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>18</div>
                        <div style={{ fontSize: 11, color: '#4338CA', fontWeight: 800 }}>Pending</div>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => goToAuth('hrms', '/app/hrms/performance')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 8, textAlign: 'left', background: '#FFFFFF', cursor: 'pointer', minHeight: 86 }}>
                    <div style={{ color: '#1E2A78', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>Performance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#EEF2FF', color: '#1E2A78', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><TrophyOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>4.6 / 5</div>
                        <div style={{ fontSize: 11, color: '#4338CA', fontWeight: 800 }}>Average Rating</div>
                      </div>
                    </div>
                  </button>

                  <button onClick={() => goToAuth('hrms', '/app/hrms/team')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 8, textAlign: 'left', background: '#FFFFFF', cursor: 'pointer', minHeight: 86 }}>
                    <div style={{ color: '#1E2A78', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Recognition</div>
                    <div style={{ height: 54, borderRadius: 10, background: '#F8FAFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#E2E9FF', color: '#1E2A78', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}><TrophyOutlined /></span>
                      <span style={{ color: '#4338CA', fontSize: 11, fontWeight: 800 }}>Recognition</span>
                    </div>
                  </button>
                </div>
              </div>

              <div style={{ border: 'none', borderRadius: 14, overflow: 'visible', background: 'transparent', boxShadow: 'none' }}>
                <button onClick={() => goToAuth('finance', '/app/finance')} style={{ width: '100%', background: 'linear-gradient(90deg, #D1FAE5, #ECFDF5)', color: '#047857', fontSize: 15, fontWeight: 900, padding: '10px 14px', textAlign: 'center', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 900 }}>
                    <DollarCircleOutlined style={{ fontSize: 16 }} />
                    ACCOUNTS
                  </span>
                </button>
                <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => goToAuth('finance', '/app/finance/invoices')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 10, textAlign: 'left', cursor: 'pointer', background: '#FFFFFF' }}>
                    <div style={{ color: '#047857', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Total Income</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAFBF3', color: '#047857', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><DollarCircleOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>$250,000</div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>This Month</div>
                      </div>
                    </div>
                  </button>
                  <button onClick={() => goToAuth('finance', '/app/finance/purchase')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 10, textAlign: 'left', cursor: 'pointer', background: '#FFFFFF' }}>
                    <div style={{ color: '#047857', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Total Expenses</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAFBF3', color: '#047857', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CreditCardOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>$120,000</div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>This Month</div>
                      </div>
                    </div>
                  </button>
                  <button onClick={() => goToAuth('finance', '/app/finance/ledger')} style={{ gridColumn: '1 / span 2', border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 12, textAlign: 'left', cursor: 'pointer', background: '#FFFFFF' }}>
                    <div style={{ color: '#047857', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Cash Flow</div>
                    <div style={{ marginTop: 4, height: 62, borderRadius: 8, background: 'linear-gradient(180deg, #F7FFFA 0%, #EDFFF4 100%)', position: 'relative', overflow: 'hidden' }}>
                      <svg viewBox="0 0 220 62" width="100%" height="100%" preserveAspectRatio="none">
                        <path d="M0,46 C18,34 34,52 52,40 C70,29 86,44 104,33 C122,21 138,38 156,27 C176,14 194,36 220,20" fill="none" stroke="#10B981" strokeWidth="2.8" />
                      </svg>
                    </div>
                    <div style={{ color: '#065F46', fontWeight: 800, marginTop: 8, fontSize: 16 }}>+$130,000</div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>This Month</div>
                  </button>
                  <button onClick={() => goToAuth('finance', '/app/finance/receipts')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 10, textAlign: 'left', cursor: 'pointer', background: '#FFFFFF' }}>
                    <div style={{ color: '#047857', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Receivables</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAFBF3', color: '#047857', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><FundProjectionScreenOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>$75,000</div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>Overdue</div>
                      </div>
                    </div>
                  </button>
                  <button onClick={() => goToAuth('finance', '/app/finance/purchase')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 10, textAlign: 'left', cursor: 'pointer', background: '#FFFFFF' }}>
                    <div style={{ color: '#047857', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Payables</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAFBF3', color: '#047857', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CreditCardOutlined /></span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>$45,000</div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>Due Soon</div>
                      </div>
                    </div>
                  </button>
                  <button onClick={() => goToAuth('finance', '/app/finance/reports')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 10, textAlign: 'left', cursor: 'pointer', background: '#FFFFFF' }}>
                    <div style={{ color: '#047857', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>GST Filing Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAFBF3', color: '#047857', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✓</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>GSTR-1 94%</div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>5 invoices pending review</div>
                      </div>
                    </div>
                  </button>
                  <button onClick={() => goToAuth('finance', '/app/finance/banking')} style={{ border: '1px solid rgba(235,239,248,0.95)', borderRadius: 12, padding: 10, textAlign: 'left', cursor: 'pointer', background: '#FFFFFF' }}>
                    <div style={{ color: '#047857', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Bank Reconciliation</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#EAFBF3', color: '#047857', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>≡</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#065F46' }}>82% matched</div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>12 entries need action</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function AiChatWidget() {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { sender: 'assistant', text: "Hello! I'm your Saptta AI assistant. Ask me anything about your payroll, compliance, or ledgers." }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const prompts = [
    { label: "Check PF compliance", query: "Check if our employee Provident Fund contributions are compliant this month.", response: "Auditing current payroll rosters... Active staff: 324. PF statutory contributions calculated at 12% of basic salary. Alert: 2 employees (ID: SP-1082, SP-1094) have mismatched UAN numbers. Otherwise, all contributions are compliant." },
    { label: "Show overdue receivables", query: "Show overdue receivables this month.", response: "Fetching ledger receivables... Total overdue: $75,000. Top debtors: 1. Acma Corp ($45,000, 12 days overdue), 2. ZenTech Solutions ($30,000, 8 days overdue). Recommended action: Send Razorpay reminder links." },
    { label: "Predict next month cashflow", query: "Predict next month's cash flow.", response: "Running Cash Flow Predictive Model... Based on ledger history: Estimated Inflow: $285,000. Estimated Outflow (Payroll + Bills): $145,000. Predicted Net Surplus: +$140,000. Cash reserves will remain strong." }
  ];

  const handlePromptClick = (prompt: typeof prompts[0]) => {
    if (isTyping) return;
    setMessages(prev => [...prev, { sender: 'user', text: prompt.query }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'assistant', text: prompt.response }]);
    }, 1500);
  };

  return (
    <div className="ai-showcase-chat">
      <div className="ai-showcase-header">
        <div className="ai-showcase-avatar">✨</div>
        <div>
          <div className="ai-showcase-title">Ask Saptta AI</div>
        </div>
        <div className="ai-showcase-status">Live Auditor</div>
      </div>
      <div className="ai-showcase-messages">
        {messages.map((m, idx) => (
          <div key={idx} className={`ai-msg ai-msg--${m.sender}`}>
            {m.text}
          </div>
        ))}
        {isTyping && (
          <div className="ai-msg ai-msg--assistant" style={{ padding: '8px 12px' }}>
            <div className="ai-typing-indicator">
              <span className="ai-typing-dot"></span>
              <span className="ai-typing-dot"></span>
              <span className="ai-typing-dot"></span>
            </div>
          </div>
        )}
      </div>
      <div className="ai-showcase-actions">
        {prompts.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handlePromptClick(p)}
            className="ai-action-chip"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}



/* ─────────────────────────────────────────────────────────
   METRICS SECTION — Animated SaaS stats, dark navy + glass
   ───────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);
  return count;
}

const metricsData = [
  {
    icon: '👥',
    value: 50000,
    suffix: '+',
    label: 'Employees Managed',
    sublabel: 'Active employees across all platforms',
    color: '#818CF8',
    glow: 'rgba(99,102,241,0.45)',
    accent: 'rgba(99,102,241,0.15)',
  },
  {
    icon: '⚡',
    value: 99.9,
    suffix: '%',
    label: 'Platform Uptime',
    sublabel: 'Enterprise-grade reliability SLA',
    color: '#34D399',
    glow: 'rgba(16,185,129,0.45)',
    accent: 'rgba(16,185,129,0.12)',
    isDecimal: true,
  },
  {
    icon: '💰',
    value: 10,
    suffix: 'M+',
    label: 'Payroll Processed',
    sublabel: 'Total transactions handled',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.45)',
    accent: 'rgba(245,158,11,0.12)',
  },
  {
    icon: '🚀',
    value: 95,
    suffix: '%',
    label: 'Faster Recruitment',
    sublabel: 'Reduced time-to-hire vs manual',
    color: '#F472B6',
    glow: 'rgba(236,72,153,0.45)',
    accent: 'rgba(236,72,153,0.12)',
  },
  {
    icon: '🏢',
    value: 5000,
    suffix: '+',
    label: 'Companies',
    sublabel: 'SMBs to enterprise clients',
    color: '#38BDF8',
    glow: 'rgba(56,189,248,0.45)',
    accent: 'rgba(56,189,248,0.12)',
  },
];

function MetricCard({
  metric,
  isMobile,
  started,
}: {
  metric: typeof metricsData[0];
  isMobile: boolean;
  started: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const count = useCountUp(
    metric.isDecimal ? 999 : metric.value,
    2200,
    started
  );

  const displayValue = metric.isDecimal
    ? (count / 10).toFixed(1)
    : count >= 1000
    ? count >= 10000
      ? `${Math.floor(count / 1000)}K`
      : count.toLocaleString('en-IN')
    : count;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 24,
        padding: isMobile ? '28px 20px' : '36px 28px',
        background: hovered ? '#FFFFFF' : '#FFFFFF',
        border: hovered
          ? `1px solid ${metric.color}55`
          : '1px solid #E8ECF4',
        boxShadow: hovered
          ? `0 0 0 1px ${metric.color}22, 0 20px 44px rgba(30,42,120,0.10), 0 0 40px ${metric.glow}`
          : '0 8px 24px rgba(30,42,120,0.06)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMobile ? 'center' : 'flex-start',
        textAlign: isMobile ? 'center' : 'left',
      }}
    >
      {/* Background glow blob */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: metric.accent,
        filter: 'blur(50px)',
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.35s ease',
      }} />

      {/* Icon badge */}
      <div style={{
        width: isMobile ? 48 : 56,
        height: isMobile ? 48 : 56,
        borderRadius: 16,
        background: metric.accent,
        border: `1px solid ${metric.color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? 22 : 26,
        marginBottom: 20,
        boxShadow: hovered ? `0 0 24px ${metric.glow}` : 'none',
        transition: 'box-shadow 0.35s ease',
        flexShrink: 0,
      }}>
        {metric.icon}
      </div>

      {/* Animated number */}
      <div style={{
        fontSize: isMobile ? 38 : 52,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-0.035em',
        color: '#0F172A',
        marginBottom: 4,
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        textShadow: 'none',
        transition: 'text-shadow 0.35s ease',
      }}>
        {displayValue}
        <span style={{ color: metric.color, marginLeft: 2 }}>{metric.suffix}</span>
      </div>

      {/* Label */}
      <div style={{
        fontSize: isMobile ? 15 : 17,
        fontWeight: 700,
        color: '#1E293B',
        marginBottom: 6,
        letterSpacing: '-0.01em',
      }}>
        {metric.label}
      </div>

      {/* Sublabel */}
      <div style={{
        fontSize: 13,
        fontWeight: 400,
        color: '#64748B',
        lineHeight: 1.5,
      }}>
        {metric.sublabel}
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '10%',
        width: '80%',
        height: 2,
        borderRadius: 99,
        background: `linear-gradient(90deg, transparent, ${metric.color}88, transparent)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }} />
    </div>
  );
}

function MetricsSection({ isMobile }: { isMobile: boolean }) {
  const { ref: sectionRef, inView } = useInView(0.2);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (inView && !started) setStarted(true);
  }, [inView, started]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: isMobile ? '80px 20px' : '120px 40px',
      }}
    >
      {/* ── Floating ambient orbs (hero-style) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -120, right: -80,
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, rgba(79,70,229,0) 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -60,
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,151,241,0.10) 0%, rgba(37,151,241,0) 70%)',
        }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 48 : 72 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#EEE8FF',
            border: '1px solid #D8E0FA',
            borderRadius: 999,
            padding: '6px 16px',
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6C3BFF', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6C3BFF' }}>
              Platform Impact
            </span>
          </div>
          <h2 style={{
            fontSize: isMobile ? 28 : 44,
            fontWeight: 900,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Numbers That Speak for Themselves
          </h2>
          <p style={{
            fontSize: isMobile ? 15 : 18,
            color: '#64748B',
            maxWidth: 520,
            margin: '0 auto',
            lineHeight: 1.65,
          }}>
            Join thousands of businesses that trust Saptta to run their HR, payroll and finance operations.
          </p>
        </div>

        {/* Metrics grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr 1fr'
            : 'repeat(5, 1fr)',
          gap: isMobile ? 14 : 20,
        }}>
          {metricsData.map((metric) => (
            <MetricCard
              key={metric.label}
              metric={metric}
              isMobile={isMobile}
              started={started}
            />
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div style={{
          marginTop: isMobile ? 48 : 72,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 16 : 24,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 16, color: '#64748B', margin: 0 }}>
            Ready to add your company to these numbers?
          </p>
          <button
            onClick={() => {}}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #6C3BFF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 999,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(108,59,255,0.25)',
              letterSpacing: '0.02em',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 14px 32px rgba(108,59,255,0.32)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.transform = '';
              (e.target as HTMLButtonElement).style.boxShadow = '0 10px 24px rgba(108,59,255,0.25)';
            }}
          >
            Start Free Trial →
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   PRODUCT SHOWCASE SECTION — Left content / Right dashboard
   ───────────────────────────────────────────────────────── */

const showcaseFeatures = [
  { icon: '🤖', label: 'AI Recruitment', desc: 'Screen resumes and match candidates automatically', color: '#6C3BFF' },
  { icon: '💵', label: 'Payroll Automation', desc: 'One-click payroll with built-in PF, ESI & TDS', color: '#10B981' },
  { icon: '📅', label: 'Attendance Tracking', desc: 'Biometric and geo-fenced attendance in real-time', color: '#3B82F6' },
  { icon: '📊', label: 'Finance Management', desc: 'Ledgers, GST, invoicing and bank reconciliation', color: '#F59E0B' },
  { icon: '🛡️', label: 'Compliance', desc: 'Auto-generate statutory reports and filings', color: '#EF4444' },
];

function ProductShowcaseSection({ isMobile }: { isMobile: boolean }) {
  const [activeFeature, setActiveFeature] = useState(0);
  const feat = showcaseFeatures[activeFeature];

  // Dashboard panel data driven by active feature
  const dashboardPanels = [
    // AI Recruitment
    {
      header: { label: 'AI Recruitment', icon: '🤖', color: '#6C3BFF', bg: '#EEE8FF' },
      rows: [
        { name: 'Ananya Sharma', role: 'Sr. Developer', score: 94, badge: 'Top Match', badgeColor: '#6C3BFF' },
        { name: 'Rohan Mehta', role: 'Full Stack Eng.', score: 88, badge: 'Shortlisted', badgeColor: '#10B981' },
        { name: 'Priya Nair', role: 'UX Designer', score: 82, badge: 'Review', badgeColor: '#F59E0B' },
        { name: 'Vikram Das', role: 'DevOps Eng.', score: 76, badge: 'Pending', badgeColor: '#9CA3AF' },
      ],
      stat: { label: 'Open Positions', value: '24', sub: '8 offers pending' },
    },
    // Payroll
    {
      header: { label: 'Payroll — May 2025', icon: '💵', color: '#10B981', bg: '#ECFDF5' },
      rows: [
        { name: 'Gross Salary', role: 'Total CTC payout', score: 100, badge: '₹42,80,000', badgeColor: '#10B981' },
        { name: 'PF Contributions', role: '12% of Basic', score: 60, badge: '₹3,84,000', badgeColor: '#3B82F6' },
        { name: 'ESI Deductions', role: '0.75% employee', score: 15, badge: '₹32,100', badgeColor: '#F59E0B' },
        { name: 'TDS Withheld', role: 'Tax slab deducted', score: 25, badge: '₹4,10,000', badgeColor: '#EF4444' },
      ],
      stat: { label: 'Net Disbursed', value: '₹34.5L', sub: '324 employees paid' },
    },
    // Attendance
    {
      header: { label: 'Attendance — Today', icon: '📅', color: '#3B82F6', bg: '#EFF6FF' },
      rows: [
        { name: 'Present', role: 'On-site + Remote', score: 94, badge: '304', badgeColor: '#10B981' },
        { name: 'Late Arrivals', role: 'After 9:30 AM', score: 8, badge: '18', badgeColor: '#F59E0B' },
        { name: 'Absent', role: 'Unapproved leave', score: 4, badge: '6', badgeColor: '#EF4444' },
        { name: 'WFH', role: 'Work from Home', score: 28, badge: '92', badgeColor: '#6C3BFF' },
      ],
      stat: { label: 'Attendance Rate', value: '98.1%', sub: 'Highest this quarter' },
    },
    // Finance
    {
      header: { label: 'Finance Overview', icon: '📊', color: '#F59E0B', bg: '#FFFBEB' },
      rows: [
        { name: 'Total Revenue', role: 'Q1 FY2025', score: 100, badge: '₹2.8Cr', badgeColor: '#10B981' },
        { name: 'Operating Expenses', role: 'All categories', score: 60, badge: '₹1.2Cr', badgeColor: '#F59E0B' },
        { name: 'GST Payable', role: 'GSTR-1 filed', score: 35, badge: '₹18.4L', badgeColor: '#EF4444' },
        { name: 'Net Profit', role: 'After tax', score: 42, badge: '₹1.6Cr', badgeColor: '#6C3BFF' },
      ],
      stat: { label: 'Cash Runway', value: '14 mo', sub: 'Healthy reserves' },
    },
    // Compliance
    {
      header: { label: 'Compliance Status', icon: '🛡️', color: '#EF4444', bg: '#FEF2F2' },
      rows: [
        { name: 'GSTR-1', role: 'Goods & Services Tax', score: 100, badge: 'Filed ✓', badgeColor: '#10B981' },
        { name: 'PF Return', role: 'Provident Fund', score: 100, badge: 'Filed ✓', badgeColor: '#10B981' },
        { name: 'ESI Return', role: 'Employee State Ins.', score: 80, badge: 'In Review', badgeColor: '#F59E0B' },
        { name: 'Form 16', role: 'TDS Certificate', score: 0, badge: 'Pending', badgeColor: '#EF4444' },
      ],
      stat: { label: 'Compliance Score', value: '94%', sub: '2 actions required' },
    },
  ];

  const panel = dashboardPanels[activeFeature];

  return (
    <section style={{
      background: '#F8FAFC',
      padding: isMobile ? '80px 20px' : '120px 40px',
      borderBottom: '1px solid #EAECEF',
      position: 'relative',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 48 : 72,
          alignItems: 'center',
        }}>

          {/* ── Left: Content ── */}
          <div style={{ flex: '0 0 42%', maxWidth: isMobile ? '100%' : 480 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#EEE8FF', borderRadius: 999, padding: '5px 14px', marginBottom: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6C3BFF', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#6C3BFF' }}>
                One Platform
              </span>
            </div>

            <h2 style={{
              fontSize: isMobile ? 28 : 40,
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: 16,
            }}>
              Everything You Need to Manage Your Workforce
            </h2>
            <p style={{
              fontSize: 17,
              color: '#6B7280',
              lineHeight: 1.7,
              marginBottom: 36,
            }}>
              Manage employees, payroll, attendance, recruitment, finance and compliance from one intelligent platform.
            </p>

            {/* Feature bullets */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {showcaseFeatures.map((f, idx) => (
                <button
                  key={f.label}
                  onClick={() => setActiveFeature(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    borderRadius: 14,
                    border: activeFeature === idx
                      ? `1.5px solid ${f.color}40`
                      : '1.5px solid transparent',
                    background: activeFeature === idx
                      ? `${f.color}08`
                      : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    transition: 'all 0.2s ease',
                    boxShadow: activeFeature === idx
                      ? `0 4px 20px ${f.color}15`
                      : 'none',
                  }}
                >
                  <span style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: activeFeature === idx ? `${f.color}18` : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                    transition: 'background 0.2s ease',
                  }}>
                    {f.icon}
                  </span>
                  <div>
                    <div style={{
                      fontSize: 15, fontWeight: 700,
                      color: activeFeature === idx ? f.color : '#1E293B',
                      marginBottom: 2, transition: 'color 0.2s ease',
                    }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>
                      {f.desc}
                    </div>
                  </div>
                  {activeFeature === idx && (
                    <span style={{
                      marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
                      background: f.color, boxShadow: `0 0 10px ${f.color}`,
                      flexShrink: 0,
                    }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: Dashboard mockup ── */}
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Outer glow */}
            <div style={{
              position: 'absolute', inset: -24, borderRadius: 32,
              background: `radial-gradient(ellipse at 50% 50%, ${feat.color}18 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            <div style={{
              borderRadius: 24,
              overflow: 'hidden' as const,
              border: `1px solid ${feat.color}25`,
              boxShadow: `0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px ${feat.color}15`,
              background: '#FFFFFF',
              position: 'relative',
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            }}>
              {/* Browser chrome bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 16px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E5E7EB',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
                <div style={{
                  flex: 1, marginLeft: 8, background: '#FFFFFF',
                  borderRadius: 6, padding: '4px 12px', fontSize: 11,
                  color: '#9CA3AF', border: '1px solid #E5E7EB',
                }}>
                  app.saptta.com/{feat.label.toLowerCase().replace(' ', '-')}
                </div>
              </div>

              {/* App top nav */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 0,
                background: panel.header.bg,
                padding: '10px 20px',
                borderBottom: `2px solid ${feat.color}30`,
              }}>
                <span style={{ fontSize: 16, marginRight: 8 }}>{panel.header.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: panel.header.color, letterSpacing: '-0.01em' }}>
                  {panel.header.label}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {['All', 'Active', 'Archive'].map(t => (
                    <span key={t} style={{
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: 11, fontWeight: 600,
                      background: t === 'All' ? feat.color : 'transparent',
                      color: t === 'All' ? '#FFFFFF' : '#9CA3AF',
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Data rows */}
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {panel.rows.map((row, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 12,
                    background: idx === 0 ? `${feat.color}06` : '#FAFAFA',
                    border: `1px solid ${idx === 0 ? feat.color + '20' : '#F1F3F6'}`,
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `${feat.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: feat.color, flexShrink: 0,
                    }}>
                      {row.name.charAt(0)}
                    </div>
                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{row.role}</div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: 60, flexShrink: 0 }}>
                      <div style={{ height: 4, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' as const }}>
                        <div style={{ height: '100%', width: `${row.score}%`, background: feat.color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                    {/* Badge */}
                    <span style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: `${row.badgeColor}18`, color: row.badgeColor,
                      flexShrink: 0, whiteSpace: 'nowrap' as const,
                    }}>
                      {row.badge}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom stat card */}
              <div style={{
                margin: '0 16px 16px',
                padding: '14px 18px',
                borderRadius: 14,
                background: `linear-gradient(135deg, ${feat.color}12, ${feat.color}06)`,
                border: `1px solid ${feat.color}25`,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: feat.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {panel.stat.value}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginTop: 3 }}>
                    {panel.stat.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {panel.stat.sub}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                  {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
                    <div key={i} style={{
                      width: 5, height: h * 0.6, borderRadius: 3,
                      background: i === 6 ? feat.color : `${feat.color}40`,
                      alignSelf: 'flex-end',
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   AI FEATURES SECTION — Glassmorphism cards, light purple bg
   ───────────────────────────────────────────────────────── */

const aiFeatures = [
  {
    icon: '📄',
    title: 'AI Resume Screening',
    desc: 'Instantly parse and rank thousands of resumes against job requirements. Eliminate bias and find the best fits in seconds.',
    color: '#6C3BFF',
    glow: 'rgba(108,59,255,0.35)',
    tag: 'Recruitment',
    stats: '95% accuracy',
  },
  {
    icon: '🎯',
    title: 'AI Candidate Matching',
    desc: 'Intelligently score candidates based on skills, culture fit, and experience patterns from your top performers.',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.35)',
    tag: 'Hiring',
    stats: '3× faster shortlisting',
  },
  {
    icon: '💡',
    title: 'AI Payroll Insights',
    desc: 'Predict salary anomalies, flag compliance risks, and get month-over-month payroll variance reports automatically.',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.35)',
    tag: 'Payroll',
    stats: 'Zero errors',
  },
  {
    icon: '🧾',
    title: 'AI Expense Categorization',
    desc: 'Auto-categorize expenses from receipts and bank statements. Enforce policy limits with intelligent flagging.',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.35)',
    tag: 'Finance',
    stats: '80% time saved',
  },
  {
    icon: '⚖️',
    title: 'AI Compliance Alerts',
    desc: 'Real-time alerts for statutory deadlines, filing errors, and regulatory changes affecting your workforce.',
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.35)',
    tag: 'Compliance',
    stats: '0 missed filings',
  },
  {
    icon: '📈',
    title: 'AI Workforce Analytics',
    desc: 'Deep-dive into headcount trends, attrition predictions, and department productivity with AI-powered dashboards.',
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.35)',
    tag: 'Analytics',
    stats: 'Predictive insights',
  },
];

function AiFeaturesSection({ isMobile }: { isMobile: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section style={{
      position: 'relative',
      padding: isMobile ? '80px 20px' : '120px 40px',
      background: 'linear-gradient(145deg, #F5F3FF 0%, #EDE9FE 30%, #F0F4FF 60%, #F5F3FF 100%)',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -200, right: -150,
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,59,255,0.12) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -150, left: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)',
        }} />
        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(108,59,255,0.12) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          opacity: 0.6,
        }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 48 : 72 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(108,59,255,0.12)', border: '1px solid rgba(108,59,255,0.25)',
            borderRadius: 999, padding: '6px 16px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#6C3BFF' }}>
              Powered by AI
            </span>
          </div>
          <h2 style={{
            fontSize: isMobile ? 28 : 44,
            fontWeight: 900,
            color: '#1E1245',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            AI That Works Alongside Your Team
          </h2>
          <p style={{
            fontSize: isMobile ? 15 : 18,
            color: '#6B7280',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Six purpose-built AI modules that eliminate manual work, reduce errors and surface insights your team needs to act fast.
          </p>
        </div>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 16 : 24,
        }}>
          {aiFeatures.map((f, idx) => (
            <div
              key={f.title}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                position: 'relative',
                borderRadius: 22,
                padding: isMobile ? '28px 22px' : '32px 28px',
                background: hoveredIdx === idx
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.65)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: hoveredIdx === idx
                  ? `1.5px solid ${f.color}45`
                  : '1.5px solid rgba(255,255,255,0.8)',
                boxShadow: hoveredIdx === idx
                  ? `0 24px 60px rgba(0,0,0,0.10), 0 0 0 1px ${f.color}20, inset 0 1px 0 rgba(255,255,255,0.9)`
                  : '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                transition: 'all 0.28s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'default',
                overflow: 'hidden',
              }}
            >
              {/* Corner glow */}
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 120, height: 120, borderRadius: '50%',
                background: f.glow.replace('0.35', hoveredIdx === idx ? '0.18' : '0'),
                filter: 'blur(30px)',
                transition: 'background 0.3s ease',
                pointerEvents: 'none',
              }} />

              {/* Icon */}
              <div style={{
                width: 54, height: 54, borderRadius: 16,
                background: hoveredIdx === idx ? `${f.color}18` : `${f.color}0D`,
                border: `1.5px solid ${f.color}${hoveredIdx === idx ? '40' : '25'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, marginBottom: 20,
                transition: 'all 0.28s ease',
                boxShadow: hoveredIdx === idx ? `0 0 20px ${f.color}30` : 'none',
              }}>
                {f.icon}
              </div>

              {/* Tag pill */}
              <span style={{
                display: 'inline-block',
                padding: '3px 10px', borderRadius: 999,
                fontSize: 10, fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                background: `${f.color}14`,
                color: f.color,
                marginBottom: 10,
              }}>
                {f.tag}
              </span>

              {/* Title */}
              <h3 style={{
                fontSize: 17, fontWeight: 800,
                color: '#1E1245', marginBottom: 10,
                letterSpacing: '-0.02em', lineHeight: 1.3,
              }}>
                {f.title}
              </h3>

              {/* Description */}
              <p style={{
                fontSize: 14, color: '#6B7280',
                lineHeight: 1.65, marginBottom: 20,
              }}>
                {f.desc}
              </p>

              {/* Stats bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingTop: 16,
                borderTop: `1px solid ${f.color}18`,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: f.color,
                  boxShadow: `0 0 8px ${f.color}`,
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: f.color }}>
                  {f.stats}
                </span>
              </div>

              {/* Bottom hover accent */}
              <div style={{
                position: 'absolute', bottom: 0, left: '15%', width: '70%', height: 2,
                background: `linear-gradient(90deg, transparent, ${f.color}80, transparent)`,
                borderRadius: 99,
                opacity: hoveredIdx === idx ? 1 : 0,
                transition: 'opacity 0.28s ease',
              }} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: isMobile ? 48 : 64 }}>
          <p style={{ fontSize: 16, color: '#6B7280', marginBottom: 20 }}>
            All AI features are included across every plan — no add-ons needed.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' as const }}>
            <button style={{
              background: 'linear-gradient(135deg, #6C3BFF, #4F46E5)',
              color: '#fff', border: 'none', borderRadius: 999,
              padding: '13px 30px', fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(108,59,255,0.35)',
              transition: 'transform 0.18s, box-shadow 0.18s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              Explore AI Features →
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
              color: '#4F46E5', border: '1.5px solid rgba(108,59,255,0.3)',
              borderRadius: 999, padding: '13px 30px', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.18s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.8)'; }}
            >
              Book a Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   TRUST LOGOS SECTION — Premium client trust bar
   Stripe-inspired, greyscale logos, hover color animation
   ───────────────────────────────────────────────────────── */



const clientLogos = [
  { name: 'Tata Consultancy', abbr: 'TCS', color: '#0052CC' },
  { name: 'Infosys', abbr: 'INFY', color: '#007CC3' },
  { name: 'Wipro', abbr: 'WIPRO', color: '#7B1FA2' },
  { name: 'HCL Technologies', abbr: 'HCL', color: '#00A0E3' },
  { name: 'Mahindra', abbr: 'M&M', color: '#C62828' },
  { name: 'Reliance Retail', abbr: 'RIL', color: '#1565C0' },
  { name: 'Bajaj Finserv', abbr: 'BAJAJ', color: '#E65100' },
  { name: 'Zomato', abbr: 'ZOMATO', color: '#E53935' },
  { name: 'Swiggy', abbr: 'SWIGGY', color: '#FC8019' },
  { name: 'Razorpay', abbr: 'RZRPAY', color: '#3395FF' },
  { name: 'Groww', abbr: 'GROWW', color: '#00D09C' },
  { name: 'Meesho', abbr: 'MEESHO', color: '#B01E8A' },
  { name: 'Freshworks', abbr: 'FRSH', color: '#1DA462' },
  { name: 'Zoho', abbr: 'ZOHO', color: '#D32F2F' },
  { name: 'PhonePe', abbr: 'PhonePe', color: '#5F259F' },
  { name: 'Paytm', abbr: 'PAYTM', color: '#00BAF2' },
  { name: 'Ola Cabs', abbr: 'OLA', color: '#000000' },
  { name: 'Nykaa', abbr: 'NYKAA', color: '#FC2779' },
  { name: 'BYJU\'S', abbr: 'BYJU\'S', color: '#663399' },
  { name: 'PolicyBazaar', abbr: 'PBAZAAR', color: '#FF5733' },
];

function TrustLogosSection({ isMobile }: { isMobile: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section
      style={{
        background: '#FFFFFF',
        padding: isMobile ? '64px 20px' : '100px 40px',
        borderBottom: '1px solid #F1F3F6',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #E5E7EB 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.35,
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 40 : 56 }}>
          <p style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            marginBottom: 14,
          }}>
            Trusted Worldwide
          </p>
          <h2 style={{
            fontSize: isMobile ? 26 : 36,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            marginBottom: 14,
          }}>
            Built for modern teams getting started
          </h2>
          <p style={{
            fontSize: isMobile ? 15 : 17,
            color: '#6B7280',
            fontWeight: 400,
            maxWidth: 520,
            margin: '0 auto',
            lineHeight: 1.65,
          }}>
            Saptta helps startups and growing companies streamline HR, payroll and finance from day one.
          </p>
        </div>

        {/* Logo Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? 'repeat(4, 1fr)'
            : 'repeat(10, 1fr)',
          gap: isMobile ? '16px 12px' : '20px 0',
          alignItems: 'center',
          justifyItems: 'center',
        }}>
          {clientLogos.map((logo, idx) => (
            <div
              key={logo.name}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '10px 6px' : '14px 10px',
                borderRadius: 12,
                cursor: 'default',
                width: '100%',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                background: hoveredIdx === idx ? '#FAFBFF' : 'transparent',
                border: hoveredIdx === idx ? '1px solid #E8ECF4' : '1px solid transparent',
                boxShadow: hoveredIdx === idx ? '0 4px 20px rgba(79,70,229,0.08)' : 'none',
              }}
            >
              {/* Logo mark — initial-based monogram */}
              <div style={{
                width: isMobile ? 36 : 44,
                height: isMobile ? 36 : 44,
                borderRadius: 10,
                background: hoveredIdx === idx
                  ? `${logo.color}14`
                  : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                border: hoveredIdx === idx ? `1.5px solid ${logo.color}30` : '1.5px solid transparent',
              }}>
                <span style={{
                  fontSize: isMobile ? 9 : 10,
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  color: hoveredIdx === idx ? logo.color : '#9CA3AF',
                  transition: 'color 0.22s ease',
                  fontFamily: "'Inter', 'SF Pro Display', sans-serif",
                }}>
                  {logo.abbr}
                </span>
              </div>
              {/* Company name */}
              <span style={{
                fontSize: isMobile ? 9 : 10,
                fontWeight: 600,
                color: hoveredIdx === idx ? '#374151' : '#9CA3AF',
                textAlign: 'center',
                lineHeight: 1.3,
                transition: 'color 0.22s ease',
                maxWidth: isMobile ? 60 : 70,
                wordBreak: 'break-word',
              }}>
                {logo.name}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default function Home() {

  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Interactive Sandbox States */
  const [punched, setPunched] = useState(false);
  const [rippling, setRippling] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [activeWorkflowStage, setActiveWorkflowStage] = useState(0);
  const [workflowManualOverride, setWorkflowManualOverride] = useState(false);

  useEffect(() => {
    if (workflowManualOverride) return;
    const timer = setInterval(() => {
      setActiveWorkflowStage((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, [workflowManualOverride]);

  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const integrationScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      isProgrammaticScroll.current = true;
      const slideWidth = container.clientWidth;
      container.scrollTo({
        left: activeFeatureTab * slideWidth,
        behavior: 'smooth'
      });
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeFeatureTab]);

  useEffect(() => {
    if (!isMobile) return;
    const container = integrationScrollRef.current;
    if (!container) return;

    const timer = setInterval(() => {
      if (!container) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) return;
      const next = container.scrollLeft + 1.2;
      container.scrollLeft = next >= maxScroll ? 0 : next;
    }, 16);

    return () => clearInterval(timer);
  }, [isMobile]);

  const handleScroll = () => {
    if (isProgrammaticScroll.current) return;
    const container = scrollContainerRef.current;
    if (container) {
      const scrollLeft = container.scrollLeft;
      const slideWidth = container.clientWidth || 1;
      const index = Math.round(scrollLeft / slideWidth);
      if (index >= 0 && index < 4 && index !== activeFeatureTab) {
        setActiveFeatureTab(index);
      }
    }
  };

  /* Auto-play slideshow cockpit rotation loop with interaction reset */
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureTab(prev => (prev + 1) % 4);
    }, 6000); // cycle slides every 6 seconds

    return () => clearInterval(timer);
  }, [activeFeatureTab]);

  const [employeeCount, setEmployeeCount] = useState(65);
  const [calcPopKey, setCalcPopKey] = useState(0);
  const [hoveredModularCard, setHoveredModularCard] = useState<string | null>(null);
  const [hoveredModularButton, setHoveredModularButton] = useState<string | null>(null);
  const [hoveredComplianceCard, setHoveredComplianceCard] = useState<string | null>(null);
  const [hoveredIntegrationChip, setHoveredIntegrationChip] = useState<string | null>(null);
  const [hoveredAiCard, setHoveredAiCard] = useState<string | null>(null);
  const [hoveredPricingCard, setHoveredPricingCard] = useState<string | null>(null);

  const [chatState, setChatState] = useState<'idle' | 'typing-user' | 'show-user' | 'typing-claude' | 'show-claude'>('idle');

  /* Scroll Parallax */
  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Claude Simulated Dialogue Sequence Loop */
  useEffect(() => {
    let active = true;
    const runChatLoop = () => {
      if (!active) return;
      setChatState('idle');
      
      setTimeout(() => { if (active) setChatState('typing-user'); }, 1000);
      setTimeout(() => { if (active) setChatState('show-user'); }, 3000);
      setTimeout(() => { if (active) setChatState('typing-claude'); }, 4800);
      setTimeout(() => { if (active) setChatState('show-claude'); }, 7800);
      
      // repeats every 15 seconds
      setTimeout(() => {
        if (active) runChatLoop();
      }, 15000);
    };

    runChatLoop();
    return () => { active = false; };
  }, []);

  const handlePunchClick = () => {
    setRippling(true);
    setPunched(!punched);
    setTimeout(() => setRippling(false), 900);
  };

  return (
    <div className="home-page" style={{ overflow: 'hidden' }}>
      <section
        className="home-announcement"
        style={{
          background: 'linear-gradient(100deg, #1E2A78 0%, #24356F 52%, #1A255F 100%)',
          padding: isMobile ? '10px 14px' : '11px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 8 : 12, flexWrap: 'wrap', color: '#FFFFFF' }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1E2A78', background: '#FFF8EC', borderRadius: 999, padding: '3px 9px', lineHeight: 1.2, border: '1px solid rgba(214,154,45,0.35)' }}>
            New
          </span>
          {!isMobile && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>|</span>}
          <span style={{ fontSize: isMobile ? 11.5 : 13, fontWeight: 600, color: '#FFFFFF', textAlign: 'center' }}>
            Introducing AI Payroll Assistant ✨ Automate Payroll, Compliance & Reports with AI
          </span>
          {!isMobile && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>|</span>}
          <button
            onClick={() => navigate('/features')}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#F3C56B',
              fontSize: isMobile ? 11.5 : 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Learn More →
          </button>
        </div>
      </section>

      {/* ── 1. Centered Hero Carousel ── */}
      <HeroCarousel />

      {/* ── 2. Trusted By Client Logos ── */}
      <TrustLogosSection isMobile={isMobile} />

      {/* ── 3. Product Showcase ── */}
      <ProductShowcaseSection isMobile={isMobile} />

      {/* ── 4. AI Features ── */}
      <AiFeaturesSection isMobile={isMobile} />

      {/* ── Integrations trust bar ── */}
      <section
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)',
          padding: isMobile ? '20px 16px 24px' : '24px 24px 28px',
          borderBottom: '1px solid #EAECEF',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p className="home-trust-eyebrow">Works with your stack</p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: isMobile ? 8 : 10,
            }}
          >
            {['Razorpay', 'AWS', 'ZKTeco', 'ICICI Bank', 'GST', 'PF · ESI', 'TDS', 'MCA'].map((name) => (
              <span
                key={name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: isMobile ? '6px 12px' : '7px 14px',
                  borderRadius: 999,
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: '#4B5563',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        className="responsive-padding home-section"
        style={{
          background: '#FFFFFF',
          padding: isMobile ? '48px 0 40px' : '64px 0 56px',
          borderBottom: '1px solid #EAECEF',
        }}
      >
        <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>
          <ScrollReveal animation="fade-in-up">
            <div
              style={{
                borderRadius: isMobile ? 16 : 20,
                padding: isMobile ? '24px 16px' : '32px 36px',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                border: '1px solid #E8ECF4',
                boxShadow: '0 12px 40px rgba(30, 42, 120, 0.06)',
              }}
            >
              <HomeSectionHeader
                eyebrow="End-to-end workflow"
                title="How Saptta Automates Your Business"
                subtitle="From hire to payroll to GST filing — one connected workflow that saves hours every month."
                theme="navy"
                isMobile={isMobile}
                maxWidth={720}
                className="home-section-header--in-card"
              />

              <div className={`home-section-media-row${isMobile ? '' : ' home-section-media-row--split'}`} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    {
                      label: '01. Hire & Onboard',
                      badge: 'Ecosystem Start',
                      color: '#6C3BFF',
                      desc: 'Fully digital onboarding with automatic document and credentials verification.',
                    },
                    {
                      label: '02. Compliance Payroll',
                      badge: 'Native statutory',
                      color: '#10B981',
                      desc: '3-click payroll processing with built-in PF, ESI, and TDS calculations.',
                    },
                    {
                      label: '03. GST Accounting & Ledgers',
                      badge: 'Double-entry sync',
                      color: '#3B82F6',
                      desc: 'Disbursed payroll automatically books in financial ledgers for swift GST filings.',
                    },
                  ].map((item, idx) => {
                    const isActive = activeWorkflowStage === idx;
                    return (
                      <div
                        key={item.label}
                        className={`card-hover${isActive ? ' visible' : ''}`}
                        onClick={() => {
                          setActiveWorkflowStage(idx);
                          setWorkflowManualOverride(true);
                        }}
                        style={{
                          padding: '16px 20px',
                          borderRadius: 14,
                          background: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.72)',
                          border: isActive ? `1.5px solid ${item.color}35` : '1px solid #EEF2F7',
                          borderLeft: `4px solid ${item.color}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          textAlign: 'left',
                          cursor: 'pointer',
                          opacity: isActive ? 1 : 0.65,
                          boxShadow: isActive ? '0 12px 30px rgba(10,17,40,0.06)' : 'none',
                          transform: isActive ? 'scale(1.01) translateY(-2px)' : 'scale(1)',
                          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? item.color : '#0F172A', transition: 'color 0.3s ease' }}>{item.label}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: item.color, background: `${item.color}12`, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {item.badge}
                          </span>
                        </div>
                        <p style={{ color: isActive ? '#475569' : '#6B7280', fontSize: 12, lineHeight: 1.45, margin: 0, transition: 'color 0.3s ease' }}>{item.desc}</p>
                        
                        {isActive && !workflowManualOverride && (
                          <div style={{ height: 2, background: 'rgba(10,17,40,0.04)', borderRadius: 2, marginTop: 8, overflow: 'hidden', width: '100%' }}>
                            <div style={{ height: '100%', background: item.color, animation: 'workflowProgress 4.5s linear forwards' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: isMobile ? 240 : 360 }}>
                  {/* Dynamic screenshot mapping */}
                  {['hrmsDashboard', 'payrollDashboard', 'gstDashboard'].map((imgKey, index) => {
                    const isImgActive = activeWorkflowStage === index;
                    return (
                      <div
                        key={imgKey}
                        style={{
                          position: index === 0 ? 'relative' : 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: isImgActive ? 1 : 0,
                          transform: isImgActive ? 'scale(1)' : 'scale(0.97)',
                          transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                          pointerEvents: isImgActive ? 'auto' : 'none',
                          zIndex: isImgActive ? 2 : 1,
                        }}
                      >
                        <MarketingImageFrame
                          imageKey={imgKey as any}
                          variant="float"
                          aspect="16/10"
                          overlayTitle={
                            index === 0
                              ? '01. Hire & Onboard'
                              : index === 1
                              ? '02. Compliance Payroll'
                              : '03. GST Accounting & Ledgers'
                          }
                          overlaySubtitle="One connected workflow in Saptta"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(6, minmax(0,1fr))', gap: isMobile ? 12 : 14, marginBottom: 20 }}>
                {[
                  { icon: <UserOutlined />, title: 'Employee Joins', sub: 'Onboard in minutes', color: '#7C3AED' },
                  { icon: <WalletOutlined />, title: 'Data & Documents', sub: 'Auto-collected docs', color: '#6D28D9' },
                  { icon: <CalendarOutlined />, title: 'Attendance Sync', sub: 'Live punch tracking', color: '#0EA5E9' },
                  { icon: <DollarCircleOutlined />, title: 'Payroll Processing', sub: 'Payroll in 3 clicks', color: '#10B981' },
                  { icon: <CreditCardOutlined />, title: 'Accounting & GST', sub: 'GSTR-ready entries', color: '#3B82F6' },
                  { icon: <FundProjectionScreenOutlined />, title: 'Smart Reports', sub: 'AI insights & alerts', color: '#EC4899' },
                ].map((step, index) => (
                  <div key={step.title} style={{ position: 'relative', border: '1px solid #EEF2F7', borderRadius: 14, padding: isMobile ? '10px 10px 11px' : '12px 12px 13px', background: '#FFFFFF', minHeight: 94 }}>
                    {!isMobile && index < 5 && (
                      <div style={{ position: 'absolute', right: -11, top: 24, width: 22, height: 2, background: '#DDE4EF' }} />
                    )}
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${step.color}18`, color: step.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, fontSize: 16 }}>
                      {step.icon}
                    </div>
                    <div style={{ color: '#0F172A', fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>{step.title}</div>
                    <div style={{ color: '#6B7280', fontSize: 11 }}>{step.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 12, marginTop: 14 }}>
                <div style={{ gridColumn: isMobile ? '1' : '1 / span 1', gridRow: isMobile ? 'auto' : '1 / span 2', background: 'linear-gradient(145deg, #0F172A 0%, #1E2A78 72%, #263B8A 100%)', borderRadius: 14, padding: isMobile ? 16 : 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 24px rgba(30,42,120,0.12)' }}>
                  <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: '#7C3AED', filter: 'blur(60px)', opacity: 0.5, borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: -50, left: -50, width: 150, height: 150, background: '#3B82F6', filter: 'blur(60px)', opacity: 0.4, borderRadius: '50%' }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <h4 style={{ margin: 0, lineHeight: 1.16, color: '#FFFFFF', fontSize: isMobile ? 21 : 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Real Impact for<br />Real Businesses</h4>
                    <p style={{ margin: '8px 0 0', color: '#A5B4D4', fontSize: 12.5, lineHeight: 1.5, maxWidth: 220 }}>
                      We help businesses save time, reduce cost and stay compliant with intelligent automation.
                    </p>
                  </div>
                  <button className="premium-hover-btn" onClick={() => navigate('/contact')} style={{ marginTop: 14, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', position: 'relative', zIndex: 1 }}>
                    See Customer Stories <span style={{ fontSize: 18 }}>→</span>
                  </button>
                </div>

                {[
                  { value: '80%', label: 'Faster Payroll Processing', color: '#7C3AED', icon: <DollarCircleOutlined />, bg: '#F5F3FF' },
                  { value: '60%', label: 'Reduction in Manual Work', color: '#2563EB', icon: <LineChartOutlined />, bg: '#EFF6FF' },
                  { value: '100%', label: 'Compliance Assurance', color: '#059669', icon: <WalletOutlined />, bg: '#ECFDF5' },
                  { value: '2X', label: 'Increase in Productivity', color: '#EA580C', icon: <UserOutlined />, bg: '#FFF7ED' },
                ].map((item) => (
                  <div key={item.value + item.label} className="stat-card-hover" style={{ border: '1px solid #E8EEF7', borderRadius: 14, background: 'linear-gradient(180deg, #FFFFFF 0%, #FCFDFF 100%)', padding: isMobile ? '12px 12px 11px' : '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', boxShadow: '0 5px 14px rgba(30,42,120,0.05)', transition: 'all 0.3s ease' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 96, height: 96, background: item.color, filter: 'blur(44px)', opacity: 0.08, borderRadius: '50%', transform: 'translate(34%, -34%)' }} />
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: item.bg, color: item.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, position: 'relative', zIndex: 1 }}>
                      {item.icon}
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ color: '#0F172A', fontWeight: 800, fontSize: isMobile ? 30 : 34, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 4 }}>{item.value}</div>
                      <div style={{ color: '#64748B', fontSize: isMobile ? 11.5 : 12.5, fontWeight: 500, lineHeight: 1.3 }}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── AI Intelligence Layer ── */}
      <section className="responsive-padding home-section" style={{
        background: 'linear-gradient(180deg, #F8FAFF 0%, #FFFFFF 55%, #FFFBF5 100%)',
        padding: isMobile ? '56px 16px' : '80px 24px',
        borderBottom: '1px solid #EAECEF',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,42,120,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative' }}>
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="AI-Powered Platform"
              title="AI that works inside HR & Finance"
              titleHighlight="not beside it"
              subtitle="Saptta's intelligence layer flags risks early, automates repetitive work, and gives leaders clear answers — without switching tools."
              theme="navy"
              isMobile={isMobile}
              maxWidth={760}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-up" delay={80}>
            <div style={{
              maxWidth: 1080,
              margin: '0 auto 64px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}>
              <div style={{
                width: '100%',
                position: 'relative',
                borderRadius: 32,
                padding: '12px',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                boxShadow: '0 24px 60px rgba(10,17,40,0.06), 0 0 0 1px rgba(10,17,40,0.04)',
              }}>
                <div style={{
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60%',
                  height: 60,
                  background: 'linear-gradient(90deg, transparent, rgba(108,59,255,0.15), rgba(43,182,115,0.15), transparent)',
                  filter: 'blur(30px)',
                  zIndex: 0
                }} />
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  borderRadius: 24,
                  overflow: 'hidden',
                  background: '#F8FAFC',
                  aspectRatio: '16/9',
                  border: '1px solid rgba(0,0,0,0.03)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <img 
                    src="/images/ai-workspace-clean.png" 
                    alt="AI Intelligence Layer" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { title: 'AI Payroll Auditor', desc: 'Detects PF, ESI, and TDS mismatches before payout.', icon: <DollarCircleOutlined />, color: '#1E2A78' },
              { title: 'Attendance Anomaly Alerts', desc: 'Flags missing punches and geo-fence violations instantly.', icon: <CalendarOutlined />, color: '#0EA5E9' },
              { title: 'GST Filing Assistant', desc: 'Validates invoices and prepares GSTR-ready summaries.', icon: <CreditCardOutlined />, color: '#2BB673' },
              { title: 'Cash Flow Forecasting', desc: 'Predicts inflows and outflows from live ledger data.', icon: <LineChartOutlined />, color: '#2563EB' },
              { title: 'Ask Saptta (NL Reports)', desc: 'Ask questions like “Show overdue receivables this month.”', icon: <FundProjectionScreenOutlined />, color: '#D69A2D' },
              { title: 'Compliance Risk Monitor', desc: 'Proactive alerts for statutory deadlines and audit gaps.', icon: <WalletOutlined />, color: '#7C3AED' },
            ].map((item, index) => (
              <ScrollReveal key={item.title} animation="fade-in-up" delay={index * 70}>
                <div
                  onMouseEnter={() => setHoveredAiCard(item.title)}
                  onMouseLeave={() => setHoveredAiCard(null)}
                  style={{
                    padding: 22,
                    borderRadius: 16,
                    background: '#FFFFFF',
                    border: hoveredAiCard === item.title ? `1px solid ${item.color}55` : '1px solid #E8ECF4',
                    boxShadow: hoveredAiCard === item.title ? `0 14px 32px rgba(10,17,40,0.08), 0 0 0 3px ${item.color}12` : '0 6px 20px rgba(10,17,40,0.04)',
                    transform: hoveredAiCard === item.title ? 'translateY(-4px)' : 'translateY(0)',
                    transition: 'all 0.28s ease',
                    height: '100%',
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${item.color}14`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 14 }}>
                    {item.icon}
                  </div>
                  <h4 className="home-card-h4">{item.title}</h4>
                  <p className="home-card-body">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal animation="fade-in-up" delay={200}>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Button type="primary" onClick={() => navigate('/features')} style={{ height: 46, padding: '0 28px', borderRadius: 999, fontWeight: 700, background: 'linear-gradient(90deg, #1E2A78, #2A3F8F)', border: 'none', boxShadow: '0 10px 24px rgba(30,42,120,0.22)' }}>
                Explore AI Features →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── All-in-one Ecosystem ── */}
      <section
        className="responsive-padding home-section"
        style={{
          background: 'linear-gradient(145deg, #F5F0FF 0%, #FFFFFF 42%, #F0FDF7 100%)',
          padding: isMobile ? '56px 16px' : '88px 24px',
          borderBottom: '1px solid #EAECEF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -120, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,59,255,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -140, right: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(43,182,115,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '20%', top: '40%', width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(108,59,255,0.08)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.95fr 1.35fr', gap: isMobile ? 36 : 48, alignItems: 'center' }}>
            <ScrollReveal animation="fade-in-left">
              <div>
                <HomeSectionHeader
                  eyebrow="All-in-one ecosystem"
                  title="One AI core."
                  titleHighlight="Every module connected."
                  subtitle="Saptta's AI engine sits at the center — syncing HRMS, payroll, finance, and compliance in one intelligent flow."
                  align="left"
                  theme="purple"
                  isMobile={isMobile}
                  maxWidth={440}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { title: 'Unified HR + Finance', desc: 'One platform replaces scattered tools and duplicate data entry.', icon: <UserOutlined />, color: '#6C3BFF' },
                    { title: 'AI-driven automation', desc: 'Smart checks across payroll, attendance, GST, and reporting.', icon: <ThunderboltOutlined />, color: '#8B5CF6' },
                    { title: 'Real-time compliance sync', desc: 'From hire to payout to filing — always audit-ready.', icon: <FundProjectionScreenOutlined />, color: '#2BB673' },
                  ].map((f) => (
                    <div key={f.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${f.color}14`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px solid ${f.color}22` }}>
                        {f.icon}
                      </div>
                      <div>
                        <div className="home-card-h4" style={{ marginBottom: 4 }}>{f.title}</div>
                        <p className="home-card-body">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-in-right">
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                  <div
                    className="ecosystem-core-pulse"
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6C3BFF 0%, #8B5CF6 45%, #2BB673 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid rgba(255,255,255,0.9)',
                    }}
                  >
                    <ThunderboltOutlined style={{ fontSize: 28, color: '#FFFFFF' }} />
                    <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 12, marginTop: 4 }}>AI Core</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, width: '100%' }}>
                    {[
                      { title: 'HRMS', icon: <UserOutlined />, color: '#6C3BFF' },
                      { title: 'Payroll', icon: <WalletOutlined />, color: '#8B5CF6' },
                      { title: 'Finance', icon: <DollarCircleOutlined />, color: '#2BB673' },
                      { title: 'GST', icon: <CreditCardOutlined />, color: '#10B981' },
                      { title: 'Attendance', icon: <CalendarOutlined />, color: '#2BB673' },
                      { title: 'Analytics', icon: <LineChartOutlined />, color: '#6C3BFF' },
                    ].map((mod) => (
                      <div key={mod.title} style={{ background: '#FFFFFF', borderRadius: 12, padding: '10px 12px', border: `1px solid ${mod.color}33`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: `${mod.color}12`, color: mod.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{mod.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#111827' }}>{mod.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', width: '100%', minHeight: 460, margin: '0 auto', maxWidth: 560 }}>
                  <svg
                    viewBox="0 0 560 460"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
                    aria-hidden
                  >
                    {[
                      [280, 230, 280, 52],
                      [280, 230, 468, 118],
                      [280, 230, 468, 342],
                      [280, 230, 280, 408],
                      [280, 230, 92, 342],
                      [280, 230, 92, 118],
                    ].map((line, i) => (
                      <line
                        key={i}
                        x1={line[0]}
                        y1={line[1]}
                        x2={line[2]}
                        y2={line[3]}
                        stroke={i % 2 === 0 ? 'rgba(108,59,255,0.35)' : 'rgba(43,182,115,0.35)'}
                        strokeWidth="2"
                        className="ecosystem-connector-line"
                      />
                    ))}
                  </svg>
                  <div
                    className="ecosystem-core-pulse"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 118,
                      height: 118,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6C3BFF 0%, #8B5CF6 45%, #2BB673 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 3,
                      border: '3px solid rgba(255,255,255,0.9)',
                    }}
                  >
                    <ThunderboltOutlined style={{ fontSize: 32, color: '#FFFFFF' }} />
                    <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 13, marginTop: 6, letterSpacing: '0.04em' }}>AI Core</span>
                  </div>
                  {[
                    { title: 'HRMS', icon: <UserOutlined />, color: '#6C3BFF', top: '2%', left: '50%', tx: '-50%' },
                    { title: 'Payroll', icon: <WalletOutlined />, color: '#8B5CF6', top: '14%', left: '82%', tx: '-50%' },
                    { title: 'Finance', icon: <DollarCircleOutlined />, color: '#2BB673', top: '50%', left: '92%', tx: '-50%', ty: '-50%' },
                    { title: 'GST', icon: <CreditCardOutlined />, color: '#10B981', top: '86%', left: '82%', tx: '-50%', ty: '-100%' },
                    { title: 'Attendance', icon: <CalendarOutlined />, color: '#2BB673', top: '86%', left: '18%', tx: '-50%', ty: '-100%' },
                    { title: 'Analytics', icon: <LineChartOutlined />, color: '#6C3BFF', top: '14%', left: '18%', tx: '-50%' },
                  ].map((mod) => (
                    <div
                      key={mod.title}
                      style={{
                        position: 'absolute',
                        top: mod.top,
                        left: mod.left,
                        transform: `translate(${mod.tx}, ${mod.ty || '0'})`,
                        zIndex: 2,
                        background: '#FFFFFF',
                        borderRadius: 14,
                        padding: '12px 14px',
                        border: `1px solid ${mod.color}33`,
                        boxShadow: '0 10px 28px rgba(10,17,40,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 118,
                      }}
                    >
                      <span style={{ width: 34, height: 34, borderRadius: 10, background: `${mod.color}12`, color: mod.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {mod.icon}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{mod.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollReveal>
          </div>
        </div>
      </section>
      {/* ── Accounts Flow Comparison ── */}
      <section className="responsive-padding home-section" style={{ background: '#FFFFFF', padding: isMobile ? '56px 16px' : '80px 24px', borderBottom: '1px solid #EAECEF' }}>
        <div className="home-section-inner" style={{ maxWidth: 1200 }}>
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="Accounts Flow"
              title="How our connected flow beats"
              titleHighlight="traditional accounting"
              subtitle="See how Saptta eliminates manual reconciliation by auto-syncing payroll directly to your GST ledgers."
              theme="navy"
              isMobile={isMobile}
              maxWidth={700}
            />
          </ScrollReveal>
          
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 32, marginTop: 40 }}>
            <ScrollReveal animation="fade-in-right" delay={100}>
              <div style={{ padding: 32, background: '#F8FAFC', borderRadius: 24, border: '1px solid #E2E8F0', height: '100%', position: 'relative' }}>
                <div style={{ color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }} />
                  Traditional Disconnected Flow
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 2 }}>
                  {['HR marks attendance', 'Export CSV to Payroll Software', 'Process Payroll & Export Bank File', 'Manual Journal Entries in Accounting', 'Reconcile mismatches for GST filing'].map((step, i) => (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFFFFF', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12, fontWeight: 700, position: 'relative', zIndex: 2 }}>{i+1}</div>
                      <div style={{ color: '#475569', fontSize: 14, fontWeight: 500 }}>{step}</div>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', left: 47, top: 88, bottom: 48, width: 2, background: 'repeating-linear-gradient(to bottom, #CBD5E1 0, #CBD5E1 4px, transparent 4px, transparent 8px)', zIndex: 1 }} />
              </div>
            </ScrollReveal>
            
            <ScrollReveal animation="fade-in-left" delay={200}>
              <div style={{ padding: 32, background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderRadius: 24, border: '1px solid #BBF7D0', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: '#22C55E', filter: 'blur(80px)', opacity: 0.2, borderRadius: '50%' }} />
                <div style={{ color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, background: '#22C55E', borderRadius: '50%', boxShadow: '0 0 10px #22C55E' }} />
                  Saptta's Connected Flow
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32, position: 'relative', zIndex: 2 }}>
                  {[
                    { title: 'HR & Attendance Sync', desc: 'Real-time data feeds directly into payroll engine.' },
                    { title: '1-Click Payroll', desc: 'Calculates PF, ESI, TDS automatically.' },
                    { title: 'Auto-Ledger Entry', desc: 'Disbursements map directly to accounting ledgers.' },
                    { title: 'GSTR-Ready Reports', desc: 'No reconciliation needed. Ready for direct filing.' }
                  ].map((step, i) => (
                    <div key={step.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#22C55E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)', position: 'relative', zIndex: 2 }}>{i+1}</div>
                      <div>
                        <div style={{ color: '#14532D', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{step.title}</div>
                        <div style={{ color: '#166534', fontSize: 13, opacity: 0.85 }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', left: 49, top: 88, bottom: 64, width: 2, background: 'linear-gradient(to bottom, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.4) 100%)', zIndex: 1 }} />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Before / After Saptta ── */}
      <section className="responsive-padding home-section" style={{ background: '#F8FAFC', padding: isMobile ? '56px 16px' : '80px 24px', borderBottom: '1px solid #EAECEF' }}>
        <div className="home-section-inner" style={{ maxWidth: 1200 }}>
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Before vs after"
              title="Stop juggling tools."
              titleHighlight="Run everything in Saptta."
              subtitle="See how teams move from scattered spreadsheets and apps to one connected HR + Finance platform."
              theme="green"
              isMobile={isMobile}
              maxWidth={680}
            />
          </ScrollReveal>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr', gap: isMobile ? 20 : 24, alignItems: 'stretch', marginBottom: 36 }}>
            <ScrollReveal animation="fade-in-left">
              <div style={{ borderRadius: 18, border: '1px solid #FECACA', background: 'linear-gradient(180deg, #FFF5F5 0%, #FFFFFF 100%)', padding: isMobile ? 18 : 22, height: '100%', minHeight: isMobile ? 280 : 320 }}>
                <div style={{ marginBottom: 14 }}>
                  <MarketingImageFrame imageKey="beforeLegacy" variant="polaroid" aspect="16/10" />
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Before Saptta</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Excel payroll sheets', sub: 'Manual formulas, version conflicts' },
                    { label: 'WhatsApp for attendance', sub: 'Lost messages, no audit trail' },
                    { label: 'Separate GST / Tally tools', sub: 'Double entry, delayed filing' },
                    { label: 'Email for leave approvals', sub: 'Slow, no central visibility' },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #FEE2E2' }}>
                      <span style={{ color: '#EF4444', fontSize: 14, lineHeight: 1, marginTop: 2 }}>✕</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{item.label}</div>
                        <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#6B7280', boxShadow: '0 4px 14px rgba(10,17,40,0.06)' }}>
                  VS
                </div>
              </div>
            )}

            <ScrollReveal animation="fade-in-right">
              <div style={{ borderRadius: 18, border: '1px solid #BBF7D0', background: 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)', padding: isMobile ? 18 : 22, height: '100%', minHeight: isMobile ? 280 : 320 }}>
                <div style={{ marginBottom: 14 }}>
                  <MarketingImageFrame imageKey="afterSaptta" variant="device" aspect="16/10" />
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.08em' }}>With Saptta</span>
                </div>
                <div style={{ borderRadius: 14, border: '1px solid #D1FAE5', background: '#FFFFFF', padding: 14, marginBottom: 12, boxShadow: '0 8px 24px rgba(16,185,129,0.08)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1E2A78', marginBottom: 10 }}>Unified Saptta Cockpit</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'HRMS', value: 'Live', color: '#1E2A78' },
                      { label: 'Payroll', value: 'Ready', color: '#1E2A78' },
                      { label: 'GST', value: 'Filed', color: '#2BB673' },
                      { label: 'Reports', value: '1-click', color: '#2BB673' },
                    ].map((chip) => (
                      <div key={chip.label} style={{ padding: '8px 10px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #EEF2F7', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#6B7280' }}>{chip.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: chip.color }}>{chip.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'One login for HR + Finance',
                    'Auto-sync attendance → payroll → ledger',
                    'AI flags compliance issues early',
                  ].map((line) => (
                    <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#374151', fontWeight: 500 }}>
                      <span style={{ color: '#22C55E', fontWeight: 800 }}>✓</span>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-in-up">
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { value: '60%', label: 'Less manual HR & finance work', color: '#1E2A78' },
                { value: '80%', label: 'Faster payroll processing', color: '#D69A2D' },
                { value: '100%', label: 'Compliance-ready workflows', color: '#2BB673' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '18px 14px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E8ECF4', boxShadow: '0 4px 16px rgba(10,17,40,0.04)' }}>
                  <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 8, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <Button type="primary" onClick={() => navigate('/contact')} style={{ height: 46, padding: '0 28px', borderRadius: 999, fontWeight: 700, background: 'linear-gradient(90deg, #FF9800, #FF6D00)', border: 'none', boxShadow: '0 10px 24px rgba(255,109,0,0.25)' }}>
                See Saptta in action →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section
        className="responsive-padding home-section"
        style={{
          background: '#FFFFFF',
          padding: isMobile ? '56px 16px' : '88px 24px',
          borderBottom: '1px solid #EAECEF',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.06) 0.6px, transparent 0.6px)',
          backgroundSize: '18px 18px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -130,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 145, 60, 0.14) 0%, rgba(255, 145, 60, 0) 72%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            right: -100,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 74%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-up">
            <HomeSectionHeader
              eyebrow="Modular SaaS"
              title="HRMS and Finance are separate products."
              subtitle="Start with only what you need today and expand anytime. Saptta's modular SaaS model lets you run HRMS or Finance independently, then combine both when your business is ready."
              theme="amber"
              isMobile={isMobile}
              maxWidth={760}
            />
          </ScrollReveal>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {[
              {
                title: 'HRMS',
                description: 'Attendance, payroll, recruitment, performance and employee engagement in one product.',
                button: 'View HRMS',
                path: '/hrms',
                color: '#FF6D00',
                icon: <UserOutlined />,
                imageKey: 'modularHrms' as const,
                frame: 'arch' as const,
              },
              {
                title: 'Finance',
                description: 'GST invoicing, ledgers, purchase management, reconciliation and statutory reporting.',
                button: 'View Accounts',
                path: '/accounts',
                color: '#0B72FF',
                icon: <DollarCircleOutlined />,
                imageKey: 'modularAccounts' as const,
                frame: 'glass' as const,
              },
              {
                title: 'Saptta Complete',
                description: 'Unified HR + Finance workflows with payroll-ledger posting and consolidated analytics.',
                button: 'See Bundle',
                path: '/pricing',
                color: '#10B981',
                icon: <LineChartOutlined />,
                featured: true,
                imageKey: 'modularComplete' as const,
                frame: 'gradient-border' as const,
              },
            ].map((item, index) => (
              <ScrollReveal key={item.title} animation="fade-in-up" delay={index * 120}>
                <div
                  onMouseEnter={() => setHoveredModularCard(item.title)}
                  onMouseLeave={() => setHoveredModularCard(null)}
                  style={{
                    background: item.featured ? 'linear-gradient(180deg, #F5FDF9 0%, #FFFFFF 100%)' : 'var(--color-bg-base)',
                    borderRadius: 24,
                    border: hoveredModularCard === item.title ? `1px solid ${item.color}66` : '1px solid rgba(10,17,40,0.08)',
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    minHeight: 260,
                    transform: hoveredModularCard === item.title ? 'translateY(-6px)' : 'translateY(0)',
                    boxShadow: hoveredModularCard === item.title
                      ? `0 24px 52px rgba(10,17,40,0.12), 0 0 0 3px ${item.color}1A`
                      : '0 16px 40px rgba(10,17,40,0.05)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <MarketingImageFrame imageKey={item.imageKey} variant={item.frame} aspect="16/10" />
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 14, background: item.color + '22', color: item.color, fontWeight: 700, marginBottom: 18, fontSize: 18 }}>
                      {item.icon}
                    </div>
                    <h3 className="home-card-title home-card-title--sm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.title}
                      {item.featured && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', background: '#D1FAE5', padding: '4px 8px', borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Best Option
                        </span>
                      )}
                    </h3>
                    <p className="home-card-body" style={{ fontSize: '0.94rem' }}>{item.description}</p>
                  </div>
                  <Button
                    type="default"
                    onMouseEnter={() => setHoveredModularButton(item.title)}
                    onMouseLeave={() => setHoveredModularButton(null)}
                    style={{
                      marginTop: 'auto',
                      background: `linear-gradient(120deg, ${item.color} 0%, ${item.color}DD 42%, ${item.color} 100%)`,
                      backgroundSize: '200% 100%',
                      backgroundPosition: hoveredModularButton === item.title ? '100% 0' : '0 0',
                      color: 'white',
                      border: 'none',
                      fontWeight: 700,
                      height: 50,
                      borderRadius: 999,
                      padding: '0 22px',
                      boxShadow: hoveredModularButton === item.title ? `0 10px 22px ${item.color}55` : 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => navigate(item.path)}
                  >
                    {item.button}
                  </Button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Unified Product Cockpit Showcase Section ── */}
      <section className="responsive-padding home-section" style={{ background: 'linear-gradient(180deg, #FCFAFF 0%, #FFFFFF 48%, #FAFCFF 100%)', padding: isMobile ? '56px 16px' : '88px 24px', borderBottom: '1px solid #EAECEF', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -180, right: -140, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,59,255,0.20) 0%, rgba(108,59,255,0) 72%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -220, left: -140, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(67,56,202,0.14) 0%, rgba(67,56,202,0) 74%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '-8%', right: '-8%', top: 72, height: 120, borderRadius: '50%', border: '1px solid rgba(108,59,255,0.09)', transform: 'rotate(-3deg)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          
          {/* Main Cockpit Section Header */}
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Product cockpit"
              title="The Complete Operating System"
              titleHighlight="for People & Finance"
              subtitle="Stop stitching together isolated HR plugins and billing sheets. Saptta combines compliance payroll, smart attendance, and automated GST billing in one corporate cockpit."
              theme="purple"
              isMobile={isMobile}
              maxWidth={800}
            />
          </ScrollReveal>
          <ScrollReveal animation="fade-in-up">
            <div className="home-section-pills" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
              {[
                { label: 'HRMS', color: '#6C3BFF' },
                { label: 'Payroll', color: '#8B5CF6' },
                { label: 'Finance', color: '#2563EB' },
                { label: 'Attendance', color: '#0EA5E9' },
                { label: 'Compliance', color: '#10B981' },
              ].map((feature) => (
                <span key={feature.label} className="home-section-pill">
                  <span className="home-section-pill-dot" style={{ background: feature.color, boxShadow: `0 0 10px ${feature.color}66` }} />
                  {feature.label}
                </span>
              ))}
            </div>
          </ScrollReveal>

          {/* Switcher Tab Pills Controller */}
          <ScrollReveal animation="fade-in-up">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: 48,
              width: '100%'
            }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 8, 
                background: 'rgba(10, 17, 40, 0.03)', 
                padding: 6, 
                borderRadius: 16,
                border: '1px solid rgba(10, 17, 40, 0.05)',
                justifyContent: 'center',
                maxWidth: '100%'
              }}>
                {[
                  { id: 0, label: 'HRMS & Attendance', color: '#6C3BFF' },
                  { id: 1, label: 'Payroll', color: '#8B5CF6' },
                  { id: 2, label: 'Finance', color: '#2563EB' },
                  { id: 3, label: 'Compliance', color: '#10B981' }
                ].map(tab => {
                  const isActive = activeFeatureTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFeatureTab(tab.id)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        border: 'none',
                        background: isActive ? 'linear-gradient(120deg, #6C3BFF 0%, #8B5CF6 55%, #5B7CFF 100%)' : 'transparent',
                        color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                        fontSize: 14.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: isActive ? '0 10px 22px rgba(108,59,255,0.30)' : 'none'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(10, 17, 40, 0.05)';
                          e.currentTarget.style.color = 'var(--color-text-primary)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }
                      }}
                    >
                      <span style={{ 
                        width: 6, 
                        height: 6, 
                        borderRadius: '50%', 
                        background: isActive ? '#FFFFFF' : tab.color,
                        display: 'inline-block' 
                      }} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>

          {/* Active Product Showcase Horizontally Scrollable Layout (Side-by-Side Snapping) */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="no-scrollbar"
            style={{ 
              display: 'flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              width: '100%',
              gap: 0,
              padding: '24px 0'
            }}
          >
            {/* Slide 0: Core HRMS & Attendance */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="hrms-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 className="home-card-title">
                      Core HRMS & Geofence Attendance
                    </h3>
                    <p className="home-card-desc">
                      Deploy smart whitelisted geofencing parameters for your distributed operations teams. Employees check-in securely using mobile biometrics and verified GPS geolocators directly from our application.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                      {[
                        'Smart whitelisted GPS bounds & geofences',
                        'Fingerprint & face recognition authentication',
                        'Real-time employee movement mapping',
                        'Seamless leave & duty logs synchronization'
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,109,0,0.1)', color: 'var(--color-primary)', fontSize: 12, fontWeight: 500 }}>✓</div>
                          <span style={{ fontSize: 14.5, color: 'var(--color-text-secondary)' }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button type="link" onClick={() => navigate('/hrms')} style={{ color: 'var(--color-primary)', padding: 0, fontWeight: 500, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Explore HRMS Architecture Panel <span style={{ transition: 'transform 0.2s' }} className="arrow-hover">→</span>
                    </Button>
                  </ScrollReveal>
                </Col>

                {/* HRMS Dashboard Visual Showcase */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="fade-in-right">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 40px 20px 20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Glass Card Image Panel */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 24,
                        padding: 12,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        width: '100%'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 40px 80px rgba(10, 17, 40, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)';
                      }}>
                        {/* Morphing Organic Glow */}
                        <div className="morphing-blob" style={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          top: '-10%',
                          left: '-10%',
                          background: 'radial-gradient(circle, rgba(255,109,0,0.12) 0%, transparent 70%)',
                          filter: 'blur(45px)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }} />
                        <img 
                          src={getMarketingImageSrc('hrmsDashboard')} 
                          alt="Saptta HRMS Core Cockpit" 
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 16,
                            display: 'block',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            position: 'relative',
                            zIndex: 2
                          }} 
                        />
                      </div>

                      {/* Floating Glassmorphism Badge 1 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Active Hubs</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>42 Geofences</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Live Punch-Ins</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>1,492 Agents</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 3 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '45%',
                        right: isMobile ? '4px' : '-36px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF9800' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>GPS Accuracy</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>99.8% Whitelisted</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>

            {/* Slide 1: Statutory Payroll */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="payroll-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 className="home-card-title">
                      AI Payroll & Statutory Compliance
                    </h3>
                    <p className="home-card-desc">
                      Generate customized salary structures and process payroll runs in three clicks. SAPTTA natively incorporates ESI, PF, TDS calculations, and professional tax rules for Indian operations, ensuring zero discrepancies.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                      {[
                        'Automated ESI, PF, and TDS processing',
                        'One-click direct bank disbursements support',
                        'Customizable salary components & rules',
                        'Fully secure compliance report compile'
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(138,43,226,0.1)', color: 'var(--color-secondary)', fontSize: 12, fontWeight: 700 }}>✓</div>
                          <span style={{ fontSize: 14.5, color: 'var(--color-text-secondary)' }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button type="link" onClick={() => navigate('/hrms')} style={{ color: 'var(--color-secondary)', padding: 0, fontWeight: 500, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Explore Compliance Payroll Panel <span style={{ transition: 'transform 0.2s' }} className="arrow-hover">→</span>
                    </Button>
                  </ScrollReveal>
                </Col>

                {/* Payroll Dashboard Visual Showcase */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="fade-in-right">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 40px 20px 20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Glass Card Image Panel */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 24,
                        padding: 12,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        width: '100%'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 40px 80px rgba(10, 17, 40, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)';
                      }}>
                        {/* Morphing Organic Glow */}
                        <div className="morphing-blob" style={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          top: '-10%',
                          left: '-10%',
                          background: 'radial-gradient(circle, rgba(138,43,226,0.12) 0%, transparent 70%)',
                          filter: 'blur(45px)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }} />
                        <img 
                          src={getMarketingImageSrc('payrollDashboard')} 
                          alt="Saptta Payroll & Statutory Cockpit" 
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 16,
                            display: 'block',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            position: 'relative',
                            zIndex: 2
                          }} 
                        />
                      </div>

                      {/* Floating Glassmorphism Badge 1 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Compliance PF/ESI</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>100% Matched</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-secondary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Nov Gross Payroll</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>₹42.50 Lakhs</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 3 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '45%',
                        left: isMobile ? '4px' : '-36px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Direct Payouts</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>ICICI Bank Sync</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>

            {/* Slide 2: GST Invoicing */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="gst-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 className="home-card-title">
                      GST Invoicing & Double-Entry Accounting
                    </h3>
                    <p className="home-card-desc">
                      Issue legal tax invoices, process instant double-entry banking ledger transactions, and audit P&L statements directly. Includes Razorpay integration to reconcile payment files dynamically.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                      {[
                        'Compliant GST invoice issuance & filings',
                        'Automatic double-entry accounts ledger entry',
                        'Razorpay and banking settlements reconciliation',
                        'Instant Profit & Loss registry compiler'
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,200,83,0.1)', color: 'var(--color-success)', fontSize: 12, fontWeight: 700 }}>✓</div>
                          <span style={{ fontSize: 14.5, color: 'var(--color-text-secondary)' }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button type="link" onClick={() => navigate('/accounts')} style={{ color: 'var(--color-success)', padding: 0, fontWeight: 500, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Explore Accounts Ledger Panel <span style={{ transition: 'transform 0.2s' }} className="arrow-hover">→</span>
                    </Button>
                  </ScrollReveal>
                </Col>

                {/* GST Dashboard Visual Showcase */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="fade-in-right">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 40px 20px 20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Glass Card Image Panel */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 24,
                        padding: 12,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        width: '100%'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 40px 80px rgba(10, 17, 40, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)';
                      }}>
                        {/* Morphing Organic Glow */}
                        <div className="morphing-blob" style={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          top: '-10%',
                          left: '-10%',
                          background: 'radial-gradient(circle, rgba(0,200,83,0.12) 0%, transparent 70%)',
                          filter: 'blur(45px)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }} />
                        <img 
                          src={getMarketingImageSrc('gstDashboard')} 
                          alt="Saptta GST Invoicing & Accounting Cockpit" 
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 16,
                            display: 'block',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            position: 'relative',
                            zIndex: 2
                          }} 
                        />
                      </div>

                      {/* Floating Glassmorphism Badge 1 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Razorpay Settlement</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>100% Synced</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>GST Returns GSTR-1</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Auto-Compiled</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 3 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '45%',
                        left: isMobile ? '4px' : '-36px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-secondary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>P&L Register</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Zero Discrepancies</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>

            {/* Slide 3: Claude AI Auditor */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="claude-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 className="home-card-title">
                      Chatbot HR Support & Smart Tax Auditing
                    </h3>
                    <p className="home-card-desc" style={{ marginBottom: 28 }}>
                      SAPTTA coordinates natively with Anthropic's Claude LLMs to analyze payroll anomalies, draft quick reports, audit GST billing accounts, and provide instant employee onboarding support.
                    </p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                      {['Smart Payroll Anomaly Audits', 'Chatbot Employee HR Desk', 'Automated GST Returns Filing Support', 'LangChain Native Engine'].map(f => (
                        <span key={f} style={{
                          padding: '8px 16px', borderRadius: 8, background: 'var(--color-bg-container)', border: '1px solid rgba(10,17,40,0.06)',
                          fontSize: 13, fontWeight: 500, color: 'rgba(10,17,40,0.65)'
                        }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </ScrollReveal>
                </Col>

                {/* Claude Conversational Console Terminal */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="scale-in">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 20px 20px 40px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Futuristic MacOS-Style Control Bar & Terminal */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: '#060B1A', 
                        borderRadius: 24,
                        border: '1px solid rgba(255, 109, 0, 0.15)',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 109, 0, 0.05)',
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: 'column',
                        width: '100%'
                      }}>
                        {/* Futuristic MacOS-Style Control Bar */}
                        <div style={{ 
                          background: '#0A1128', 
                          padding: '16px 24px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          borderBottom: '1px solid rgba(255, 109, 0, 0.1)'
                        }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56', display: 'inline-block' }} />
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', display: 'inline-block' }} />
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F', display: 'inline-block' }} />
                              <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 11, marginLeft: 12, letterSpacing: '0.5px' }}>saptta_ai_auditor.sh</span>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 12px #00E676', animation: 'logoBgPulse 2s infinite' }} />
                              <span style={{ background: 'rgba(255, 109, 0, 0.15)', border: '1px solid rgba(255,109,0,0.3)', padding: '4px 12px', borderRadius: 8, fontSize: 10, color: '#FF6D00', fontWeight: 500, fontFamily: 'monospace' }}>
                                AI_SECURE_OK
                              </span>
                           </div>
                        </div>

                        <div className="sandbox-inner-padding" style={{ padding: '32px 28px', background: '#060B1A', minHeight: 330, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                          <div style={{ marginTop: 10 }}>
                            {/* User Command Prompt */}
                            {chatState !== 'idle' && (
                              <div className="chat-message-reveal" style={{ display: 'flex', gap: 12, marginBottom: 20, justifyContent: 'flex-end' }}>
                                {chatState === 'typing-user' ? (
                                  <div className="typing-cursor" style={{
                                    background: '#0A1128', 
                                    borderRadius: '16px 16px 4px 16px',
                                    padding: '14px 20px', 
                                    color: 'rgba(255,255,255,0.5)', 
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}>
                                    saptta@admin:~$ run_audit --month=nov_24
                                  </div>
                                ) : (
                                  <div style={{
                                    background: '#0A1128', 
                                    borderRadius: '16px 16px 4px 16px',
                                    padding: '14px 20px', 
                                    color: 'rgba(255,255,255,0.95)', 
                                    fontSize: 13, 
                                    maxWidth: '85%', 
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                    fontFamily: 'monospace',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}>
                                    <span style={{ color: '#00E676' }}>saptta@admin:~$</span> audit_payroll --cycle="November 2024" --flag-discrepancies
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Claude AI CLI Response */}
                            {(chatState === 'typing-claude' || chatState === 'show-claude') && (
                              <div className="chat-message-reveal" style={{ display: 'flex', gap: 12 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(255, 109, 0, 0.15)',
                                  border: '1px solid rgba(255, 109, 0, 0.3)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  fontSize: 13, fontWeight: 500, color: '#FF6D00'
                                }}>
                                  ✦
                                </div>

                                {chatState === 'typing-claude' ? (
                                  <div className="typing-cursor" style={{
                                    background: '#0A1128', 
                                    border: '1px solid rgba(255, 109, 0, 0.2)',
                                    borderRadius: '16px 16px 16px 4px', 
                                    padding: '16px 20px', 
                                    color: '#FF6D00',
                                    fontSize: 13,
                                    fontFamily: 'monospace'
                                  }}>
                                    [PROCESS] Scanning biometric registers and statutory tax ledgers...
                                  </div>
                                ) : (
                                  <div style={{
                                    background: '#0A1128', 
                                    border: '1px solid rgba(255, 109, 0, 0.25)',
                                    borderRadius: '16px 16px 16px 4px', 
                                    padding: '20px 24px', 
                                    color: '#E0E6ED',
                                    fontSize: 13.5, 
                                    maxWidth: '85%', 
                                    boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                                    fontFamily: 'monospace',
                                    lineHeight: 1.6
                                  }}>
                                    <div style={{ color: '#FF6D00', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6D00' }} /> SAPTTA AI AUDITOR v1.0.4
                                    </div>
                                    <span style={{ color: '#FFF', display: 'block', marginBottom: 8 }}>[AUDIT RESULT] Mismatch Found (1 Flagged):</span>
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>• Employee </span>
                                    <span style={{ color: '#FFD54F' }}>#802 (Rahul Sharma)</span>
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}> missing biometric punch for 24-Nov-2024.</span>
                                    <br />
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>• Recommendation: Deduct 1 day leave or request manual approval.</span>
                                    <br />
                                    <span style={{ color: '#00E676' }}>• ESI & PF computations: 100% compliant with statutory limits.</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {chatState === 'idle' && (
                              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '50px 0', fontFamily: 'monospace' }}>
                                <span>⚡ Standing by... Waiting for console prompt stream.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 1 - AI Agent */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Active AI Agent</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Claude-3.5-Sonnet</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 - Audit Integrity */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Audit Integrity</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Zero Anomalies</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>
          </div>


        </div>
      </section>

      {/* ── Customer proof & testimonials ── */}
      <section className="responsive-padding home-section" style={{ background: '#FAFBFC', padding: isMobile ? '56px 16px' : '80px 24px', borderBottom: '1px solid #EAECEF' }}>
        <div className="home-section-inner" style={{ maxWidth: 1320 }}>
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Customer stories"
              title="Trusted by growing teams"
              titleHighlight="across India"
              subtitle="HR and finance leaders use Saptta to reduce manual work and stay audit-ready."
              theme="navy"
              isMobile={isMobile}
              maxWidth={600}
            />
          </ScrollReveal>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 18, marginBottom: 36 }}>
            {[
              {
                quote: 'We cut payroll processing time by nearly 70%. PF and ESI checks that used to take hours now happen automatically.',
                name: 'Priya Sharma',
                role: 'HR Head · Manufacturing',
                company: 'Apex Industries',
                imageKey: 'testimonial1' as const,
              },
              {
                quote: 'GST reconciliation and bank matching are finally in one place. Our finance team closes books faster every month.',
                name: 'Rahul Mehta',
                role: 'Finance Manager · IT Services',
                company: 'NovaTech Solutions',
                imageKey: 'testimonial2' as const,
              },
              {
                quote: 'Attendance, leave, and payroll sync removed daily follow-ups. Leadership gets live dashboards without Excel chaos.',
                name: 'Anita Reddy',
                role: 'Operations Director · Retail',
                company: 'UrbanMart Group',
                imageKey: 'testimonial3' as const,
              },
            ].map((t, i) => (
              <ScrollReveal key={t.name} animation="fade-in-up" delay={i * 100}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF4', borderRadius: 16, padding: 24, height: '100%', boxShadow: '0 8px 24px rgba(10,17,40,0.04)' }}>
                  <p style={{ margin: '0 0 20px', color: '#374151', fontSize: 14, lineHeight: 1.75, fontStyle: 'italic' }}>&ldquo;{t.quote}&rdquo;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, flexShrink: 0 }} className="mkt-img--sm">
                      <MarketingImageFrame imageKey={t.imageKey} variant="circle" aspect="1/1" className="mkt-img--sm" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{t.name}</div>
                      <div style={{ color: '#6B7280', fontSize: 12 }}>{t.role}</div>
                      <div style={{ color: '#1E2A78', fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>{t.company}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal animation="fade-in-up">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? 16 : 32, opacity: 0.55 }}>
              {['Manufacturing', 'IT & Services', 'Retail', 'Healthcare', 'Agencies', 'Logistics'].map((ind) => (
                <span key={ind} style={{ fontWeight: 700, fontSize: 13, color: '#374151', letterSpacing: '-0.2px' }}>{ind}</span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Secure, Compliant, Reliable ── */}
      <section
        className="responsive-padding home-section"
        style={{
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF4FF 38%, #F8FAFF 72%, #FFFFFF 100%)',
          padding: isMobile ? '56px 16px' : '88px 24px',
          borderBottom: '1px solid #E8ECF8',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -100, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,59,255,0.12) 0%, transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 56, alignItems: 'center' }}>
            <ScrollReveal animation="fade-in-left">
              <div>
                <HomeSectionHeader
                  eyebrow="Enterprise trust"
                  title="Secure, compliant,"
                  titleHighlight="and reliable."
                  subtitle="Built for Indian enterprises — bank-grade encryption, statutory compliance controls, and audit-ready infrastructure so your HR and finance data stays protected end to end."
                  align="left"
                  theme="indigo"
                  isMobile={isMobile}
                  maxWidth={440}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { title: 'End-to-end encryption', desc: 'TLS in transit and encrypted storage for payroll, PII, and financial records.', icon: <LockOutlined />, color: '#6C3BFF' },
                    { title: 'Role-based access control', desc: 'Granular permissions for HR, Finance, auditors, and admins.', icon: <SafetyCertificateOutlined />, color: '#4F46E5' },
                    { title: 'Immutable audit trails', desc: 'Every approval and change logged for internal and statutory audits.', icon: <AuditOutlined />, color: '#2563EB' },
                    { title: 'Resilient cloud infrastructure', desc: 'Monitored backups, high availability, and disaster recovery readiness.', icon: <CloudServerOutlined />, color: '#4338CA' },
                  ].map((f) => (
                    <div
                      key={f.title}
                      style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(79,70,229,0.10)',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${f.color}18, ${f.color}08)`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px solid ${f.color}22` }}>
                        {f.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14.5, marginBottom: 3 }}>{f.title}</div>
                        <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.55 }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-in-right">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                <SecurityIllustration compact={isMobile} />

                <div style={{ width: '100%', maxWidth: 420 }}>
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748B' }}>Compliance ready</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { label: 'PF & ESI', sub: 'Statutory' },
                      { label: 'GST', sub: 'Filing' },
                      { label: 'TDS', sub: 'Payroll' },
                      { label: 'Audit Logs', sub: 'Immutable' },
                      { label: 'RBAC', sub: 'Access' },
                      { label: 'Data Privacy', sub: 'PII safe' },
                    ].map((badge) => (
                      <div
                        key={badge.label}
                        style={{
                          textAlign: 'center',
                          padding: '12px 10px',
                          borderRadius: 12,
                          background: '#FFFFFF',
                          border: '1px solid #E0E7FF',
                          boxShadow: '0 6px 20px rgba(79,70,229,0.07)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#312E81', letterSpacing: '-0.2px' }}>{badge.label}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{badge.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── 7. Built-in Compliance Features Array ── */}
      <section
        className="responsive-padding home-section"
        style={{
          background: '#FFFFFF',
          padding: isMobile ? '56px 16px' : '88px 24px',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.055) 0.6px, transparent 0.6px)',
          backgroundSize: '18px 18px',
        }}
      >
        <div className="home-section-inner" style={{ maxWidth: 1320 }}>
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Compliance built-in"
              title="Compliance & Safety"
              titleHighlight="Standard"
              subtitle="Enterprise-grade controls built into every workflow for data safety, legal readiness, and operational trust."
              theme="green"
              isMobile={isMobile}
              maxWidth={720}
            />
            <div className="home-section-pills" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: -8, marginBottom: 48 }}>
              {['PF', 'ESI', 'TDS', 'GST', 'Audit Logs', 'RBAC', 'Encrypted'].map((badge) => (
                <span key={badge} className="home-section-badge">
                  {badge}
                </span>
              ))}
            </div>
          </ScrollReveal>

          <div>
            <Row gutter={[24, 24]}>
              {[
                {
                  title: 'Data Encryption Vault',
                  desc: 'At-rest and in-transit encryption with secure key lifecycle practices for enterprise data.',
                  accent: '#6C3BFF',
                  iconBg: '#F3EEFF',
                  icon: <WalletOutlined />,
                },
                {
                  title: 'GST & Payroll Compliance',
                  desc: 'Auto-validated statutory calculations for GST, PF, ESI, and payroll filing workflows.',
                  accent: '#F59E0B',
                  iconBg: '#FFF4E1',
                  icon: <FundProjectionScreenOutlined />,
                },
                {
                  title: 'Role-Based Access Control',
                  desc: 'Granular permission layers for HR, Finance, Auditors, and Admin stakeholders.',
                  accent: '#10B981',
                  iconBg: '#EAFBF3',
                  icon: <UserOutlined />,
                },
                {
                  title: 'Audit-Ready Activity Logs',
                  desc: 'Immutable logs for approvals, updates, and critical actions to support internal audits.',
                  accent: '#2563EB',
                  iconBg: '#EAF1FF',
                  icon: <LineChartOutlined />,
                },
                {
                  title: 'Attendance Trust Controls',
                  desc: 'Geo-fencing and validated punch flows ensure reliable attendance and shift records.',
                  accent: '#8B5CF6',
                  iconBg: '#F2EDFF',
                  icon: <CalendarOutlined />,
                },
                {
                  title: 'Business Continuity Backup',
                  desc: 'Scheduled backups and monitored restore points for continuity across business units.',
                  accent: '#14B8A6',
                  iconBg: '#E8FBF8',
                  icon: <CreditCardOutlined />,
                },
              ].map((f, i) => (
                <Col key={f.title} xs={24} sm={12} lg={8}>
                  <ScrollReveal animation="fade-in-up" delay={i * 80}>
                    <div
                      onMouseEnter={() => setHoveredComplianceCard(f.title)}
                      onMouseLeave={() => setHoveredComplianceCard(null)}
                      style={{
                        padding: 28,
                        borderRadius: 18,
                        background: '#FFFFFF',
                        border: hoveredComplianceCard === f.title ? `1px solid ${f.accent}88` : '1px solid rgba(10,17,40,0.08)',
                        borderTop: `3px solid ${f.accent}`,
                        boxShadow: hoveredComplianceCard === f.title
                          ? `0 16px 34px rgba(10, 17, 40, 0.10), 0 0 0 3px ${f.accent}1A`
                          : '0 8px 24px rgba(10, 17, 40, 0.05)',
                        transform: hoveredComplianceCard === f.title ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                        height: '100%',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: f.iconBg, color: f.accent, marginBottom: 14, fontSize: 18 }}>
                        {f.icon}
                      </div>
                      <h4 className="home-card-h4">{f.title}</h4>
                      <p className="home-card-body">{f.desc}</p>
                    </div>
                  </ScrollReveal>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </section>

      {/* ── 8. Partner Integrations ── */}
      <section className="responsive-padding home-section" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FCFCFF 100%)', padding: isMobile ? '56px 16px' : '80px 24px', borderTop: '1px solid #EAECEF', borderBottom: '1px solid #EAECEF', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, left: '10%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,59,255,0.08) 0%, rgba(108,59,255,0) 72%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -140, right: '8%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0) 72%)', pointerEvents: 'none' }} />
        <div className="home-section-inner" style={{ maxWidth: 900, textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Integrations"
              title="Native Partner"
              titleHighlight="Integrations"
              subtitle="Connect the tools your teams already use with secure, native integrations."
              theme="purple"
              isMobile={isMobile}
              maxWidth={560}
            />
          </ScrollReveal>
          
          <ScrollReveal animation="scale-in">
            <div
              ref={integrationScrollRef}
              className="no-scrollbar"
              style={{
                display: 'flex',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                gap: 12,
                justifyContent: isMobile ? 'flex-start' : 'center',
                overflowX: isMobile ? 'auto' : 'visible',
                paddingBottom: isMobile ? 6 : 0,
              }}
            >
              {[
                'Microsoft 365',
                'Slack',
                'Google Workspace',
                'QuickBooks',
                'Zoho',
                'AWS',
                'Razorpay',
              ].map(item => (
                <span
                  key={item}
                  onMouseEnter={() => setHoveredIntegrationChip(item)}
                  onMouseLeave={() => setHoveredIntegrationChip(null)}
                  style={{
                  padding: '12px 24px',
                  borderRadius: 999,
                  cursor: 'default',
                  background: '#FFFFFF',
                  border: hoveredIntegrationChip === item ? '1px solid rgba(108,59,255,0.38)' : '1px solid rgba(10,17,40,0.08)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  transition: 'all 0.25s ease',
                  boxShadow: hoveredIntegrationChip === item
                    ? '0 10px 24px rgba(108,59,255,0.18), 0 0 0 3px rgba(108,59,255,0.12)'
                    : '0 8px 20px rgba(10,17,40,0.05)',
                  transform: hoveredIntegrationChip === item ? 'translateY(-2px)' : 'translateY(0)',
                  flex: isMobile ? '0 0 auto' : '0 0 auto',
                }}
                >
                  {item}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="responsive-padding home-section" style={{ background: '#FFFFFF', padding: isMobile ? '56px 16px' : '80px 24px', borderTop: '1px solid #EAECEF' }}>
        <div className="home-section-inner" style={{ maxWidth: 1100 }}>
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Pricing"
              title="Simple plans."
              titleHighlight="Start with what you need."
              subtitle="Modular HRMS and Finance — combine when you're ready."
              theme="amber"
              isMobile={isMobile}
              maxWidth={560}
            />
          </ScrollReveal>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 18, alignItems: 'stretch' }}>
            {[
              { title: 'HRMS', price: 'From ₹999', sub: 'per employee / month', desc: 'Attendance, payroll, leave, performance', path: '/hrms', color: '#1E2A78', cta: 'View HRMS' },
              { title: 'Finance', price: 'From ₹1,499', sub: 'per org / month', desc: 'GST, invoicing, ledger, reconciliation', path: '/accounts', color: '#2BB673', cta: 'View Finance' },
              { title: 'Saptta Complete', price: 'Best value', sub: 'HR + Finance unified', desc: 'Payroll-to-ledger sync, consolidated analytics', path: '/pricing', color: '#D69A2D', cta: 'See Bundle', featured: true },
            ].map((plan, i) => (
              <ScrollReveal key={plan.title} animation="fade-in-up" delay={i * 90}>
                <div
                  onMouseEnter={() => setHoveredPricingCard(plan.title)}
                  onMouseLeave={() => setHoveredPricingCard(null)}
                  style={{
                    padding: 26,
                    borderRadius: 18,
                    background: plan.featured ? 'linear-gradient(180deg, #FFFBF5 0%, #FFFFFF 100%)' : '#FFFFFF',
                    border: plan.featured ? `2px solid ${plan.color}` : hoveredPricingCard === plan.title ? `1px solid ${plan.color}66` : '1px solid #E8ECF4',
                    boxShadow: hoveredPricingCard === plan.title || plan.featured ? '0 16px 40px rgba(10,17,40,0.08)' : '0 6px 20px rgba(10,17,40,0.04)',
                    transform: hoveredPricingCard === plan.title ? 'translateY(-4px)' : 'translateY(0)',
                    transition: 'all 0.28s ease',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  {plan.featured && (
                    <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#FFFFFF', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Most Popular
                    </span>
                  )}
                  <h3 className="home-card-title home-card-title--sm" style={{ marginBottom: 6 }}>{plan.title}</h3>
                  <div style={{ fontSize: 26, fontWeight: 800, color: plan.color, marginBottom: 2 }}>{plan.price}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>{plan.sub}</div>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#6B7280', lineHeight: 1.65, flex: 1 }}>{plan.desc}</p>
                  <Button onClick={() => navigate(plan.path)} style={{ height: 44, borderRadius: 999, fontWeight: 700, background: plan.featured ? `linear-gradient(90deg, ${plan.color}, #E2AD4A)` : plan.color, border: 'none', color: '#FFFFFF' }}>
                    {plan.cta}
                  </Button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Client Confidentiality & Security ── */}
      <section className="responsive-padding home-section" style={{ padding: isMobile ? '64px 16px' : '96px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, rgba(79,70,229,0) 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -140, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,151,241,0.10) 0%, rgba(37,151,241,0) 70%)', pointerEvents: 'none' }} />

        <div className="home-section-inner" style={{ maxWidth: 1100, position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EEE8FF', border: '1px solid #D8E0FA', padding: '6px 14px', borderRadius: 999, marginBottom: 16 }}>
              <CheckCircleOutlined style={{ color: '#2BB673' }} />
              <span style={{ color: '#6C3BFF', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Enterprise Security</span>
            </div>
            <h2 style={{ color: '#0F172A', fontSize: isMobile ? 32 : 46, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Client Confidentiality Is <span style={{ color: '#6C3BFF' }}>Our Priority</span>
            </h2>
            <p style={{ color: '#64748B', fontSize: isMobile ? 16 : 18, margin: '0 auto', maxWidth: 640, lineHeight: 1.6 }}>
              Your sensitive HR, payroll, and financial data is protected by bank-grade security protocols and strict privacy controls. We never compromise on your data's safety.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { title: 'End-to-End Encryption', desc: 'All data is encrypted both in transit and at rest using AES-256 standards, ensuring complete protection from unauthorized access.', icon: <LockOutlined />, color: '#6C3BFF' },
              { title: 'Strict Role-Based Access', desc: 'Granular permissions ensure that only authorized personnel can view sensitive payroll and ledger information within your organization.', icon: <AuditOutlined />, color: '#0EA5E9' },
              { title: 'Zero Data Selling Policy', desc: 'Your data is strictly yours. We operate with complete transparency and guarantee that we never share or sell client information to third parties.', icon: <SafetyCertificateOutlined />, color: '#2BB673' },
            ].map((item, i) => (
              <ScrollReveal key={item.title} animation="fade-in-up" delay={i * 100}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF4', borderRadius: 20, padding: 32, height: '100%', boxShadow: '0 8px 24px rgba(30,42,120,0.06)', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }} className="stat-card-hover">
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${item.color}14`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20 }}>
                    {item.icon}
                  </div>
                  <h4 style={{ color: '#0F172A', fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>{item.title}</h4>
                  <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner variant="hero" />
    </div>
  );
}
