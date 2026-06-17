/**
 * Saptta context-aware chat API.
 *
 * Routes to the correct backend based on context and auth:
 *   finance  → POST /api/v1/ai/finance-chat/     (tenant, JWT)
 *   hr       → POST /api/ai/hr-chat/              (HR session)
 *   general  → POST /api/v1/auth/general-chat/    (signed-in)
 *   guest    → POST /api/v1/auth/guest-chat/      (marketing visitors)
 */
import { request } from '../../lib/api';
import { resolvePlatformApiBaseUrl } from '../../lib/platform';
import type { ChatbotContext } from './useChatbotContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  company_id?: number;
}

export interface ChatResponse {
  reply: string;
  actions_taken?: { tool: string; result: string }[];
  scoped?: boolean;
}

const HR_BASE: string =
  (import.meta as ImportMeta & { env?: { VITE_HR_API_BASE_URL?: string } }).env?.VITE_HR_API_BASE_URL
  || 'http://localhost:8001';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function sendToHr(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${HR_BASE}/api/ai/hr-chat/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return {
        reply:
          'You need to be logged into Saptta HR to use the HR Assistant. Please open the HR app and log in.',
        actions_taken: [],
      };
    }
    throw new Error(`HR chat request failed (${res.status})`);
  }
  return res.json();
}

async function sendGuestChat(req: ChatRequest): Promise<ChatResponse> {
  const base = resolvePlatformApiBaseUrl();
  const res = await fetch(`${base}/auth/guest-chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(req),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) {
      return {
        reply:
          'You\'ve reached the chat limit for now. Please call **+91 99000 07072**, email **info@saptta.com**, or visit **/contact**.',
        actions_taken: [],
        scoped: true,
      };
    }
    throw new Error((data as { detail?: string }).detail || `Chat failed (${res.status})`);
  }
  return data as ChatResponse;
}

export async function sendChatMessage(
  req: ChatRequest,
  context: ChatbotContext = 'general',
  options?: { guest?: boolean },
): Promise<ChatResponse> {
  if (context === 'hr') {
    return sendToHr(req);
  }
  if (context === 'finance') {
    return request<ChatResponse>('/ai/finance-chat/', {
      surface: 'tenant',
      method: 'POST',
      body: req,
    });
  }
  if (options?.guest) {
    return sendGuestChat(req);
  }
  return request<ChatResponse>('/auth/general-chat/', {
    surface: 'platform',
    method: 'POST',
    body: req,
  });
}
