export interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  products: ('hrms' | 'finance')[];
  tier: 'starter' | 'pro' | 'complete';
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  tenantId: string;
  products: ('hrms' | 'finance')[];
  setupComplete: boolean;
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
    id: 'hrms-starter',
    name: 'HRMS Starter',
    description: 'Essential HR management for small teams',
    monthlyPrice: 3499,
    annualPrice: 34990,
    products: ['hrms'],
    tier: 'starter',
    features: [
      'Up to 50 employees',
      'Employee master database',
      'Attendance & time tracking',
      'Leave management',
      'Basic payroll processing',
      'Payslip generation',
      'Holiday calendar',
      'Email support',
    ],
  },
  {
    id: 'hrms-pro',
    name: 'HRMS Pro',
    description: 'Advanced HR with recruitment & performance',
    monthlyPrice: 8999,
    annualPrice: 89990,
    products: ['hrms'],
    tier: 'pro',
    features: [
      'Unlimited employees',
      'Everything in HRMS Starter',
      'Geofenced attendance',
      'Biometric integration',
      'Shift & overtime management',
      'Recruitment & ATS',
      'Performance management',
      'Mobile HRMS app',
      'AI attendance analytics',
      'Priority support',
    ],
  },
  {
    id: 'finance-starter',
    name: 'Finance Starter',
    description: 'Core accounting & GST compliance',
    monthlyPrice: 3999,
    annualPrice: 39990,
    products: ['finance'],
    tier: 'starter',
    features: [
      'General ledger & journal entries',
      'GST invoicing (CGST/SGST/IGST)',
      'Quotations & sales orders',
      'Customer receipts & payments',
      'Bank reconciliation',
      'Trial balance & P&L',
      'GSTR-1 & GSTR-3B export',
      'Email support',
    ],
  },
  {
    id: 'finance-pro',
    name: 'Finance Pro',
    description: 'Full accounting with inventory & assets',
    monthlyPrice: 9999,
    annualPrice: 99990,
    products: ['finance'],
    tier: 'pro',
    features: [
      'Everything in Finance Starter',
      'Purchase orders & vendor bills',
      '3-way match (PO-GRN-Bill)',
      'Inventory & warehouse management',
      'Fixed assets & depreciation',
      'Expense claims & budgets',
      'e-Invoice IRN & e-Way Bill',
      'TDS/TCS management',
      'Public API & webhooks',
      'Priority support',
    ],
  },
  {
    id: 'saptta-complete',
    name: 'Saptta Complete',
    description: 'Unified HRMS + Finance for your entire business',
    monthlyPrice: 15999,
    annualPrice: 159990,
    products: ['hrms', 'finance'],
    tier: 'complete',
    highlighted: true,
    badge: 'Best Value',
    features: [
      'Unlimited employees',
      'Full HRMS Pro features',
      'Full Finance Pro features',
      'Payroll → Ledger auto-posting',
      'Employee expense → Finance flow',
      'Unified dashboard & reports',
      'Customer/vendor portal',
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
