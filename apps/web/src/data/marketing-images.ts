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
  | 'aboutUnified'
  | 'contactSupport'
  | 'solutionsCollab'
  | 'resourcesLearning'
  | 'pricingMeeting'
  | 'careersCulture'
  | 'careersWhySaptta'
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
  | 'productSuite'
  | 'pricingHero'
  | 'ctaBanner'
  | 'homeHeroPerson'
  | 'homeHeroVisual'
  | 'automationHire'
  | 'automationAttendance'
  | 'automationPayroll'
  | 'automationAccounting'
  | 'automationGst';

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
    remote: u('photo-1454165804606-c3d57bc86b40'),
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
    local: '/images/resources/resource-security-compliance.png',
    remote: u('photo-1563986768609-322da13575f3'),
  },
  aboutOffice: {
    alt: 'Saptta team building HR and finance software for India',
    local: '/images/about-hero.png',
    remote: u('photo-1497366811353-6870744d04b2'),
  },
  aboutTeam: {
    alt: 'Professional team meeting in modern office',
    remote: u('photo-1521737714862-ea8723385487'),
  },
  aboutUnified: {
    alt: 'Unified HRMS, payroll, and finance platform connected in one workflow',
    local: '/images/about-unified-platform.png',
    remote: u('photo-1460925895917-afdab827c52f'),
  },
  contactSupport: {
    alt: 'Customer success and support consultation',
    local: '/images/resources/resource-book-demo.png',
    remote: u('photo-1423666639045-f560e134f946'),
  },
  solutionsCollab: {
    alt: 'Business leaders planning HR and finance solutions',
    local: '/images/resources/resource-industry-solutions.png',
    remote: u('photo-1600880292203-757bb62b4baf'),
  },
  resourcesLearning: {
    alt: 'Learning resources and product documentation',
    local: '/images/resources-hero.png',
    remote: u('photo-1434030216301-4e72022dc676'),
  },
  pricingMeeting: {
    alt: 'Pricing discussion with finance stakeholders',
    local: '/images/resources/resource-pricing-plans.png',
    remote: u('photo-1552664730-d307ca884978'),
  },
  careersCulture: {
    alt: 'Saptta team building HR and finance software for India',
    local: '/images/careers-hero.png',
    remote: u('photo-1522071820081-009f0129c71c'),
  },
  careersWhySaptta: {
    alt: 'Product team shipping HRMS and finance software teams rely on',
    local: '/images/careers-why-saptta.png',
    remote: u('photo-1521737714862-ea8723385487'),
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
    alt: 'SAPTTA HRMS dashboard — employees, attendance, and payroll',
    local: '/images/hrms-hero.png',
    remote: u('photo-1553877522-43269d4ea984'),
  },
  productAccounts: {
    alt: 'SAPTTA Accounts dashboard — GST invoicing, ledger, and bank reconciliation',
    local: '/images/accounts-hero.png',
    remote: u('photo-1554224154-26032ffe0d88'),
  },
  productMobile: {
    alt: 'SAPTTA Mobile app — geofence attendance, leave, and payslips on phone',
    local: '/images/mobile-app-hero.png',
    remote: u('photo-1512941937669-90a1b58f7d9b'),
  },
  featuresPlatform: {
    alt: 'Compare platform features across plan tiers',
    local: '/images/resources/resource-features-matrix.png',
    remote: u('photo-1551434678-e076c223a692'),
  },
  productSuite: {
    alt: 'SAPTTA product suite — HRMS and Finance modules on one platform',
    local: '/images/products-hero.png',
    remote: u('photo-1551434678-e076c223a692'),
  },
  pricingHero: {
    alt: 'SAPTTA pricing — HRMS and Finance plans on one platform',
    local: '/images/pricing-hero.png',
    remote: u('photo-1552664730-d307ca884978'),
  },
  ctaBanner: {
    alt: 'Business growth with Saptta platform',
    local: '/images/cta-banner.jpg',
    remote: u('photo-1460925895917-afdab827c52f'),
  },
  homeHeroPerson: {
    alt: 'HR professional using Saptta on laptop',
    local: '/images/home-hero-person.png',
    remote: u('photo-1573496359142-b8d87734a5a2'),
  },
  homeHeroVisual: {
    alt: 'Saptta HR platform — employees, payroll, attendance, accounting, and compliance',
    local: '/images/home-hero-visual.png',
    remote: u('photo-1573496359142-b8d87734a5a2'),
  },
  automationHire: {
    alt: 'Employee onboarding and new hire profile in HRMS',
    local: '/images/automation/automation-step-1-hire.png',
    remote: u('photo-1553877522-43269d4ea984'),
  },
  automationAttendance: {
    alt: 'Attendance tracking and leave sync dashboard',
    local: '/images/automation/automation-step-2-attendance.png',
    remote: u('photo-1512941937669-90a1b58f7d9b'),
  },
  automationPayroll: {
    alt: 'Payroll processing with statutory deductions',
    local: '/images/automation/automation-step-3-payroll.png',
    remote: u('photo-1554224155-6726b3ff858f'),
  },
  automationAccounting: {
    alt: 'Accounting ledger updated from payroll',
    local: '/images/automation/automation-step-4-accounting.png',
    remote: u('photo-1554224154-26032ffe0d88'),
  },
  automationGst: {
    alt: 'GST compliance and return-ready exports',
    local: '/images/automation/automation-step-5-gst.png',
    remote: u('photo-1454165804606-c3d57bc86b40'),
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

/** Prefer local assets in `public/images/` when available */
export function getMarketingImageSrc(key: MarketingImageKey): string {
  const asset = marketingImages[key];
  return asset.local ?? asset.remote;
}

export function getMarketingImageAlt(key: MarketingImageKey): string {
  return marketingImages[key].alt;
}
