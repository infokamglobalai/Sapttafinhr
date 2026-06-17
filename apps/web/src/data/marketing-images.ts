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
  | 'industryConstruction'
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
  | 'automationGst'
  | 'homeScreenshotAttendance';

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
    alt: 'Saptta HR dashboard with workforce overview and headcount metrics',
    local: '/images/home-screenshots/hrms.png',
    remote: u('photo-1551288049-bebda4e38f71'),
  },
  payrollDashboard: {
    alt: 'Saptta payroll dashboard with PF, ESI, TDS and payslip summary',
    local: '/images/home-screenshots/payroll.png',
    remote: u('photo-1554224155-6726b3ff858f'),
  },
  gstDashboard: {
    alt: 'Saptta GST and invoicing dashboard with CGST, SGST and GSTR export',
    local: '/images/home-screenshots/gst.png',
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
    alt: 'Cluttered desk with spreadsheets, sticky notes and disconnected legacy tools',
    local: '/images/before-legacy.jpg',
    remote: u('photo-1586953208448-b95a79798f07'),
  },
  afterSaptta: {
    alt: 'Modern Indian business team reviewing unified HR and finance dashboard together',
    local: '/images/after-saptta.jpg',
    remote: u('photo-1600880292203-757bb62b4baf'),
  },
  modularHrms: {
    alt: 'HR manager onboarding employees',
    local: '/images/modular-hrms.png',
    remote: u('photo-1573496359142-b8d87734a5a2'),
  },
  modularAccounts: {
    alt: 'Accountant reviewing invoices and ledger',
    local: '/images/modular-accounts.png',
    remote: u('photo-1454165804606-c3d57bc86b40'),
  },
  modularComplete: {
    alt: 'Leadership reviewing unified HR and finance metrics',
    local: '/images/modular-complete.png',
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
    alt: 'Software developers collaborating in a modern tech office',
    local: '/images/industries/it.png',
    remote: u('photo-1522071820081-009f0129c71c'),
  },
  industryManufacturing: {
    alt: 'Factory floor supervisor reviewing production data on tablet',
    local: '/images/industries/manufacturing.png',
    remote: u('photo-1565793298595-6a879b1d9492'),
  },
  industryRetail: {
    alt: 'Retail store manager reviewing staff schedules on tablet',
    local: '/images/industries/retail.png',
    remote: u('photo-1441986300917-64674bd600d8'),
  },
  industryHealthcare: {
    alt: 'Healthcare administrator reviewing shift rosters on tablet in clinic',
    local: '/images/industries/healthcare.png',
    remote: u('photo-1516841273335-e39b37888115'),
  },
  industryLogistics: {
    alt: 'Logistics fleet manager reviewing operations at warehouse loading dock',
    local: '/images/industries/logistics.png',
    remote: u('photo-1553413077-190dd305871c'),
  },
  industryFinance: {
    alt: 'Financial services team reviewing compliance reports at modern office',
    remote: u('photo-1454165804606-c3d57bc86b40'),
  },
  industryConstruction: {
    alt: 'Construction site manager reviewing workforce attendance on tablet at job site',
    local: '/images/industries/construction.png',
    remote: u('photo-1504307651254-35680f356dfd'),
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
    alt: 'Indian business team celebrating growth and reviewing metrics on Saptta platform',
    local: '/images/cta-banner.png',
    remote: u('photo-1600880292203-757bb62b4baf'),
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
  homeScreenshotAttendance: {
    alt: 'Saptta attendance dashboard with punches, shifts and leave calendar',
    local: '/images/home-screenshots/attendance.png',
    remote: u('photo-1512941937669-90a1b58f7d9b'),
  },
};

export const industryImageKey: Record<string, MarketingImageKey> = {
  it: 'industryIt',
  manufacturing: 'industryManufacturing',
  retail: 'industryRetail',
  healthcare: 'industryHealthcare',
  logistics: 'industryLogistics',
  finance: 'industryFinance',
  construction: 'industryConstruction',
};

/** Prefer local assets in `public/images/` when available */
export function getMarketingImageSrc(key: MarketingImageKey): string {
  const asset = marketingImages[key];
  return asset.local ?? asset.remote;
}

export function getMarketingImageAlt(key: MarketingImageKey): string {
  return marketingImages[key].alt;
}
