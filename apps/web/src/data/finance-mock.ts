export interface Party {
  id: string;
  name: string;
  gstin: string;
  type: 'customer' | 'vendor';
  balance: number;
  city: string;
  state: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  partyId: string;
  partyName: string;
  partyGstin: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

export interface InvoiceItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  amount: number;
  gstRate: number;
}

export interface Receipt {
  id: string;
  number: string;
  date: string;
  partyId: string;
  partyName: string;
  amount: number;
  mode: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
  reference: string;
  invoicesAllocated: string[];
  status: 'received' | 'deposited' | 'bounced';
}

export interface PurchaseOrder {
  id: string;
  number: string;
  date: string;
  vendorId: string;
  vendorName: string;
  status: 'draft' | 'sent' | 'acknowledged' | 'received' | 'billed' | 'cancelled';
  items: { description: string; hsn: string; qty: number; rate: number; amount: number }[];
  total: number;
}

export interface VendorBill {
  id: string;
  number: string;
  vendorBillNo: string;
  date: string;
  dueDate: string;
  vendorId: string;
  vendorName: string;
  status: 'draft' | 'approved' | 'paid' | 'overdue';
  subtotal: number;
  gst: number;
  tds: number;
  total: number;
  poRef: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  type: 'current' | 'savings';
  balance: number;
  lastReconciled: string;
  unreconciled: number;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reconciled: boolean;
  reference: string;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  narration: string;
  status: 'draft' | 'posted';
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  source: 'manual' | 'invoice' | 'receipt' | 'payroll' | 'depreciation';
}

export interface JournalLine {
  account: string;
  accountCode: string;
  debit: number;
  credit: number;
  narration?: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  group: string;
  debit: number;
  credit: number;
}

export interface ReportPnLRow {
  category: string;
  items: { name: string; amount: number }[];
  total: number;
}

// ── Helpers ──

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// ── Mock Data ──

export const MOCK_PARTIES: Party[] = [
  { id: 'p1', name: 'TechCorp India Pvt Ltd', gstin: '27AADCB2230M1Z2', type: 'customer', balance: 188500, city: 'Mumbai', state: 'Maharashtra' },
  { id: 'p2', name: 'GreenLeaf Exports', gstin: '29AALFG4567N1Z5', type: 'customer', balance: 94200, city: 'Bengaluru', state: 'Karnataka' },
  { id: 'p3', name: 'Sunrise Manufacturing', gstin: '33BBRPS8901Q1Z8', type: 'customer', balance: 0, city: 'Chennai', state: 'Tamil Nadu' },
  { id: 'p4', name: 'QuickServe Logistics', gstin: '07CCDQL2345R1Z1', type: 'customer', balance: 42000, city: 'Delhi', state: 'Delhi' },
  { id: 'p5', name: 'CloudNine Supplies', gstin: '29DDEFG6789S1Z4', type: 'vendor', balance: -65000, city: 'Bengaluru', state: 'Karnataka' },
  { id: 'p6', name: 'Apex Office Solutions', gstin: '27EEFHA1234T1Z7', type: 'vendor', balance: -28400, city: 'Pune', state: 'Maharashtra' },
  { id: 'p7', name: 'Digital Print Hub', gstin: '29FFGIB5678U1Z0', type: 'vendor', balance: 0, city: 'Bengaluru', state: 'Karnataka' },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv1', number: 'INV-2026-001', date: '2026-04-05', dueDate: '2026-05-05',
    partyId: 'p1', partyName: 'TechCorp India Pvt Ltd', partyGstin: '27AADCB2230M1Z2',
    status: 'overdue',
    items: [
      { description: 'Enterprise ERP License (Annual)', hsn: '998314', qty: 1, rate: 150000, amount: 150000, gstRate: 18 },
      { description: 'Implementation Support', hsn: '998313', qty: 1, rate: 25000, amount: 25000, gstRate: 18 },
    ],
    subtotal: 175000, cgst: 0, sgst: 0, igst: 31500, totalTax: 31500, total: 206500,
    amountPaid: 18000, balanceDue: 188500,
  },
  {
    id: 'inv2', number: 'INV-2026-002', date: '2026-04-12', dueDate: '2026-05-12',
    partyId: 'p2', partyName: 'GreenLeaf Exports', partyGstin: '29AALFG4567N1Z5',
    status: 'sent',
    items: [
      { description: 'HRMS Pro License (6 months)', hsn: '998314', qty: 1, rate: 48000, amount: 48000, gstRate: 18 },
      { description: 'Biometric Device Setup', hsn: '998316', qty: 3, rate: 12000, amount: 36000, gstRate: 18 },
    ],
    subtotal: 84000, cgst: 7560, sgst: 7560, igst: 0, totalTax: 15120, total: 99120,
    amountPaid: 4920, balanceDue: 94200,
  },
  {
    id: 'inv3', number: 'INV-2026-003', date: '2026-04-20', dueDate: '2026-05-20',
    partyId: 'p3', partyName: 'Sunrise Manufacturing', partyGstin: '33BBRPS8901Q1Z8',
    status: 'paid',
    items: [
      { description: 'Finance Starter (1 Year)', hsn: '998314', qty: 1, rate: 42000, amount: 42000, gstRate: 18 },
    ],
    subtotal: 42000, cgst: 0, sgst: 0, igst: 7560, totalTax: 7560, total: 49560,
    amountPaid: 49560, balanceDue: 0,
  },
  {
    id: 'inv4', number: 'INV-2026-004', date: '2026-05-01', dueDate: '2026-05-31',
    partyId: 'p4', partyName: 'QuickServe Logistics', partyGstin: '07CCDQL2345R1Z1',
    status: 'sent',
    items: [
      { description: 'Saptta Complete (Monthly)', hsn: '998314', qty: 1, rate: 14999, amount: 14999, gstRate: 18 },
      { description: 'Custom Report Module', hsn: '998313', qty: 1, rate: 20000, amount: 20000, gstRate: 18 },
    ],
    subtotal: 34999, cgst: 0, sgst: 0, igst: 6300, totalTax: 6300, total: 41299,
    amountPaid: 0, balanceDue: 41299,
  },
  {
    id: 'inv5', number: 'INV-2026-005', date: '2026-05-15', dueDate: '2026-06-14',
    partyId: 'p1', partyName: 'TechCorp India Pvt Ltd', partyGstin: '27AADCB2230M1Z2',
    status: 'draft',
    items: [
      { description: 'API Integration Support', hsn: '998313', qty: 10, rate: 5000, amount: 50000, gstRate: 18 },
    ],
    subtotal: 50000, cgst: 0, sgst: 0, igst: 9000, totalTax: 9000, total: 59000,
    amountPaid: 0, balanceDue: 59000,
  },
];

export const MOCK_RECEIPTS: Receipt[] = [
  { id: 'r1', number: 'RCT-001', date: '2026-04-10', partyId: 'p1', partyName: 'TechCorp India Pvt Ltd', amount: 18000, mode: 'bank_transfer', reference: 'NEFT/UTR12345', invoicesAllocated: ['INV-2026-001'], status: 'deposited' },
  { id: 'r2', number: 'RCT-002', date: '2026-04-22', partyId: 'p3', partyName: 'Sunrise Manufacturing', amount: 49560, mode: 'upi', reference: 'UPI/TXN98765', invoicesAllocated: ['INV-2026-003'], status: 'deposited' },
  { id: 'r3', number: 'RCT-003', date: '2026-04-30', partyId: 'p2', partyName: 'GreenLeaf Exports', amount: 4920, mode: 'cheque', reference: 'CHQ#456789', invoicesAllocated: ['INV-2026-002'], status: 'deposited' },
  { id: 'r4', number: 'RCT-004', date: '2026-05-10', partyId: 'p4', partyName: 'QuickServe Logistics', amount: 15000, mode: 'cash', reference: 'CASH', invoicesAllocated: [], status: 'received' },
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po1', number: 'PO-2026-001', date: '2026-04-08', vendorId: 'p5', vendorName: 'CloudNine Supplies', status: 'billed',
    items: [{ description: 'Office Chairs (Ergonomic)', hsn: '940130', qty: 10, rate: 8500, amount: 85000 }],
    total: 100300,
  },
  {
    id: 'po2', number: 'PO-2026-002', date: '2026-05-02', vendorId: 'p6', vendorName: 'Apex Office Solutions', status: 'received',
    items: [{ description: 'Printer Cartridges', hsn: '844399', qty: 20, rate: 1200, amount: 24000 }, { description: 'A4 Paper Reams', hsn: '480256', qty: 50, rate: 350, amount: 17500 }],
    total: 48970,
  },
  {
    id: 'po3', number: 'PO-2026-003', date: '2026-05-20', vendorId: 'p7', vendorName: 'Digital Print Hub', status: 'sent',
    items: [{ description: 'Brochure Printing (1000 pcs)', hsn: '490199', qty: 1000, rate: 15, amount: 15000 }],
    total: 17700,
  },
];

export const MOCK_VENDOR_BILLS: VendorBill[] = [
  { id: 'vb1', number: 'VB-001', vendorBillNo: 'CS/2026/142', date: '2026-04-15', dueDate: '2026-05-15', vendorId: 'p5', vendorName: 'CloudNine Supplies', status: 'overdue', subtotal: 85000, gst: 15300, tds: 0, total: 100300, poRef: 'PO-2026-001' },
  { id: 'vb2', number: 'VB-002', vendorBillNo: 'AOS/INV/789', date: '2026-05-10', dueDate: '2026-06-09', vendorId: 'p6', vendorName: 'Apex Office Solutions', status: 'approved', subtotal: 41500, gst: 7470, tds: 415, total: 48555, poRef: 'PO-2026-002' },
  { id: 'vb3', number: 'VB-003', vendorBillNo: 'DPH/B/2026-055', date: '2026-05-22', dueDate: '2026-06-21', vendorId: 'p7', vendorName: 'Digital Print Hub', status: 'draft', subtotal: 15000, gst: 2700, tds: 150, total: 17550, poRef: 'PO-2026-003' },
];

export const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'ba1', bankName: 'HDFC Bank', accountNumber: '****4521', ifsc: 'HDFC0001234', type: 'current', balance: 842500, lastReconciled: '2026-05-20', unreconciled: 3 },
  { id: 'ba2', bankName: 'ICICI Bank', accountNumber: '****7823', ifsc: 'ICIC0005678', type: 'current', balance: 315200, lastReconciled: '2026-05-18', unreconciled: 5 },
  { id: 'ba3', bankName: 'SBI', accountNumber: '****3456', ifsc: 'SBIN0009012', type: 'savings', balance: 125000, lastReconciled: '2026-04-30', unreconciled: 8 },
];

export const MOCK_BANK_TRANSACTIONS: BankTransaction[] = [
  { id: 'bt1', bankAccountId: 'ba1', date: '2026-05-25', description: 'NEFT from TechCorp India', debit: 0, credit: 18000, balance: 842500, reconciled: true, reference: 'UTR12345' },
  { id: 'bt2', bankAccountId: 'ba1', date: '2026-05-24', description: 'Vendor Payment - CloudNine', debit: 50000, credit: 0, balance: 824500, reconciled: true, reference: 'NEFT/OUT/789' },
  { id: 'bt3', bankAccountId: 'ba1', date: '2026-05-23', description: 'UPI Collection - Sunrise Mfg', debit: 0, credit: 49560, balance: 874500, reconciled: true, reference: 'UPI/TXN98765' },
  { id: 'bt4', bankAccountId: 'ba1', date: '2026-05-22', description: 'Salary Disbursement - May', debit: 632000, credit: 0, balance: 824940, reconciled: false, reference: 'SAL/MAY/2026' },
  { id: 'bt5', bankAccountId: 'ba1', date: '2026-05-21', description: 'PF Remittance', debit: 42000, credit: 0, balance: 1456940, reconciled: false, reference: 'EPFO/MAY' },
  { id: 'bt6', bankAccountId: 'ba1', date: '2026-05-20', description: 'GST Payment', debit: 28500, credit: 0, balance: 1498940, reconciled: false, reference: 'GST/APR/26' },
  { id: 'bt7', bankAccountId: 'ba2', date: '2026-05-26', description: 'Cheque Deposit - GreenLeaf', debit: 0, credit: 4920, balance: 315200, reconciled: false, reference: 'CHQ#456789' },
  { id: 'bt8', bankAccountId: 'ba2', date: '2026-05-24', description: 'Office Rent', debit: 85000, credit: 0, balance: 310280, reconciled: true, reference: 'RENT/MAY' },
];

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'je1', number: 'JV-2026-001', date: '2026-04-05', narration: 'Sales Invoice INV-2026-001 — TechCorp India', status: 'posted', source: 'invoice',
    lines: [
      { account: 'Accounts Receivable', accountCode: '1300', debit: 206500, credit: 0 },
      { account: 'Sales Revenue', accountCode: '4100', debit: 0, credit: 175000 },
      { account: 'IGST Output', accountCode: '2310', debit: 0, credit: 31500 },
    ],
    totalDebit: 206500, totalCredit: 206500,
  },
  {
    id: 'je2', number: 'JV-2026-002', date: '2026-04-10', narration: 'Receipt RCT-001 from TechCorp India', status: 'posted', source: 'receipt',
    lines: [
      { account: 'HDFC Bank Current A/c', accountCode: '1110', debit: 18000, credit: 0 },
      { account: 'Accounts Receivable', accountCode: '1300', debit: 0, credit: 18000 },
    ],
    totalDebit: 18000, totalCredit: 18000,
  },
  {
    id: 'je3', number: 'JV-2026-003', date: '2026-04-12', narration: 'Sales Invoice INV-2026-002 — GreenLeaf Exports', status: 'posted', source: 'invoice',
    lines: [
      { account: 'Accounts Receivable', accountCode: '1300', debit: 99120, credit: 0 },
      { account: 'Sales Revenue', accountCode: '4100', debit: 0, credit: 84000 },
      { account: 'CGST Output', accountCode: '2311', debit: 0, credit: 7560 },
      { account: 'SGST Output', accountCode: '2312', debit: 0, credit: 7560 },
    ],
    totalDebit: 99120, totalCredit: 99120,
  },
  {
    id: 'je4', number: 'JV-2026-004', date: '2026-04-15', narration: 'Vendor Bill VB-001 — CloudNine Supplies (Office Chairs)', status: 'posted', source: 'invoice',
    lines: [
      { account: 'Office Equipment', accountCode: '1500', debit: 85000, credit: 0 },
      { account: 'IGST Input', accountCode: '1320', debit: 15300, credit: 0 },
      { account: 'Accounts Payable', accountCode: '2100', debit: 0, credit: 100300 },
    ],
    totalDebit: 100300, totalCredit: 100300,
  },
  {
    id: 'je5', number: 'JV-2026-005', date: '2026-04-28', narration: 'April 2026 Salary — Payroll Run', status: 'posted', source: 'payroll',
    lines: [
      { account: 'Salary Expense', accountCode: '5100', debit: 787000, credit: 0 },
      { account: 'PF Employer Contribution', accountCode: '5110', debit: 16200, credit: 0 },
      { account: 'Salary Payable', accountCode: '2150', debit: 0, credit: 632000 },
      { account: 'PF Payable', accountCode: '2160', debit: 0, credit: 32400 },
      { account: 'ESI Payable', accountCode: '2170', debit: 0, credit: 4800 },
      { account: 'TDS Payable', accountCode: '2180', debit: 0, credit: 39350 },
      { account: 'Professional Tax Payable', accountCode: '2190', debit: 0, credit: 1600 },
      { account: 'Salary Advance Recovery', accountCode: '1350', debit: 0, credit: 93050 },
    ],
    totalDebit: 803200, totalCredit: 803200,
  },
  {
    id: 'je6', number: 'JV-2026-006', date: '2026-05-01', narration: 'Office Rent — May 2026', status: 'posted', source: 'manual',
    lines: [
      { account: 'Rent Expense', accountCode: '5200', debit: 85000, credit: 0 },
      { account: 'TDS Payable (194I)', accountCode: '2181', debit: 0, credit: 8500 },
      { account: 'ICICI Bank Current A/c', accountCode: '1111', debit: 0, credit: 76500 },
    ],
    totalDebit: 85000, totalCredit: 85000,
  },
];

export const MOCK_TRIAL_BALANCE: TrialBalanceRow[] = [
  { accountCode: '1110', accountName: 'HDFC Bank Current A/c', group: 'Assets', debit: 842500, credit: 0 },
  { accountCode: '1111', accountName: 'ICICI Bank Current A/c', group: 'Assets', debit: 315200, credit: 0 },
  { accountCode: '1112', accountName: 'SBI Savings A/c', group: 'Assets', debit: 125000, credit: 0 },
  { accountCode: '1200', accountName: 'Cash in Hand', group: 'Assets', debit: 15000, credit: 0 },
  { accountCode: '1300', accountName: 'Accounts Receivable', group: 'Assets', debit: 324700, credit: 0 },
  { accountCode: '1320', accountName: 'GST Input Credit', group: 'Assets', debit: 25470, credit: 0 },
  { accountCode: '1500', accountName: 'Office Equipment', group: 'Fixed Assets', debit: 285000, credit: 0 },
  { accountCode: '1510', accountName: 'Computer Equipment', group: 'Fixed Assets', debit: 420000, credit: 0 },
  { accountCode: '1520', accountName: 'Accumulated Depreciation', group: 'Fixed Assets', debit: 0, credit: 105000 },
  { accountCode: '2100', accountName: 'Accounts Payable', group: 'Liabilities', debit: 0, credit: 193400 },
  { accountCode: '2150', accountName: 'Salary Payable', group: 'Liabilities', debit: 0, credit: 0 },
  { accountCode: '2160', accountName: 'PF Payable', group: 'Liabilities', debit: 0, credit: 32400 },
  { accountCode: '2180', accountName: 'TDS Payable', group: 'Liabilities', debit: 0, credit: 47850 },
  { accountCode: '2310', accountName: 'GST Output Liability', group: 'Liabilities', debit: 0, credit: 46620 },
  { accountCode: '3100', accountName: 'Share Capital', group: 'Equity', debit: 0, credit: 500000 },
  { accountCode: '3200', accountName: 'Retained Earnings', group: 'Equity', debit: 0, credit: 850000 },
  { accountCode: '4100', accountName: 'Sales Revenue', group: 'Income', debit: 0, credit: 351000 },
  { accountCode: '4200', accountName: 'Service Revenue', group: 'Income', debit: 0, credit: 125000 },
  { accountCode: '5100', accountName: 'Salary Expense', group: 'Expenses', debit: 787000, credit: 0 },
  { accountCode: '5110', accountName: 'PF Employer Contribution', group: 'Expenses', debit: 16200, credit: 0 },
  { accountCode: '5200', accountName: 'Rent Expense', group: 'Expenses', debit: 85000, credit: 0 },
  { accountCode: '5300', accountName: 'Depreciation Expense', group: 'Expenses', debit: 35000, credit: 0 },
  { accountCode: '5400', accountName: 'Office Supplies', group: 'Expenses', debit: 24500, credit: 0 },
  { accountCode: '5500', accountName: 'Utilities', group: 'Expenses', debit: 18200, credit: 0 },
];

export const MOCK_PNL: { income: ReportPnLRow[]; expenses: ReportPnLRow[] } = {
  income: [
    { category: 'Revenue', items: [{ name: 'Sales Revenue', amount: 351000 }, { name: 'Service Revenue', amount: 125000 }], total: 476000 },
    { category: 'Other Income', items: [{ name: 'Interest Income', amount: 4200 }, { name: 'Miscellaneous', amount: 1800 }], total: 6000 },
  ],
  expenses: [
    { category: 'Employee Cost', items: [{ name: 'Salary Expense', amount: 787000 }, { name: 'PF Employer', amount: 16200 }, { name: 'Staff Welfare', amount: 8500 }], total: 811700 },
    { category: 'Operating Expenses', items: [{ name: 'Rent', amount: 85000 }, { name: 'Utilities', amount: 18200 }, { name: 'Office Supplies', amount: 24500 }, { name: 'Internet & Telecom', amount: 12000 }], total: 139700 },
    { category: 'Depreciation', items: [{ name: 'Depreciation', amount: 35000 }], total: 35000 },
  ],
};
