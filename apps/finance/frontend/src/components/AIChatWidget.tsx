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
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-brand-500/20 bg-gradient-to-r from-brand-600 to-brand-500 text-white ring-4 ring-brand-500/10 cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-350"
        title="Finance Assistant"
      >
        {open ? <X size={20} color="white" /> : <Bot size={22} color="white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex w-96 h-[500px] flex-col overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md border border-ink-200 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 flex items-center justify-between px-5 py-4 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-xl p-1.5"><Bot size={18} /></div>
              <div>
                <div className="text-sm font-bold tracking-wide font-display">Finance Assistant</div>
                <div className="text-[10px] opacity-75 font-medium">Real-time Accounting AI</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={msgsRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-50/20">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-none font-medium'
                      : 'bg-white text-ink-800 border border-ink-150 rounded-tl-none font-medium'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-ink-150 px-4 py-2.5 text-xs text-slate-400 flex items-center gap-2 rounded-tl-none font-medium shadow-sm">
                  <Loader size={12} className="animate-spin text-brand-500" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-ink-150 p-4 bg-white">
            <input
              className="flex-1 rounded-xl border border-ink-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all font-medium placeholder-ink-400"
              placeholder="Ask anything about your ledger…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-transform active:scale-95 duration-200 cursor-pointer shadow-sm shadow-brand-500/10"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
