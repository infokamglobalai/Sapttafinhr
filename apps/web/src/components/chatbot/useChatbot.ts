import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from './chatbotApi';
import { sendChatMessage } from './chatbotApi';
import type { ChatbotContext } from './useChatbotContext';

const MAX_HISTORY = 10;

export interface UseChatbotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
}

export function useChatbot(context: ChatbotContext = 'general', guestMode = false): UseChatbotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const history = messagesRef.current.slice(-MAX_HISTORY);
      const result = await sendChatMessage({ message: trimmed, history }, context, { guest: guestMode });

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.reply || 'Sorry, I could not get a response.' },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, context, guestMode]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearHistory };
}
