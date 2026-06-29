/**
 * Saptta pricing — simple base price per company, ex-GST.
 *   • HRMS     — ₹4,999 / month, includes up to 30 employees · +₹111 per extra employee
 *   • Finance  — ₹4,999 / month, unlimited users
 *   • Complete — ₹7,999 / month (both products), includes up to 30 employees
 *                · +₹111 per extra employee · save ₹1,999/mo vs buying separately
 * 18% GST is charged on top at checkout.
 */
export interface Plan {
  id: string;
  name: string;
  description: string;
  products: ('hrms' | 'finance')[];
  /** Base monthly price, exclusive of GST. */
  monthlyPrice: number;
  /** Annual billing total (12 × base less the annual discount), exclusive of GST. */
  annualPrice: number;
  /** Employees covered by the base price; extra employees cost EXTRA_EMPLOYEE_PRICE each.
   *  Omitted for Finance (no per-employee component). */
  includedEmployees?: number;
  tier: 'hrms' | 'finance' | 'complete';
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

// ── Pricing constants ───────────────────────────────────────────────────────
export const HRMS_PRICE = 4999;
export const FINANCE_PRICE = 4999;
export const COMPLETE_PRICE = 7999;

/** Employees included in the HRMS / Complete base price. */
export const INCLUDED_EMPLOYEES = 30;
/** Price per employee beyond the included headcount (ex-GST). */
export const EXTRA_EMPLOYEE_PRICE = 111;

/** GST charged on top of every plan price. */
export const GST_RATE = 0.18;

/** Add GST to an ex-GST amount (rounded to the rupee). */
export function withGst(amount: number): number {
  return Math.round(amount * (1 + GST_RATE));
}

/**
 * Monthly price (ex-GST) for a plan at a given headcount.
 * Base covers `includedEmployees`; each employee beyond that adds ₹111.
 */
export function planMonthly(plan: Plan, employees: number = INCLUDED_EMPLOYEES): number {
  let price = plan.monthlyPrice;
  if (plan.includedEmployees != null) {
    const extra = Math.max(0, Math.round(employees) - plan.includedEmployees);
    price += extra * EXTRA_EMPLOYEE_PRICE;
  }
  return price;
}

/** Extra employees beyond the included headcount (0 if within base). */
export function extraEmployees(plan: Plan, employees: number): number {
  if (plan.includedEmployees == null) return 0;
  return Math.max(0, Math.round(employees) - plan.includedEmployees);
}

/** Discount applied when billing annually instead of monthly. */
export const ANNUAL_DISCOUNT_RATE = 0.2;
/** Annual discount as a percentage, for marketing copy ("Save 20%"). */
export const ANNUAL_DISCOUNT_PCT = Math.round(ANNUAL_DISCOUNT_RATE * 100); // 20

/** Annual (ex-GST) total for a monthly rate, with the annual discount applied. */
export function annualFromMonthly(monthly: number): number {
  return Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT_RATE));
}

/** Annual (ex-GST) price for a plan at a given headcount, with the annual discount applied. */
export function planAnnual(plan: Plan, employees: number = INCLUDED_EMPLOYEES): number {
  return annualFromMonthly(planMonthly(plan, employees));
}

/** List price of buying HRMS + Finance separately at base headcount (ex-GST). */
export const SEPARATE_MONTHLY = HRMS_PRICE + FINANCE_PRICE; // ₹9,998
/** Monthly saving on Complete vs buying both separately, at base headcount (ex-GST). */
export const COMPLETE_SAVINGS = SEPARATE_MONTHLY - COMPLETE_PRICE; // ₹1,999
/** Saving as a percentage, for marketing copy. */
export const COMPLETE_SAVINGS_PCT = Math.round((COMPLETE_SAVINGS / SEPARATE_MONTHLY) * 100); // 20%

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  /** Platform super-admin (Django is_staff) → routed to /superadmin. */
  isSuperAdmin: boolean;
  tenantId: string;
  products: ('hrms' | 'finance')[];
  setupComplete: boolean;
  /** Platform email verified (required before app access). */
  emailVerified: boolean;
}

export interface CompanyProfile {
  name: string;
  legalName: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  industry: string;
  logo?: string;
}

export interface HrmsSetup {
  departments: string[];
  designations: string[];
  shifts: { name: string; startTime: string; endTime: string }[];
  leaveTypes: { name: string; daysPerYear: number }[];
  payrollComponents: { name: string; type: 'earning' | 'deduction'; percentage?: number }[];
  pfEnabled: boolean;
  esiEnabled: boolean;
  ptEnabled: boolean;
}

export interface FinanceSetup {
  fiscalYearStart: string;
  chartOfAccountsTemplate: 'indian_standard' | 'trading' | 'manufacturing' | 'services';
  branches: { name: string; code: string; address: string }[];
  bankAccounts: { bankName: string; accountNumber: string; ifsc: string; type: 'current' | 'savings' }[];
  gstRegistered: boolean;
  gstState: string;
  tdsEnabled: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'hrms',
    name: 'Saptta HRMS',
    description: 'Complete HR, attendance & payroll — flat for up to 30 employees.',
    products: ['hrms'],
    monthlyPrice: HRMS_PRICE,
    annualPrice: annualFromMonthly(HRMS_PRICE),
    includedEmployees: INCLUDED_EMPLOYEES,
    tier: 'hrms',
    features: [
      'Up to 30 employees included',
      'Attendance & time tracking',
      'Leave management',
      'Full payroll — PF, ESI, TDS & PT',
      'Payslips & Form 16',
      'Recruitment & ATS',
      'Performance management',
      'Mobile ESS app',
      'Email & chat support',
    ],
  },
  {
    id: 'finance',
    name: 'Saptta Finance',
    description: 'GST-ready accounting for your whole company — flat price, unlimited users.',
    products: ['finance'],
    monthlyPrice: FINANCE_PRICE,
    annualPrice: annualFromMonthly(FINANCE_PRICE),
    tier: 'finance',
    features: [
      'Unlimited finance users',
      'GST invoicing (CGST/SGST/IGST)',
      'General ledger & journals',
      'Bank reconciliation',
      'Purchase, vendor bills & 3-way match',
      'Inventory & fixed assets',
      'GSTR-1 / GSTR-3B & e-Invoice',
      'TDS/TCS management',
      'Email & chat support',
    ],
  },
  {
    id: 'saptta-complete',
    name: 'Saptta Complete',
    description: 'HRMS + Finance together — save ₹1,999 every month vs buying separately.',
    products: ['hrms', 'finance'],
    monthlyPrice: COMPLETE_PRICE,
    annualPrice: annualFromMonthly(COMPLETE_PRICE),
    includedEmployees: INCLUDED_EMPLOYEES,
    tier: 'complete',
    highlighted: true,
    badge: 'Best Value',
    features: [
      'Everything in HRMS & Finance',
      'Up to 30 employees included',
      'Export payroll to Tally XML · payroll→ledger auto-sync on Saptta Complete',
      'Employee expense → finance flow',
      'Unified dashboard & reports',
      'Customer / vendor portal',
      'AI audit assistant',
      'WhatsApp & SMS notifications',
      'Dedicated account manager',
    ],
  },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

export const INDUSTRIES = [
  'Manufacturing', 'Trading & Distribution', 'IT & Software', 'Retail',
  'Healthcare', 'Education', 'Construction', 'Real Estate', 'Hospitality',
  'Logistics & Transport', 'Agriculture', 'Textiles', 'FMCG',
  'Professional Services', 'Non-Profit', 'Other',
];
