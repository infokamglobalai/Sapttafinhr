export interface SolutionCard {
  title: string;
  highlight: string;
  description: string;
  path: string;
  accent: string;
  features: string[];
  industries?: string[];
}

export const solutionsOverview = {
  hero: {
    eyebrow: 'Solutions',
    title: 'HR & Finance solutions',
    titleHighlight: 'for every team size',
    subtitle:
      'Whether you are a 25-person startup or a multi-branch enterprise, Saptta adapts with modular HRMS, Accounts, and mobile workforce tools.',
  },
};

export const solutionCards: SolutionCard[] = [
  {
    title: 'HRMS & Payroll',
    highlight: 'People operations',
    description: 'Hire to retire — attendance, leave, statutory payroll, recruitment, and performance in one product.',
    path: '/hrms',
    accent: '#1E2A78',
    features: ['Geofence & biometric attendance', 'PF, ESI, TDS payroll', 'Leave & shift rosters', 'Employee self-service'],
    industries: ['it', 'manufacturing', 'healthcare'],
  },
  {
    title: 'Accounts & Finance',
    highlight: 'GST & ledgers',
    description: 'GST invoicing, general ledger, bank reconciliation, and expenses — synced with payroll when you use both products.',
    path: '/accounts',
    accent: '#FF6D00',
    features: ['GST invoices & GSTR support', 'Double-entry ledger', 'Bank & Razorpay reco', 'Inventory & purchases'],
    industries: ['retail', 'financial', 'logistics'],
  },
  {
    title: 'Saptta Complete',
    highlight: 'Unified platform',
    description: 'HRMS + Finance together — payroll posts to ledger, one compliance core, consolidated analytics.',
    path: '/pricing',
    accent: '#1E2A78',
    features: ['Payroll → GL sync', 'Single audit trail', 'AI payroll checks', 'One admin cockpit'],
    industries: ['it', 'manufacturing', 'retail', 'financial'],
  },
  {
    title: 'Mobile workforce',
    highlight: 'Field & frontline',
    description: 'Android and iOS apps for punch, leave, payslips, and approvals — synced with HRMS in real time.',
    path: '/mobile-app',
    accent: '#FF6D00',
    features: ['GPS geofence punch', 'Offline mode', 'Manager approvals', 'Push notifications'],
    industries: ['logistics', 'retail', 'manufacturing'],
  },
];

export const solutionsBySize = [
  {
    size: 'Startups & SMBs',
    desc: 'Start with HRMS or Finance. Add modules as you grow. Quick setup wizard and email support.',
    path: '/pricing',
  },
  {
    size: 'Mid-market',
    desc: 'Multi-department HR, GSTR workflows, biometric devices, and priority onboarding.',
    path: '/contact',
  },
  {
    size: 'Enterprise',
    desc: 'Multi-company, API access, dedicated support, advanced RBAC, and custom integrations.',
    path: '/contact',
  },
];
