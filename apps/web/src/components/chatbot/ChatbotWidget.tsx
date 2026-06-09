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

/* ─── Typing dots animation ──────────────────────────────────────────────── */
function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'rgba(255,109,0,0.7)',
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
function MessageBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
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
            background: 'linear-gradient(135deg, #FF6D00, #1E2A78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            flexShrink: 0,
            marginRight: 8,
            marginTop: 2,
            boxShadow: '0 2px 8px rgba(255,109,0,0.25)',
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
            ? 'linear-gradient(135deg, #FF6D00 0%, #FF9800 100%)'
            : 'rgba(255,255,255,0.92)',
          color: isUser ? '#fff' : '#0A1128',
          fontSize: 13.5,
          lineHeight: 1.6,
          boxShadow: isUser
            ? '0 4px 14px rgba(255,109,0,0.30)'
            : '0 2px 10px rgba(10,17,40,0.08)',
          border: isUser ? 'none' : '1px solid rgba(10,17,40,0.07)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          backdropFilter: isUser ? 'none' : 'blur(6px)',
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

  if (!isAuthenticated) return null;

  function handleSend() {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const greeting = user?.firstName ? `Hi ${user.firstName}! ` : 'Hi! ';
  const badgeColors = BADGE_COLORS[ctx.context];
  const starters = STARTERS[ctx.context];

  return (
    <>
      {/* ── Keyframes ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes saptta-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes saptta-msg-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes saptta-fab-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,109,0,0.5), 0 8px 24px rgba(255,109,0,0.35); }
          70%       { box-shadow: 0 0 0 14px rgba(255,109,0,0), 0 8px 24px rgba(255,109,0,0.35); }
        }
        @keyframes saptta-panel-in {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        #saptta-chat-textarea::-webkit-scrollbar { width: 4px; }
        #saptta-chat-textarea::-webkit-scrollbar-track { background: transparent; }
        #saptta-chat-textarea::-webkit-scrollbar-thumb { background: rgba(10,17,40,0.15); border-radius: 4px; }
        #saptta-msgs::-webkit-scrollbar { width: 4px; }
        #saptta-msgs::-webkit-scrollbar-track { background: transparent; }
        #saptta-msgs::-webkit-scrollbar-thumb { background: rgba(10,17,40,0.12); border-radius: 4px; }
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
            : 'linear-gradient(135deg, #FF6D00 0%, #FF9800 100%)',
          color: '#fff', fontSize: open ? 22 : 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s ease, transform 0.2s ease',
          animation: !open && pulse ? 'saptta-fab-pulse 2.2s ease-in-out infinite' : 'none',
          boxShadow: '0 8px 24px rgba(255,109,0,0.35)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
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
            boxShadow: '0 24px 64px rgba(10,17,40,0.20), 0 0 0 1px rgba(255,109,0,0.15)',
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
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #FF6D00, #FF9800)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, boxShadow: '0 4px 12px rgba(255,109,0,0.40)', flexShrink: 0,
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
                  }}
                >
                  {ctx.badge}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
                {ctx.label} · Powered by Claude
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
            {messages.length === 0 && (
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
                        background: 'rgba(255,109,0,0.07)', border: '1px solid rgba(255,109,0,0.20)',
                        borderRadius: 999, padding: '5px 12px', fontSize: 12,
                        color: '#1E2A78', cursor: 'pointer', fontWeight: 500,
                        transition: 'background 0.2s, border-color 0.2s', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.background = 'rgba(255,109,0,0.14)';
                        b.style.borderColor = 'rgba(255,109,0,0.40)';
                      }}
                      onMouseLeave={(e) => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.background = 'rgba(255,109,0,0.07)';
                        b.style.borderColor = 'rgba(255,109,0,0.20)';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF6D00, #1E2A78)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, flexShrink: 0, boxShadow: '0 2px 8px rgba(255,109,0,0.25)',
                  }}
                >
                  ✨
                </div>
                <div
                  style={{
                    padding: '10px 16px', borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(10,17,40,0.07)',
                    boxShadow: '0 2px 10px rgba(10,17,40,0.08)', backdropFilter: 'blur(6px)',
                  }}
                >
                  <TypingDots />
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
                background: 'rgba(250,250,252,0.9)', border: '1.5px solid rgba(10,17,40,0.10)',
                borderRadius: 14, padding: '8px 12px 8px 14px',
                transition: 'border-color 0.2s', boxShadow: '0 2px 8px rgba(10,17,40,0.04)',
              }}
              onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,109,0,0.50)'; }}
              onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(10,17,40,0.10)'; }}
            >
              <textarea
                id="saptta-chat-textarea"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ctx.placeholder}
                rows={1}
                disabled={isLoading}
                aria-label="Chat message input"
                style={{
                  flex: 1, resize: 'none', border: 'none', outline: 'none',
                  background: 'transparent', fontSize: 13.5, color: '#0A1128',
                  lineHeight: 1.55, maxHeight: 100, overflowY: 'auto',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  caretColor: '#FF6D00',
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
                    ? 'rgba(10,17,40,0.08)'
                    : 'linear-gradient(135deg, #FF6D00 0%, #FF9800 100%)',
                  color: !input.trim() || isLoading ? 'rgba(10,17,40,0.30)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0, transition: 'background 0.2s, color 0.2s, transform 0.15s',
                  boxShadow: !input.trim() || isLoading ? 'none' : '0 4px 12px rgba(255,109,0,0.30)',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !isLoading)
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                ➤
              </button>
            </div>
            <div style={{ marginTop: 7, fontSize: 11, color: 'rgba(10,17,40,0.35)', textAlign: 'center' }}>
              Shift+Enter for new line · Powered by Claude
            </div>
          </div>
        </div>
      )}
    </>
  );
}
