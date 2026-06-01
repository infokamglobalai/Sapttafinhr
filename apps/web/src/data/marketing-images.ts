/** Curated marketing photography — local `/images/*` preferred when present; CDN fallback otherwise */

export type MarketingImageKey =
  | 'hrmsDashboard'
  | 'payrollDashboard'
  | 'gstDashboard'
  | 'complianceDashboard'
  | 'workflowTeam'
  | 'aiWorkspace'
  | 'ecosystemOffice'
  | 'beforeLegacy'
  | 'afterSaptta'
  | 'modularHrms'
  | 'modularAccounts'
  | 'modularComplete'
  | 'testimonial1'
  | 'testimonial2'
  | 'testimonial3'
  | 'integrations'
  | 'security'
  | 'aboutOffice'
  | 'aboutTeam'
  | 'contactSupport'
  | 'solutionsCollab'
  | 'resourcesLearning'
  | 'pricingMeeting'
  | 'careersCulture'
  | 'mobileField'
  | 'industryIt'
  | 'industryManufacturing'
  | 'industryRetail'
  | 'industryHealthcare'
  | 'industryLogistics'
  | 'industryFinance'
  | 'productHrms'
  | 'productAccounts'
  | 'productMobile'
  | 'featuresPlatform'
  | 'ctaBanner';

export interface MarketingImageAsset {
  alt: string;
  /** Optional file in `public/images/` — add your own high-res exports here */
  local?: string;
  /** High-quality Unsplash fallback (commercial-friendly) */
  remote: string;
}

const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?w=${w}&q=85&auto=format&fit=crop`;

export const marketingImages: Record<MarketingImageKey, MarketingImageAsset> = {
  hrmsDashboard: {
    alt: 'HR team reviewing workforce analytics on a dashboard',
    local: '/images/hrms-dashboard.png',
    remote: u('photo-1551288049-bebda4e38f71'),
  },
  payrollDashboard: {
    alt: 'Payroll and compensation planning on laptop',
    local: '/images/payroll-dashboard.png',
    remote: u('photo-1554224155-6726b3ff858f'),
  },
  gstDashboard: {
    alt: 'Finance professional working on GST and accounting',
    local: '/images/gst-dashboard.png',
    remote: u('photo-1554224154-26032ffe0d88'),
  },
  complianceDashboard: {
    alt: 'Compliance audit and statutory reporting workspace',
    local: '/images/compliance-dashboard.jpg',
    remote: u('photo-1454165804606-c3d57bc86b40'),
  },
  workflowTeam: {
    alt: 'Cross-functional team collaborating on business operations',
    local: '/images/workflow-team.jpg',
    remote: u('photo-1522071820081-009f0129c71c'),
  },
  aiWorkspace: {
    alt: 'Modern office with data-driven HR and finance workflows',
    local: '/images/ai-workspace-clean.png',
    remote: u('photo-1677442136019-21780ecad995', 1200),
  },
  ecosystemOffice: {
    alt: 'Connected business operations in a modern workspace',
    local: '/images/ecosystem-office.jpg',
    remote: u('photo-1497366216548-37526070297c'),
  },
  beforeLegacy: {
    alt: 'Spreadsheets and disconnected legacy tools',
    local: '/images/before-legacy.jpg',
    remote: u('photo-1450101499163-c8848c66ca85'),
  },
  afterSaptta: {
    alt: 'Unified Saptta platform on desktop and mobile',
    local: '/images/after-saptta.jpg',
    remote: u('photo-1460925895917-afdab827c52f'),
  },
  modularHrms: {
    alt: 'HR manager onboarding employees',
    local: '/images/modular-hrms.jpg',
    remote: u('photo-1573496359142-b8d87734a5a2'),
  },
  modularAccounts: {
    alt: 'Accountant reviewing invoices and ledger',
    local: '/images/modular-accounts.jpg',
    remote: u('photo-1551836022-d5d88e8568c2'),
  },
  modularComplete: {
    alt: 'Leadership reviewing unified HR and finance metrics',
    local: '/images/modular-complete.jpg',
    remote: u('photo-1600880292203-757bb62b4baf'),
  },
  testimonial1: {
    alt: 'Operations leader portrait',
    local: '/images/testimonial-1.jpg',
    remote: u('photo-1560250097-0b93528c311a', 400),
  },
  testimonial2: {
    alt: 'Finance head portrait',
    local: '/images/testimonial-2.jpg',
    remote: u('photo-1573497019940-8c21df28819b', 400),
  },
  testimonial3: {
    alt: 'HR director portrait',
    local: '/images/testimonial-3.jpg',
    remote: u('photo-1580489944761-15a19d654956', 400),
  },
  integrations: {
    alt: 'Enterprise software integrations ecosystem',
    local: '/images/integrations.jpg',
    remote: u('photo-1551434678-e076c223a692'),
  },
  security: {
    alt: 'Secure cloud infrastructure and data protection',
    local: '/images/security.jpg',
    remote: u('photo-1563986768609-322da13575f3'),
  },
  aboutOffice: {
    alt: 'Saptta team workspace and collaboration',
    local: '/images/about-office.jpg',
    remote: u('photo-1497366811353-6870744d04b2'),
  },
  aboutTeam: {
    alt: 'Professional team meeting in modern office',
    local: '/images/about-team.jpg',
    remote: u('photo-1521737714862-ea8723385487'),
  },
  contactSupport: {
    alt: 'Customer success and support consultation',
    local: '/images/contact-support.jpg',
    remote: u('photo-1423666639045-f560e134f946'),
  },
  solutionsCollab: {
    alt: 'Business leaders planning HR and finance solutions',
    local: '/images/solutions-collab.jpg',
    remote: u('photo-1600880292203-757bb62b4baf'),
  },
  resourcesLearning: {
    alt: 'Learning resources and product documentation',
    local: '/images/resources-learning.jpg',
    remote: u('photo-1434030216301-4e72022dc676'),
  },
  pricingMeeting: {
    alt: 'Pricing discussion with finance stakeholders',
    local: '/images/pricing-meeting.jpg',
    remote: u('photo-1552664730-d307ca884978'),
  },
  careersCulture: {
    alt: 'Inclusive workplace culture and growth',
    local: '/images/careers-culture.jpg',
    remote: u('photo-1522071820081-009f0129c71c'),
  },
  mobileField: {
    alt: 'Field employee using mobile for attendance',
    local: '/images/mobile-field.jpg',
    remote: u('photo-1512941937669-90a1b58f7d9b'),
  },
  industryIt: {
    alt: 'Technology company office and developers',
    local: '/images/industry-it.jpg',
    remote: u('photo-1498050108023-c5249f4df085'),
  },
  industryManufacturing: {
    alt: 'Manufacturing plant and production floor',
    local: '/images/industry-manufacturing.jpg',
    remote: u('photo-1581091226825-a6a2a5aee158'),
  },
  industryRetail: {
    alt: 'Retail store operations and staff',
    local: '/images/industry-retail.jpg',
    remote: u('photo-1441986300917-64674bd600d8'),
  },
  industryHealthcare: {
    alt: 'Healthcare facility staff coordination',
    local: '/images/industry-healthcare.jpg',
    remote: u('photo-1576091160399-112ba8d25d1f'),
  },
  industryLogistics: {
    alt: 'Logistics warehouse and fleet operations',
    local: '/images/industry-logistics.jpg',
    remote: u('photo-1586528116311-ad8dd90c4dad'),
  },
  industryFinance: {
    alt: 'Financial services team and compliance',
    local: '/images/industry-finance.jpg',
    remote: u('photo-1550567871-822ecf27301d'),
  },
  productHrms: {
    alt: 'HRMS workforce management in action',
    local: '/images/product-hrms.jpg',
    remote: u('photo-1553877522-43269d4ea984'),
  },
  productAccounts: {
    alt: 'Accounts payable and GST billing workflow',
    local: '/images/product-accounts.jpg',
    remote: u('photo-1554224154-26032ffe0d88'),
  },
  productMobile: {
    alt: 'Mobile workforce app for attendance',
    local: '/images/product-mobile.jpg',
    remote: u('photo-1512941937669-90a1b58f7d9b'),
  },
  featuresPlatform: {
    alt: 'Platform features overview on multiple screens',
    local: '/images/features-platform.jpg',
    remote: u('photo-1551434678-e076c223a692'),
  },
  ctaBanner: {
    alt: 'Business growth with Saptta platform',
    local: '/images/cta-banner.jpg',
    remote: u('photo-1460925895917-afdab827c52f'),
  },
};

export const industryImageKey: Record<string, MarketingImageKey> = {
  it: 'industryIt',
  manufacturing: 'industryManufacturing',
  retail: 'industryRetail',
  healthcare: 'industryHealthcare',
  logistics: 'industryLogistics',
  finance: 'industryFinance',
};

/** Prefer CDN until files exist in `public/images/` */
export function getMarketingImageSrc(key: MarketingImageKey): string {
  return marketingImages[key].remote;
}

export function getMarketingImageAlt(key: MarketingImageKey): string {
  return marketingImages[key].alt;
}
