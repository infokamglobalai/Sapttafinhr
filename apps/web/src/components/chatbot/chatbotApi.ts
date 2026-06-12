/**
 * Saptta context-aware chat API.
 *
 * Routes to the correct backend based on the detected context:
 *   finance  → POST /api/v1/ai/finance-chat/    (FIN tenant, JWT auth)
 *   hr       → POST /api/ai/hr-chat/             (HR backend, session auth)
 *   general  → POST /api/v1/auth/general-chat/   (FIN platform, JWT auth)
 */
import { request } from '../../lib/api';
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
}

const HR_BASE: string =
  (import.meta as any).env?.VITE_HR_API_BASE_URL || 'http://localhost:8001';

/** Read Django CSRF token from the csrftoken cookie (set by the HR backend). */
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

export async function sendChatMessage(
  req: ChatRequest,
  context: ChatbotContext = 'general',
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
  // general
  return request<ChatResponse>('/auth/general-chat/', {
    surface: 'platform',
    method: 'POST',
    body: req,
  });
}
