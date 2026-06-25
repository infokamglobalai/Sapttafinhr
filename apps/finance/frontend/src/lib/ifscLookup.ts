/** Indian IFSC validation and lookup (via finance backend → Razorpay directory). */

import { api } from '@/lib/api';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^[0-9]{9,18}$/;

export type IfscDetails = {
  ifsc: string;
  bank: string;
  branch: string;
  address: string;
  city: string;
  district: string;
  state: string;
  centre: string;
  micr: string;
  branch_text: string;
  upi: boolean;
};

export function sanitizeIfscInput(value: string): string {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 11);
}

export function sanitizeAccountNumber(value: string): string {
  return (value || '').replace(/\D/g, '').slice(0, 18);
}

export function validateIfscFormat(value: string, required = false): string | null {
  const raw = (value || '').trim();
  if (!raw) return required ? 'IFSC is required.' : null;
  const code = sanitizeIfscInput(raw);
  if (code.length !== 11) return 'IFSC must be exactly 11 characters.';
  if (!IFSC_RE.test(code)) {
    return 'Invalid IFSC format. Use 4 letters + 0 + 6 characters (e.g. HDFC0001234).';
  }
  return null;
}

export function validateAccountNumber(value: string, required = true): string | null {
  const raw = (value || '').trim();
  if (!raw) return required ? 'Account number is required.' : null;
  const digits = sanitizeAccountNumber(raw);
  if (!ACCOUNT_RE.test(digits)) {
    return 'Account number must be 9–18 digits.';
  }
  return null;
}

export function suggestBankLabel(details: IfscDetails, kind = 'Current'): string {
  const place = details.city || details.branch || details.centre;
  if (place) return `${details.bank} ${kind} — ${place}`;
  return `${details.bank} ${kind}`;
}

export async function lookupIfsc(code: string): Promise<IfscDetails> {
  const ifsc = sanitizeIfscInput(code);
  const formatErr = validateIfscFormat(ifsc, true);
  if (formatErr) throw new Error(formatErr);

  const { data } = await api.get<IfscDetails>(`/banking/ifsc/${ifsc}/`);
  return data;
}

export function formatIfscLocation(details: IfscDetails): string {
  const parts = [details.branch, details.city, details.district, details.state].filter(Boolean);
  return parts.join(', ');
}
