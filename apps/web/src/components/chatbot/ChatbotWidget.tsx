import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useChatbot } from './useChatbot';
import { useChatbotContext } from './useChatbotContext';
import { useAuth } from '../../contexts/AuthContext';

/* ─── Per-context starter prompts ───────────────────────────────────────── */
const STARTERS = {
  finance: [
    '💰 What is my current cash balance?',
    '📋 Show overdue invoices',
    '📊 P&L summary for this month',
    '🧾 GST summary for this month',
    '📬 Draft a payment reminder',
  ],
  hr: [
    '👥 How many active employees do we have?',
    '📅 Who is absent today?',
    '✋ Show pending leave requests',
    '💸 Payroll summary for last run',
    '🆕 Who joined this month?',
  ],
  general: [
    '🏢 What can Saptta HR do?',
    '💼 What features does fin-saptta have?',
    '🔄 How does payroll work in Saptta?',
    '📊 What reports can fin-saptta generate?',
    '🎯 How do I set up GST in fin-saptta?',
  ],
};

const WELCOME = {
  finance: 'Ask me about invoices, cash flow, GST, P&L, vendor bills, or get a payment reminder drafted.',
  hr: 'Ask me about headcount, attendance, leave approvals, payroll totals, or new joiners.',
  general: 'I can explain Saptta features and guide you to the right module. For live data, use the Finance or HR AI.',
};

const BADGE_COLORS = {
  finance: { bg: 'rgba(16,185,129,0.15)', text: '#059669', border: 'rgba(16,185,129,0.30)' },
  hr: { bg: 'rgba(99,102,241,0.15)', text: '#4F46E5', border: 'rgba(99,102,241,0.30)' },
  general: { bg: 'rgba(255,109,0,0.12)', text: '#FF6D00', border: 'rgba(255,109,0,0.25)' },
};

/* ─── Per-context premium themes ────────────────────────────────────────── */
const THEMES = {
  finance: {
    primary: '#10B981',
    primaryLight: '#34D399',
    rgb: '16, 185, 129',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    bgLight: 'rgba(16,185,129,0.07)',
    borderLight: 'rgba(16,185,129,0.20)',
    hoverBg: 'rgba(16,185,129,0.14)',
    hoverBorder: 'rgba(16,185,129,0.40)',
    shadow: 'rgba(16,185,129,0.30)',
  },
  hr: {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    rgb: '99, 102, 241',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    bgLight: 'rgba(99,102,241,0.07)',
    borderLight: 'rgba(99,102,241,0.20)',
    hoverBg: 'rgba(99,102,241,0.14)',
    hoverBorder: 'rgba(99,102,241,0.40)',
    shadow: 'rgba(99,102,241,0.30)',
  },
  general: {
    primary: '#FF6D00',
    primaryLight: '#FF9800',
    rgb: '255, 109, 0',
    gradient: 'linear-gradient(135deg, #E65100 0%, #FF6D00 100%)',
    bgLight: 'rgba(255,109,0,0.07)',
    borderLight: 'rgba(255,109,0,0.20)',
    hoverBg: 'rgba(255,109,0,0.14)',
    hoverBorder: 'rgba(255,109,0,0.40)',
    shadow: 'rgba(255,109,0,0.30)',
  },
};

/* ─── Typing dots animation ──────────────────────────────────────────────── */
function TypingDots({ context }: { context: 'finance' | 'hr' | 'general' }) {
  const theme = THEMES[context];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: theme.primary,
            display: 'inline-block',
            animation: `saptta-dot-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </span>
  );
}

/* ─── Single message bubble ──────────────────────────────────────────────── */
function MessageBubble({ role, content, context }: { role: 'user' | 'assistant'; content: string; context: 'finance' | 'hr' | 'general' }) {
  const isUser = role === 'user';
  const theme = THEMES[context];
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 10,
        animation: 'saptta-msg-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: theme.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            flexShrink: 0,
            marginRight: 8,
            marginTop: 2,
            boxShadow: `0 2px 8px ${theme.shadow}`,
          }}
        >
          ✨
        </div>
      )}
      <div
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? theme.gradient
            : 'rgba(255,255,255,0.85)',
          color: isUser ? '#fff' : '#0A1128',
          fontSize: 13.5,
          lineHeight: 1.6,
          boxShadow: isUser
            ? `0 4px 14px ${theme.shadow}`
            : '0 2px 10px rgba(10,17,40,0.05)',
          border: isUser ? 'none' : '1px solid rgba(10,17,40,0.06)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          backdropFilter: isUser ? 'none' : 'blur(8px)',
        }}
      >
        {content}
      </div>
    </div>
  );
}

/* ─── Main widget ────────────────────────────────────────────────────────── */
export default function ChatbotWidget() {
  const { isAuthenticated, user } = useAuth();
  const ctx = useChatbotContext();
  const { messages, isLoading, sendMessage, clearHistory } = useChatbot(ctx.context);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pulse, setPulse] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) setPulse(false); }, [open]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => { if (open) setTimeout(() => textareaRef.current?.focus(), 120); }, [open]);

  function handleSend() {
    if (!input.trim() || isLoading) return;
    if (!isAuthenticated) { setInput(''); return; }
    sendMessage(input);
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const greeting = user?.firstName ? `Hi ${user.firstName}! ` : 'Hi there! ';
  const badgeColors = BADGE_COLORS[ctx.context];
  const starters = STARTERS[ctx.context];
  const theme = THEMES[ctx.context];

  return (
    <>
      {/* ── Keyframes and Custom CSS Variables ─────────────────────────── */}
      <style>{`
        :root {
          --saptta-primary-rgb: ${theme.rgb};
          --saptta-primary-color: ${theme.primary};
        }
        @keyframes saptta-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes saptta-msg-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes saptta-fab-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--saptta-primary-rgb), 0.5), 0 8px 24px rgba(var(--saptta-primary-rgb), 0.35); }
          70%       { box-shadow: 0 0 0 14px rgba(var(--saptta-primary-rgb), 0), 0 8px 24px rgba(var(--saptta-primary-rgb), 0.35); }
        }
        @keyframes saptta-panel-in {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        #saptta-chat-textarea::-webkit-scrollbar { width: 4px; }
        #saptta-chat-textarea::-webkit-scrollbar-track { background: transparent; }
        #saptta-chat-textarea::-webkit-scrollbar-thumb { background: rgba(var(--saptta-primary-rgb), 0.2); border-radius: 4px; }
        #saptta-msgs::-webkit-scrollbar { width: 4px; }
        #saptta-msgs::-webkit-scrollbar-track { background: transparent; }
        #saptta-msgs::-webkit-scrollbar-thumb { background: rgba(var(--saptta-primary-rgb), 0.15); border-radius: 4px; }
      `}</style>

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        id="saptta-chat-fab"
        aria-label={open ? 'Close Saptta AI Chat' : 'Open Saptta AI Chat'}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open
            ? 'linear-gradient(135deg, #1E2A78 0%, #0A1128 100%)'
            : theme.gradient,
          color: '#fff', fontSize: open ? 22 : 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
          animation: !open && pulse ? 'saptta-fab-pulse 2.2s ease-in-out infinite' : 'none',
          boxShadow: `0 8px 24px ${theme.shadow}`,
          transform: open ? 'rotate(90deg)' : 'none',
        }}
        onMouseEnter={(e) => { 
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.transform = open ? 'rotate(90deg) scale(1.08)' : 'scale(1.08)'; 
        }}
        onMouseLeave={(e) => { 
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.transform = open ? 'rotate(90deg) scale(1)' : 'scale(1)'; 
        }}
      >
        {open ? '✕' : '✨'}
      </button>

      {/* ── Panel ───────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Saptta ${ctx.label}`}
          style={{
            position: 'fixed', bottom: 100, right: 28, zIndex: 9998,
            width: 370, height: 560, borderRadius: 20,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(10,17,40,0.20), 0 0 0 1px rgba(var(--saptta-primary-rgb), 0.15)',
            animation: 'saptta-panel-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
            background: 'rgba(250,250,252,0.85)',
            backdropFilter: 'blur(28px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: '16px 18px 14px',
              background: 'linear-gradient(135deg, #1E2A78 0%, #0A1128 100%)',
              display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: theme.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, boxShadow: `0 4px 12px ${theme.shadow}`, flexShrink: 0,
                animation: 'saptta-msg-in 0.3s ease',
              }}
            >
              ✨
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                  Saptta AI
                </span>
                {/* Context badge */}
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px',
                    borderRadius: 999, letterSpacing: '0.02em',
                    background: badgeColors.bg, color: badgeColors.text,
                    border: `1px solid ${badgeColors.border}`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {ctx.badge}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                {ctx.label} · AI Assistant
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {messages.length > 0 && (
                <button
                  aria-label="Clear conversation"
                  onClick={clearHistory}
                  title="Clear conversation"
                  style={{
                    background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                    fontSize: 12, padding: '4px 8px', transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)'; }}
                >
                  Clear
                </button>
              )}
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#34D399', boxShadow: '0 0 8px #34D399', flexShrink: 0,
                }}
                title="Online"
              />
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            id="saptta-msgs"
            style={{
              flex: 1, overflowY: 'auto', padding: '16px 14px 8px',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {messages.length === 0 && !isAuthenticated && (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1128', marginBottom: 8 }}>
                  Saptta AI Assistant
                </div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                  Sign in to chat with our AI — ask about invoices, payroll, GST, employee data, and more.
                </div>
                <a
                  href="/login"
                  style={{
                    display: 'inline-block', padding: '10px 24px', borderRadius: 10,
                    background: theme.gradient, color: '#fff', fontWeight: 600, fontSize: 13.5,
                    textDecoration: 'none', boxShadow: `0 4px 14px ${theme.shadow}`,
                  }}
                >
                  Sign in to chat →
                </a>
                <div style={{ marginTop: 16, fontSize: 11.5, color: '#94A3B8' }}>
                  Don't have an account?{' '}
                  <a href="/signup" style={{ color: theme.primary, textDecoration: 'none', fontWeight: 600 }}>
                    Sign up free
                  </a>
                </div>
              </div>
            )}

            {messages.length === 0 && isAuthenticated && (
              <div style={{ textAlign: 'center', padding: '12px 8px 4px' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>👋</div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0A1128', marginBottom: 4 }}>
                  {greeting}I'm your {ctx.label}
                </div>
                <div style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.55, marginBottom: 18 }}>
                  {WELCOME[ctx.context]}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        background: theme.bgLight, border: `1px solid ${theme.borderLight}`,
                        borderRadius: 999, padding: '6px 14px', fontSize: 12,
                        color: '#1E2A78', cursor: 'pointer', fontWeight: 500,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left',
                        boxShadow: '0 1px 3px rgba(10,17,40,0.02)',
                      }}
                      onMouseEnter={(e) => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.background = theme.hoverBg;
                        b.style.borderColor = theme.hoverBorder;
                        b.style.transform = 'translateY(-1px)';
                        b.style.boxShadow = '0 3px 8px rgba(10,17,40,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.background = theme.bgLight;
                        b.style.borderColor = theme.borderLight;
                        b.style.transform = 'translateY(0)';
                        b.style.boxShadow = '0 1px 3px rgba(10,17,40,0.02)';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} context={ctx.context} />
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: theme.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, flexShrink: 0, boxShadow: `0 2px 8px ${theme.shadow}`,
                  }}
                >
                  ✨
                </div>
                <div
                  style={{
                    padding: '10px 16px', borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(10,17,40,0.06)',
                    boxShadow: '0 2px 10px rgba(10,17,40,0.05)', backdropFilter: 'blur(8px)',
                  }}
                >
                  <TypingDots context={ctx.context} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'rgba(10,17,40,0.07)', flexShrink: 0 }} />

          {/* ── Input ── */}
          <div
            style={{
              padding: '12px 14px', flexShrink: 0,
              background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(12px)',
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'flex-end', gap: 8,
                background: 'rgba(250,250,252,0.9)', border: '1.5px solid rgba(10,17,40,0.08)',
                borderRadius: 14, padding: '8px 12px 8px 14px',
                transition: 'border-color 0.25s, box-shadow 0.25s', boxShadow: '0 2px 8px rgba(10,17,40,0.03)',
              }}
              onFocusCapture={(e) => { 
                const container = e.currentTarget as HTMLDivElement;
                container.style.borderColor = theme.primary;
                container.style.boxShadow = `0 4px 14px ${theme.shadow}`;
              }}
              onBlurCapture={(e) => { 
                const container = e.currentTarget as HTMLDivElement;
                container.style.borderColor = 'rgba(10,17,40,0.08)';
                container.style.boxShadow = '0 2px 8px rgba(10,17,40,0.03)';
              }}
            >
              <textarea
                id="saptta-chat-textarea"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isAuthenticated ? ctx.placeholder : 'Sign in to chat…'}
                rows={1}
                disabled={isLoading || !isAuthenticated}
                aria-label="Chat message input"
                style={{
                  flex: 1, resize: 'none', border: 'none', outline: 'none',
                  background: 'transparent', fontSize: 13.5, color: '#0A1128',
                  lineHeight: 1.55, maxHeight: 100, overflowY: 'auto',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  caretColor: theme.primary,
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
                }}
              />
              <button
                id="saptta-chat-send"
                aria-label="Send message"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: 'none',
                  cursor: !input.trim() || isLoading ? 'default' : 'pointer',
                  background: !input.trim() || isLoading
                    ? 'rgba(10,17,40,0.06)'
                    : theme.gradient,
                  color: !input.trim() || isLoading ? 'rgba(10,17,40,0.25)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: !input.trim() || isLoading ? 'none' : `0 4px 12px ${theme.shadow}`,
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !isLoading) {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.transform = 'scale(1.08)';
                    btn.style.filter = 'brightness(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.transform = 'scale(1)';
                  btn.style.filter = 'none';
                }}
              >
                ➤
              </button>
            </div>
            <div style={{ marginTop: 7, fontSize: 11, color: 'rgba(10,17,40,0.35)', textAlign: 'center', fontWeight: 500 }}>
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}
    </>
  );
}
