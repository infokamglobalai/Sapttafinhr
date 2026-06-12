import { useMemo } from 'react';
import { getWorkspace } from '../../lib/api';

export type ChatbotContext = 'finance' | 'hr' | 'general';

interface ChatbotContextInfo {
  context: ChatbotContext;
  label: string;
  /** Short tag shown in the widget header badge */
  badge: string;
  placeholder: string;
}

const CONTEXT_MAP: Record<ChatbotContext, ChatbotContextInfo> = {
  finance: {
    context: 'finance',
    label: 'Finance Assistant',
    badge: 'Finance',
    placeholder: 'Ask about invoices, GST, P&L… (Enter to send)',
  },
  hr: {
    context: 'hr',
    label: 'HR Assistant',
    badge: 'HR',
    placeholder: 'Ask about employees, attendance, leave… (Enter to send)',
  },
  general: {
    context: 'general',
    label: 'Sahayak',
    badge: 'General',
    placeholder: 'Ask about Saptta features… (Enter to send)',
  },
};

function detectContext(): ChatbotContext {
  const { hostname, pathname } = window.location;

  // HR mode: explicit hr subdomain or /app/hrms path prefix
  if (hostname.startsWith('hr.') || pathname.startsWith('/app/hrms')) {
    return 'hr';
  }

  // Finance mode: a workspace subdomain is active (e.g., acme.localhost or acme.saptta.com)
  // The workspace is stored in localStorage after login.
  const workspace = getWorkspace();
  if (workspace && hostname.startsWith(`${workspace}.`)) {
    return 'finance';
  }

  // Also treat /app/finance paths as finance context
  if (pathname.startsWith('/app/finance')) {
    return 'finance';
  }

  return 'general';
}

export function useChatbotContext(): ChatbotContextInfo {
  // Re-derive on every render but memo so it's stable within a render cycle
  return useMemo(() => CONTEXT_MAP[detectContext()], []);
}
