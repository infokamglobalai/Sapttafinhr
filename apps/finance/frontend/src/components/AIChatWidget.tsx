import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuthStore } from '@/store/auth';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function AIChatWidget() {
  const { companyId } = useActiveCompany();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your Finance Assistant. Ask me about cash position, overdue invoices, GST, P&L, or anything accounting-related. 📊' }
  ]);
  const [loading, setLoading] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/ai/finance-chat/', { message: msg, company_id: companyId, history });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply || 'No response.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#10B981,#059669)', width: 52, height: 52 }}
        title="Finance Assistant"
      >
        {open ? <X size={20} color="white" /> : <Bot size={22} color="white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
             style={{ height: 480, border: '1px solid #e5e7eb' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
               className="flex items-center gap-3 px-4 py-3 text-white">
            <Bot size={18} />
            <div>
              <div className="text-sm font-bold">Finance Assistant</div>
              <div className="text-xs opacity-70">Powered by Claude</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={msgsRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 text-slate-800 border border-slate-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-400 flex items-center gap-2 border border-slate-100">
                  <Loader size={12} className="animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-slate-100 p-3">
            <input
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              placeholder="Ask anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
