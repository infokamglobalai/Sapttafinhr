/**
 * SAPTTA landing page API service.
 * Uses the same backend as the HRMS web app (kam-workspace-main).
 * Set VITE_API_URL in .env.local to point at the backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_PLATFORM_API_BASE_URL || '/api/v1';

// ── Health check ──────────────────────────────────────────────────────
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    return data?.status === 'UP';
  } catch {
    return false;
  }
}

// ── Payroll preview — pure calculation, no network needed ─────────────
export interface PayrollPreview {
  employeeCount: number;
  grossPayroll: number;
  pfContribution: number;
  esiContribution: number;
  tdsWithholding: number;
  netPayroll: number;
}

/**
 * Estimates statutory payroll for `count` employees at a given average salary.
 * Uses the same formulas as the backend payrollEngine.js:
 *   PF  = 12% of Basic (≈40% of salary), capped per-employee at ₹15,000 basic
 *   ESI = 3.25% of Gross (only when salary ≤ ₹21,000)
 *   TDS = ~6% flat approximation for demo slider
 */
export function estimatePayroll(count: number, avgSalary = 32000): PayrollPreview {
  const basic = avgSalary * 0.40;                         // 40% of CTC is Basic
  const pfBase = Math.min(basic, 15000);                  // PF capped at ₹15,000 basic
  const pfPerEmployee = Math.round(pfBase * 0.12);
  const esiPerEmployee = avgSalary <= 21000 ? Math.round(avgSalary * 0.0325) : 0;
  const tdsPerEmployee = Math.round(avgSalary * 0.06);    // approx TDS for demo

  return {
    employeeCount:  count,
    grossPayroll:   avgSalary * count,
    pfContribution: pfPerEmployee * count,
    esiContribution: esiPerEmployee * count,
    tdsWithholding: tdsPerEmployee * count,
    netPayroll:     (avgSalary - pfPerEmployee - esiPerEmployee - tdsPerEmployee) * count,
  };
}

// ── GST summary (requires auth token) ────────────────────────────────
export interface GSTSummary {
  financialYear: string;
  totalGSTCollected: number;
  totalITCAvailable: number;
  netLiability: number;
  invoiceCount: number;
  billCount: number;
}

export async function fetchGSTSummary(token: string): Promise<GSTSummary> {
  const res = await fetch(`${BASE_URL}/gst/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch GST summary');
  return res.json() as Promise<GSTSummary>;
}
