import type { MarketingImageKey } from './marketing-images';
import type { ImageFrameVariant } from '../components/marketing/MarketingImageFrame';

export interface ResourceItem {
  title: string;
  description: string;
  path: string;
  category: 'Product' | 'Guide' | 'Support' | 'Pricing';
  readTime?: string;
  imageKey: MarketingImageKey;
  frame?: ImageFrameVariant;
}

export const resourceCategories = [
  { id: 'all', label: 'All resources' },
  { id: 'product', label: 'Product guides' },
  { id: 'guide', label: 'How-to guides' },
  { id: 'support', label: 'Support' },
] as const;

export const resources: ResourceItem[] = [
  {
    title: 'HRMS product overview',
    description: 'Attendance, leave, payroll, PF, ESI, and TDS — how Saptta HRMS works for Indian teams.',
    path: '/hrms',
    category: 'Product',
    readTime: '8 min read',
    imageKey: 'productHrms',
    frame: 'device',
  },
  {
    title: 'Accounts & GST billing',
    description: 'Invoicing, ledger, bank reconciliation, and GSTR-ready workflows in Saptta Accounts.',
    path: '/finance',
    category: 'Product',
    readTime: '7 min read',
    imageKey: 'productAccounts',
    frame: 'glass',
  },
  {
    title: 'Mobile app for field teams',
    description: 'Geofence punch, leave, payslips, and manager approvals on iOS and Android.',
    path: '/mobile-app',
    category: 'Product',
    readTime: '5 min read',
    imageKey: 'productMobile',
    frame: 'tilt',
  },
  {
    title: 'Compare platform features',
    description: 'Full feature matrix across Starter, Professional, and Enterprise plans.',
    path: '/features',
    category: 'Guide',
    readTime: '6 min read',
    imageKey: 'featuresPlatform',
    frame: 'card',
  },
  {
    title: 'Pricing & modular plans',
    description: 'Choose HRMS, Finance, or Saptta Complete — transparent INR pricing.',
    path: '/pricing',
    category: 'Pricing',
    readTime: '4 min read',
    imageKey: 'pricingMeeting',
    frame: 'card',
  },
  {
    title: 'Industry solutions',
    description: 'See how IT, manufacturing, retail, healthcare, logistics, and finance teams use Saptta.',
    path: '/industries',
    category: 'Guide',
    readTime: '10 min read',
    imageKey: 'solutionsCollab',
    frame: 'card',
  },
  {
    title: 'Book a demo',
    description: 'Talk to our team about rollout, migration, and integrations (Razorpay, ZKTeco, banks).',
    path: '/contact',
    category: 'Support',
    readTime: '2 min',
    imageKey: 'contactSupport',
    frame: 'card',
  },
  {
    title: 'Security & compliance',
    description: 'Encryption, RBAC, audit logs, and Indian statutory controls built into the platform.',
    path: '/security',
    category: 'Guide',
    readTime: '5 min read',
    imageKey: 'security',
    frame: 'card',
  },
];

export const quickLinks = [
  { label: 'Help & contact', path: '/contact', desc: 'Demo, sales, and support' },
  { label: 'All products', path: '/products', desc: 'HRMS, Accounts, Mobile' },
  { label: 'Solutions by industry', path: '/solutions', desc: 'Tailored workflows' },
];
