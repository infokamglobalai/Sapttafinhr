import type { HomeSectionTheme } from '../components/shared/HomeSectionHeader';
import type { AccordionItem } from '../components/marketing/FeatureAccordion';
import type { MarketingImageKey } from './marketing-images';

export interface ProductOverviewCard {
  title: string;
  highlight: string;
  desc: string;
  path: string;
  theme: HomeSectionTheme;
  accent: string;
  features: string[];
  imageKey: MarketingImageKey;
  ctaLabel: string;
  featured?: boolean;
  badge?: string;
}

export type ShowcaseVariant = 'hrms-roster' | 'finance-ledger' | 'mobile-app' | 'platform-plans';

export interface ProductStat {
  value: string;
  label: string;
}

export interface ProductModule {
  code: string;
  title: string;
  tag: string;
  desc: string;
  features: string[];
  accent: string;
}

export interface ProductPageConfig {
  slug: string;
  theme: HomeSectionTheme;
  heroGradient: string;
  hero: {
    eyebrow: string;
    title: string;
    titleHighlight?: string;
    subtitle: string;
    stats: ProductStat[];
    primaryLabel: string;
    primaryTo: string;
    secondaryLabel: string;
    secondaryTo: string;
  };
  showcase: {
    eyebrow: string;
    title: string;
    titleHighlight?: string;
    subtitle: string;
    variant: ShowcaseVariant;
  };
  modules: {
    eyebrow: string;
    title: string;
    titleHighlight?: string;
    subtitle: string;
    items: ProductModule[];
  };
  compliance: {
    eyebrow: string;
    title: string;
    titleHighlight?: string;
    subtitle: string;
    badges: string[];
  };
  workflow?: {
    title: string;
    steps: { label: string; desc: string }[];
  };
  featuredModuleCode?: string;
  highlightCard?: {
    badge?: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaTo: string;
  };
  accordion?: {
    eyebrow: string;
    title: string;
    titleHighlight?: string;
    subtitle?: string;
    items: AccordionItem[];
  };
  cta: { title: string; subtitle: string };
}

export const productsOverview = {
  hero: {
    eyebrow: 'Saptta Products',
    title: 'HRMS & Finance SaaS',
    titleHighlight: 'for Indian SMBs',
    subtitle:
      'Subscribe to HRMS, Finance, or both — single sign-on and flexible adoption. India workspaces get PF, ESI & Form 16; GCC workspaces get core HR today with local payroll on roadmap.',
  },
  productCards: [
    {
      title: 'HRMS',
      highlight: 'People Operations',
      desc: 'Employee master, attendance, leave, payroll, and HR lifecycle — built for teams of 10–500+.',
      path: '/hrms',
      theme: 'navy' as HomeSectionTheme,
      accent: '#1E2A78',
      imageKey: 'modularHrms',
      ctaLabel: 'Explore HRMS',
      features: ['Employee master & docs', 'Attendance & leave', 'Payroll processing', 'Onboarding & letters'],
    },
    {
      title: 'Finance',
      highlight: 'Accounting & GST',
      desc: 'General ledger, GST invoicing, banking reconciliation, and financial reporting in one product.',
      path: '/accounts',
      theme: 'green' as HomeSectionTheme,
      accent: '#FF6D00',
      imageKey: 'modularAccounts',
      ctaLabel: 'Explore Finance',
      features: ['General ledger & COA', 'GST invoicing', 'Bank & Razorpay reco', 'P&L & balance sheet'],
    },
    {
      title: 'Complete',
      highlight: 'HRMS + Finance',
      desc: 'Both products on one subscription — unified login, Tally payroll export today, payroll→ledger auto-sync on roadmap.',
      path: '/pricing',
      theme: 'amber' as HomeSectionTheme,
      accent: '#FF6D00',
      imageKey: 'modularComplete',
      ctaLabel: 'See pricing',
      features: ['Single sign-on', 'Unified reporting', 'Payroll-to-ledger sync', 'Best value bundle'],
      featured: true,
      badge: 'Best Value',
    },
  ] satisfies ProductOverviewCard[],
  mobileAddOn: {
    title: 'Mobile',
    highlight: 'Field Workforce Add-on',
    desc: 'GPS attendance, mobile ESS, and manager approvals for distributed teams — pairs with HRMS.',
    path: '/mobile-app',
    accent: '#1E2A78',
    imageKey: 'mobileField' as MarketingImageKey,
    ctaLabel: 'Explore Mobile',
  },
  platformFeatures: [
    {
      icon: 'sso',
      title: 'Single sign-on',
      desc: 'One identity across HRMS and Finance backends — sign up once, route to the right product without a second login.',
    },
    {
      icon: 'sync',
      title: 'Payroll-to-ledger sync',
      desc: 'Salary disbursements from HRMS post to finance ledgers automatically when both modules are active.',
    },
    {
      icon: 'modular',
      title: 'Module-by-module adoption',
      desc: 'Subscribe to FIN, HR, or both — add the second module when you are ready without migrating off Saptta.',
    },
    {
      icon: 'ai',
      title: 'Shared intelligence',
      desc: 'Ask Saptta queries across payroll, attendance, and ledger data from one AI layer on top of your stack.',
    },
  ],
};

export const allProductOverviewCards: ProductOverviewCard[] = [
  ...productsOverview.productCards,
  {
    title: productsOverview.mobileAddOn.title,
    highlight: productsOverview.mobileAddOn.highlight,
    desc: productsOverview.mobileAddOn.desc,
    path: productsOverview.mobileAddOn.path,
    theme: 'purple',
    accent: productsOverview.mobileAddOn.accent,
    imageKey: productsOverview.mobileAddOn.imageKey,
    ctaLabel: productsOverview.mobileAddOn.ctaLabel,
    features: ['Geofence attendance', 'Leave & payslips', 'Manager approvals', 'Offline punch cache'],
  },
];

export const hrmsPage: ProductPageConfig = {
  slug: 'hrms',
  theme: 'navy',
  heroGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, rgba(255, 109, 0, 0.06) 100%)',
  hero: {
    eyebrow: 'Saptta HRMS',
    title: 'HR, payroll & attendance',
    titleHighlight: 'for Indian teams',
    subtitle:
      'From hire to payslip — geofenced attendance, leave workflows, statutory payroll, and performance reviews in one compliant HR platform.',
    stats: [
      { value: '70%', label: 'Faster payroll runs' },
      { value: '100%', label: 'PF & ESI compliance' },
      { value: '24/7', label: 'Live attendance sync' },
    ],
    primaryLabel: 'Explore HRMS',
    primaryTo: '/login?product=hrms',
    secondaryLabel: 'Book a demo',
    secondaryTo: '/contact',
  },
  showcase: {
    eyebrow: 'Live operations',
    title: 'Coordinate shifts & attendance',
    titleHighlight: 'with zero friction',
    subtitle:
      'Link rosters to geofence punches and payroll. Day or night shifts — late marks, overtime, and statutory deductions update automatically.',
    variant: 'hrms-roster',
  },
  modules: {
    eyebrow: 'HRMS modules',
    title: 'Everything HR teams need',
    titleHighlight: 'in one product',
    subtitle: 'Start with core HR and add recruitment, performance, and analytics as you scale.',
    items: [
      {
        code: 'EM',
        title: 'Employee Management',
        tag: 'Core',
        accent: '#1E2A78',
        desc: 'Central employee records, documents, departments, and digital ID cards.',
        features: ['Employee master & org chart', 'Document vault', 'Self-service portal'],
      },
      {
        code: 'AT',
        title: 'Attendance & Shifts',
        tag: 'Operations',
        accent: '#FF6D00',
        desc: 'GPS geofence, biometric devices (ZKTeco), shifts, and overtime rules.',
        features: ['Mobile geofence punch', 'Shift rosters', 'Late & OT calculations'],
      },
      {
        code: 'PY',
        title: 'Statutory Payroll',
        tag: 'Compliance',
        accent: '#FF6D00',
        desc: 'Salary processing with PF, ESI, professional tax, and TDS on salary.',
        features: ['One-click payroll run', 'Payslips & Form 16', 'Loan & advance recovery'],
      },
      {
        code: 'LV',
        title: 'Leave Management',
        tag: 'Core',
        accent: '#1E2A78',
        desc: 'Leave balances, multi-level approvals, and holiday calendars.',
        features: ['Custom leave types', 'Approval chains', 'Balance accruals'],
      },
      {
        code: 'RC',
        title: 'Recruitment',
        tag: 'Growth',
        accent: '#FF6D00',
        desc: 'Applicant tracking, interview stages, and digital onboarding checklists.',
        features: ['Job postings', 'Candidate pipeline', 'Offer letter templates'],
      },
      {
        code: 'PF',
        title: 'Performance',
        tag: 'Growth',
        accent: '#1E2A78',
        desc: 'Goals, review cycles, and manager feedback linked to employee records.',
        features: ['OKR tracking', 'Review cycles', '360° feedback'],
      },
    ],
  },
  workflow: {
    title: 'Hire → Pay → Comply',
    steps: [
      { label: 'Onboard', desc: 'Collect KYC, assign shift & policies' },
      { label: 'Track', desc: 'Attendance syncs to payroll' },
      { label: 'Pay', desc: 'PF, ESI, TDS calculated' },
      { label: 'Report', desc: 'Audit-ready registers' },
    ],
  },
  compliance: {
    eyebrow: 'India & GCC',
    title: 'Statutory compliance',
    titleHighlight: 'built in',
    subtitle: 'India: PF, ESI, TDS & Form 16 today. Kuwait & GCC: core HR live — PIFSS, indemnity & WPS on roadmap.',
    badges: ['EPF', 'ESI', 'TDS', 'Professional Tax', 'Form 16', 'POSH', 'LWF', 'Bonus Act'],
  },
  featuredModuleCode: 'PY',
  highlightCard: {
    badge: 'Unified HR view',
    title: 'View and manage everyone in one place',
    description: 'Unified employee records, attendance, and payroll — with AI checks before every payout.',
    ctaLabel: 'Explore HRMS',
    ctaTo: '/login?product=hrms',
  },
  accordion: {
    eyebrow: 'Why teams switch',
    title: 'HR workflows that',
    titleHighlight: 'stay in sync',
    subtitle: 'Attendance, leave, and payroll share one data layer — no spreadsheet bridges.',
    items: [
      {
        id: 'attendance',
        title: 'Geofence & biometric attendance',
        desc: 'Mobile GPS punches, ZKTeco devices, and shift rosters feed payroll automatically with late/OT rules.',
        ctaLabel: 'See attendance',
        ctaTo: '/hrms',
      },
      {
        id: 'payroll',
        title: 'Statutory payroll in one run',
        desc: 'PF, ESI, professional tax, and TDS on salary with payslips, Form 16, and audit-ready registers.',
        ctaLabel: 'See payroll',
        ctaTo: '/hrms',
      },
      {
        id: 'ai',
        title: 'AI payroll auditor',
        desc: 'Flags mismatches before disbursement and surfaces compliance risks early for HR and finance leads.',
        ctaLabel: 'Platform features',
        ctaTo: '/features',
      },
    ],
  },
  cta: {
    title: 'Automate your HR operations',
    subtitle: 'See how Saptta HRMS cuts manual payroll work and keeps you audit-ready.',
  },
};

export const accountsPage: ProductPageConfig = {
  slug: 'accounts',
  theme: 'navy',
  heroGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, rgba(255, 109, 0, 0.06) 100%)',
  hero: {
    eyebrow: 'Saptta Accounts',
    title: 'GST billing & finance',
    titleHighlight: 'that stays reconciled',
    subtitle:
      'Double-entry ledger, GST invoices, bank reconciliation, and purchase management — with payroll expenses posting automatically from HRMS.',
    stats: [
      { value: 'GSTR', label: 'Ready summaries' },
      { value: '2-way', label: 'Bank matching' },
      { value: 'Real-time', label: 'P&L dashboards' },
    ],
    primaryLabel: 'Explore Accounts',
    primaryTo: '/login?product=finance',
    secondaryLabel: 'View pricing',
    secondaryTo: '/pricing',
  },
  showcase: {
    eyebrow: 'Live ledger',
    title: 'Books that balance',
    titleHighlight: 'themselves',
    subtitle:
      'Export payroll to Tally XML today. Payroll→ledger auto-posting for Complete is on the product roadmap — one login and unified reports are live now.',
    variant: 'finance-ledger',
  },
  modules: {
    eyebrow: 'Finance modules',
    title: 'Complete accounting',
    titleHighlight: 'for growing businesses',
    subtitle: 'From invoicing to inventory — manage money movement with Indian GST at the center.',
    items: [
      {
        code: 'INV',
        title: 'GST Invoicing',
        tag: 'Core',
        accent: '#FF6D00',
        desc: 'CGST, SGST, IGST invoices with e-invoice readiness and payment links.',
        features: ['GST invoice templates', 'Quotations & POs', 'Razorpay collections'],
      },
      {
        code: 'GL',
        title: 'General Ledger',
        tag: 'Core',
        accent: '#1E2A78',
        desc: 'Chart of accounts, journals, trial balance, and financial statements.',
        features: ['Double-entry journals', 'Trial balance', 'P&L & balance sheet'],
      },
      {
        code: 'BR',
        title: 'Bank Reconciliation',
        tag: 'Operations',
        accent: '#1E2A78',
        desc: 'Import statements and auto-match transactions with ledgers.',
        features: ['Statement import', 'Smart matching', 'ICICI & Razorpay sync'],
      },
      {
        code: 'TX',
        title: 'Tax & GSTR',
        tag: 'Compliance',
        accent: '#FF6D00',
        desc: 'GSTR-1, GSTR-3B support with reconciliation against purchase data.',
        features: ['GSTR summaries', 'TDS on payments', 'E-way bill hooks'],
      },
      {
        code: 'EX',
        title: 'Expenses',
        tag: 'Operations',
        accent: '#FF6D00',
        desc: 'Employee claims, petty cash, and budget controls by department.',
        features: ['Claim workflows', 'Receipt capture', 'Budget limits'],
      },
      {
        code: 'ST',
        title: 'Inventory',
        tag: 'Advanced',
        accent: '#1E2A78',
        desc: 'Stock registers tied to purchase and sales for accurate asset valuation.',
        features: ['Warehouse tracking', 'Reorder alerts', 'Valuation reports'],
      },
    ],
  },
  workflow: {
    title: 'Invoice → Collect → File',
    steps: [
      { label: 'Bill', desc: 'GST-compliant invoices' },
      { label: 'Match', desc: 'Bank & Razorpay reco' },
      { label: 'Post', desc: 'Ledger auto-updates' },
      { label: 'File', desc: 'GSTR-ready exports' },
    ],
  },
  compliance: {
    eyebrow: 'Tax ready',
    title: 'GST & compliance',
    titleHighlight: 'native support',
    subtitle: 'Reduce filing errors with validated tax calculations and audit trails.',
    badges: ['GSTR-1', 'GSTR-2A', 'GSTR-3B', 'E-Invoice', 'E-Way Bill', 'TDS', 'Tally export'],
  },
  featuredModuleCode: 'INV',
  highlightCard: {
    badge: 'HRMS → Finance sync',
    title: 'Payroll posts to your ledger automatically',
    description: 'When HRMS runs payroll, journal entries and tax splits sync to Accounts — one source of truth.',
    ctaLabel: 'See Accounts',
    ctaTo: '/login?product=finance',
  },
  accordion: {
    eyebrow: 'Finance automation',
    title: 'Books, tax, and bank',
    titleHighlight: 'connected',
    items: [
      {
        id: 'gst',
        title: 'GST invoicing & GSTR support',
        desc: 'CGST, SGST, IGST invoices with summaries for GSTR-1 and GSTR-3B filing workflows.',
        ctaLabel: 'View Accounts',
        ctaTo: '/accounts',
      },
      {
        id: 'reco',
        title: 'Bank & Razorpay reconciliation',
        desc: 'Import statements and auto-match receipts with ledgers in minutes, not days.',
        ctaTo: '/accounts',
      },
      {
        id: 'sync',
        title: 'HRMS → Finance sync',
        desc: 'Payroll expenses, reimbursements, and vendor bills post with correct debit/credit journals.',
        ctaLabel: 'Saptta Complete',
        ctaTo: '/pricing',
      },
    ],
  },
  cta: {
    title: 'Consolidate your finance stack',
    subtitle: 'Replace spreadsheets and disconnected billing tools with one Saptta Accounts workspace.',
  },
};

export const mobileAppPage: ProductPageConfig = {
  slug: 'mobile-app',
  theme: 'navy',
  heroGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, rgba(255, 109, 0, 0.06) 100%)',
  hero: {
    eyebrow: 'Saptta Mobile',
    title: 'HR in every pocket',
    titleHighlight: 'for field teams',
    subtitle:
      'Attendance, leave, payslips, and manager approvals from any phone — a mobile-responsive HRMS today, with native Android & iOS companion apps on our roadmap.',
    stats: [
      { value: 'GPS', label: 'Geofence punch' },
      { value: 'PDF', label: 'Instant payslips' },
      { value: 'Push', label: 'Live alerts' },
    ],
    primaryLabel: 'Request mobile access',
    primaryTo: '/contact',
    secondaryLabel: 'See HRMS features',
    secondaryTo: '/hrms',
  },
  showcase: {
    eyebrow: 'Mobile cockpit',
    title: 'Empower employees',
    titleHighlight: 'on the move',
    subtitle:
      'No more manual registers or paper payslips. Staff punch inside verified boundaries, request leave, and download tax slips from their phone.',
    variant: 'mobile-app',
  },
  modules: {
    eyebrow: 'App features',
    title: 'Built for distributed',
    titleHighlight: 'workforces',
    subtitle: 'Everything field employees and line managers need without opening a laptop.',
    items: [
      {
        code: 'IN',
        title: 'Secure login',
        tag: 'Security',
        accent: '#1E2A78',
        desc: 'Password, OTP, and device biometrics with session security.',
        features: ['Face ID / fingerprint', 'Role-based access', 'Encrypted sync'],
      },
      {
        code: 'GP',
        title: 'Geofence attendance',
        tag: 'Core',
        accent: '#1E2A78',
        desc: 'Clock in only inside approved GPS boundaries or office Wi‑Fi.',
        features: ['Live map view', 'Punch history', 'Shift reminders'],
      },
      {
        code: 'LV',
        title: 'Leave requests',
        tag: 'Core',
        accent: '#FF6D00',
        desc: 'Apply leave with live balance checks and approval tracking.',
        features: ['Balance preview', 'Attachment upload', 'Status notifications'],
      },
      {
        code: 'PS',
        title: 'Payslips',
        tag: 'Payroll',
        accent: '#1E2A78',
        desc: 'Download monthly payslips and YTD tax summaries as PDF.',
        features: ['Historical slips', 'Tax breakdown', 'Share securely'],
      },
      {
        code: 'AP',
        title: 'Manager approvals',
        tag: 'Managers',
        accent: '#FF6D00',
        desc: 'Approve leave, expenses, and attendance corrections from mobile.',
        features: ['One-tap approve', 'Delegation rules', 'Audit trail'],
      },
      {
        code: 'NT',
        title: 'Push notifications',
        tag: 'Engagement',
        accent: '#FF6D00',
        desc: 'Payroll processed, roster changes, holidays, and compliance alerts.',
        features: ['Instant alerts', 'Quiet hours', 'Priority routing'],
      },
    ],
  },
  compliance: {
    eyebrow: 'Enterprise ready',
    title: 'Secure mobile',
    titleHighlight: 'deployment',
    subtitle: 'TLS encryption, offline punch cache, and privacy-first location checks.',
    badges: ['Mobile-responsive', 'Native apps on roadmap', 'Biometrics', 'TLS 1.3', 'Regional languages', 'MDM friendly'],
  },
  featuredModuleCode: 'GP',
  workflow: {
    title: 'Punch → Approve → Pay',
    steps: [
      { label: 'Punch', desc: 'Geofence or biometric check-in' },
      { label: 'Sync', desc: 'Live feed to HRMS roster' },
      { label: 'Approve', desc: 'Managers act on mobile' },
      { label: 'Pay', desc: 'Payslips in the app' },
    ],
  },
  highlightCard: {
    badge: 'Field workforce ready',
    title: 'Field teams punch inside verified geofences',
    description: 'GPS boundaries, offline cache, and instant sync to Saptta HRMS for payroll-ready attendance.',
    ctaLabel: 'Book a demo',
    ctaTo: '/contact',
  },
  accordion: {
    eyebrow: 'Mobile-first HR',
    title: 'Everything employees need',
    titleHighlight: 'on their phone',
    items: [
      {
        id: 'punch',
        title: 'Attendance from anywhere',
        desc: 'Geofence punch, selfie/biometric options, and shift reminders for distributed teams.',
        ctaTo: '/mobile-app',
      },
      {
        id: 'leave',
        title: 'Leave & approvals',
        desc: 'Apply leave with live balances; managers approve from the same app.',
        ctaTo: '/mobile-app',
      },
      {
        id: 'payslip',
        title: 'Payslips & tax PDFs',
        desc: 'Download monthly payslips with PF, ESI, and TDS breakdown — no paper distribution.',
        ctaTo: '/hrms',
      },
    ],
  },
  cta: {
    title: 'Deploy mobile HR for your team',
    subtitle: 'Talk to us about rollout, device policies, and ZKTeco + mobile hybrid attendance.',
  },
};

export const featuresPageMeta = {
  hero: {
    eyebrow: 'Platform',
    title: 'Every capability',
    titleHighlight: 'in one stack',
    subtitle:
      'Compare HRMS and Accounts features across plans — modular products that share data when you need the full Saptta bundle.',
    theme: 'navy' as HomeSectionTheme,
  },
  showcase: {
    eyebrow: 'Choose your scale',
    title: 'Plans that grow',
    titleHighlight: 'with your business',
    subtitle: 'From startups to multi-branch enterprises — same compliance core, flexible roster limits.',
    variant: 'platform-plans' as ShowcaseVariant,
  },
};
