import { AUTH_LOGIN, AUTH_MFA } from '../config';

export type LoginResult =
  | { kind: 'token'; api_token: string; workspace: string; email: string }
  | {
      kind: 'mfa';
      challenge_token: string;
      email: string;
      mfa_setup_required?: boolean;
    };

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...body, client: 'mobile' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Login failed (${res.status})`);
  }
  return data as T;
}

export async function login(
  workspace: string,
  email: string,
  password: string,
): Promise<LoginResult> {
  const data = await postJson<Record<string, unknown>>(AUTH_LOGIN, {
    workspace: workspace.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    password,
  });

  if (data.mfa_required && data.challenge_token) {
    return {
      kind: 'mfa',
      challenge_token: String(data.challenge_token),
      email: String(data.email || email),
      mfa_setup_required: Boolean(data.mfa_setup_required),
    };
  }
  if (data.api_token) {
    return {
      kind: 'token',
      api_token: String(data.api_token),
      workspace: String(data.workspace || workspace),
      email: String(data.email || email),
    };
  }
  throw new Error('Unexpected login response.');
}

export async function verifyMfa(challenge_token: string, code: string): Promise<LoginResult> {
  const data = await postJson<Record<string, unknown>>(AUTH_MFA, {
    challenge_token,
    code: code.trim(),
    action: 'verify',
  });
  if (data.api_token) {
    return {
      kind: 'token',
      api_token: String(data.api_token),
      workspace: String(data.workspace),
      email: String(data.email),
    };
  }
  throw new Error('MFA verification failed.');
}
