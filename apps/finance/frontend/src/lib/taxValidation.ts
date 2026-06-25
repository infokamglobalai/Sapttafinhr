/** Indian GSTIN / PAN validation (mirrors finance backend + HR setup rules). */

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const VALID_GST_STATE_CODES = new Set(
  Array.from({ length: 37 }, (_, i) => String(i + 1).padStart(2, '0')),
);

export function normalizeTaxId(value: string): string {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}

/** Strip to characters allowed while typing a GSTIN. */
export function sanitizeGstinInput(value: string): string {
  return normalizeTaxId(value).replace(/[^0-9A-Z]/g, '').slice(0, 15);
}

export function sanitizePanInput(value: string): string {
  return normalizeTaxId(value).replace(/[^0-9A-Z]/g, '').slice(0, 10);
}

export function validateGstin(value: string, required = false): string | null {
  const raw = (value || '').trim();
  if (!raw) return required ? 'GSTIN is required.' : null;
  const gstin = normalizeTaxId(raw);
  if (gstin.length !== 15) return 'GSTIN must be exactly 15 characters.';
  if (!GSTIN_RE.test(gstin)) {
    return (
      'Invalid GSTIN format. Use 2-digit state code + 10-char PAN + ' +
      'entity number + Z + checksum (e.g. 27AAACS1234D1Z5).'
    );
  }
  if (!VALID_GST_STATE_CODES.has(gstin.slice(0, 2))) {
    return `Invalid GST state code “${gstin.slice(0, 2)}”. Use a valid Indian state code (01–37).`;
  }
  return null;
}

export function validatePan(value: string): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  const pan = normalizeTaxId(raw);
  if (pan.length !== 10) return 'PAN must be exactly 10 characters.';
  if (!PAN_RE.test(pan)) return 'Invalid PAN format. Use 5 letters + 4 digits + 1 letter (e.g. AAACS1234D).';
  return null;
}

export function gstinPanConsistency(gstin: string, pan: string): string | null {
  const g = normalizeTaxId(gstin);
  const p = normalizeTaxId(pan);
  if (!g || !p) return null;
  const embedded = g.slice(2, 12);
  if (embedded !== p) {
    return `GSTIN PAN segment (${embedded}) must match the company PAN (${p}).`;
  }
  return null;
}

export function gstinStateConsistency(gstin: string, stateCode: string): string | null {
  const g = normalizeTaxId(gstin);
  const sc = (stateCode || '').trim().padStart(2, '0').slice(-2);
  if (!g || !stateCode) return null;
  if (g.slice(0, 2) !== sc) {
    return `GSTIN state code (${g.slice(0, 2)}) must match home state code (${sc}).`;
  }
  return null;
}

export const GSTIN_PLACEHOLDER = '27AAACS1234D1Z5';
export const GSTIN_HINT =
  '15 characters — state code + PAN + entity + Z + checksum (e.g. 27AAACS1234D1Z5)';
