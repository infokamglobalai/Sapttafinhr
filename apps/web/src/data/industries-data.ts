export interface IndustryData {
  slug: string;
  code: string;
  title: string;
  accent: string;
  gradient: string;
  icon: string;
  tagline: string;
  overview: string;
  primarySolutionPath: string;
  primarySolutionLabel: string;
  relatedProductPath: string;
  challenges: { title: string; body: string }[];
  features: { label: string; detail: string }[];
  stats: { value: string; label: string }[];
  useCases: string[];
  compliancePoints: string[];
}

const industries: IndustryData[] = [
  {
    slug: 'it',
    code: 'IT',
    title: 'IT & Technology',
    accent: '#6C3BFF',
    gradient: 'linear-gradient(135deg, #6C3BFF 0%, #8B5CF6 45%, #EEF2FF 100%)',
    icon: '💻',
    tagline: 'Built for distributed teams, flexible shifts, and project-based payroll.',
    overview:
      'Technology companies face unique HR challenges — remote workforces spread across cities, variable shift cycles tied to project sprints, and pay structures that combine fixed CTC with project bonuses. Saptta unifies attendance, payroll, and accounts into one compliant platform purpose-built for IT firms.',
    primarySolutionPath: '/hrms',
    primarySolutionLabel: 'Explore HRMS for IT',
    relatedProductPath: '/accounts',
    challenges: [
      { title: 'Remote Attendance Verification', body: 'GPS punch-in with IP whitelisting ensures authentic remote attendance without physical hardware.' },
      { title: 'Flexi-Shift Management', body: 'Configure multiple shift templates per project and auto-calculate overtime against CLRA norms.' },
      { title: 'Project-Based Incentives', body: 'Tie variable pay to project milestones and auto-post payroll journal entries into accounts.' },
      { title: 'Multi-State Compliance', body: 'Auto-compute PT, PF, ESI across employee home states with zero manual intervention.' },
    ],
    features: [
      { label: 'GPS & IP Attendance', detail: 'Geofenced punch-in verified against whitelisted office IPs or GPS polygons.' },
      { label: 'Flexible Shift Engine', detail: 'Unlimited shift templates with auto OT calculation and shift-swapping approval flows.' },
      { label: 'Variable Pay Calculator', detail: 'Project bonus pools, performance incentives, and referral payouts computed automatically.' },
      { label: 'Multi-State PT Engine', detail: 'Professional Tax slabs per state applied correctly regardless of work location.' },
      { label: 'Leave & WFH Tracker', detail: 'Track work-from-home days, optional leaves, and comp-off accruals per policy.' },
      { label: 'ESS Mobile App', detail: 'Employees apply for leave, download payslips, and track payouts from their phones.' },
    ],
    stats: [
      { value: '100%', label: 'Remote Punch Accuracy' },
      { value: '< 2 min', label: 'Monthly Payroll Run' },
      { value: '6 States', label: 'PT Compliance Covered' },
      { value: '0 Errors', label: 'Statutory Filing Failures' },
    ],
    useCases: [
      'Remote GPS punch verification',
      'Flexible overtime registries',
      'Project payroll allowances',
      'Multi-state Professional Tax',
      'WFH & comp-off tracking',
    ],
    compliancePoints: [
      'EPF & ESI auto-deduction and filing',
      'Professional Tax slab-wise computation',
      'CLRA overtime rules',
      'Form 16 & TDS generation',
      'Shop & Establishment Act compliance',
    ],
  },
  {
    slug: 'manufacturing',
    code: 'MF',
    title: 'Manufacturing',
    accent: '#1E2A78',
    gradient: 'linear-gradient(135deg, #1E2A78 0%, #3d4fad 50%, #EEF2FF 100%)',
    icon: '🏭',
    tagline: 'High-volume factory payroll, contract labor registers, and shift automation.',
    overview:
      'Manufacturing plants operate across multiple shifts with contract and permanent workers, heavy statutory obligations under the Factories Act, and complex attendance systems tied to physical biometric hardware. Saptta integrates with ZKTeco and eSSL devices and automates everything from shift rosters to PF challan generation.',
    primarySolutionPath: '/hrms',
    primarySolutionLabel: 'Manufacturing HRMS',
    relatedProductPath: '/mobile-app',
    challenges: [
      { title: 'Biometric Integration', body: 'Direct sync with ZKTeco and eSSL punch machines eliminates manual attendance entry.' },
      { title: 'Contract Labor Management', body: 'Separate contractor registers, ESI cards, and salary disbursements with contractor-wise reports.' },
      { title: 'Factories Act Compliance', body: 'Overtime limits, weekly off rules, and Form B/C/D registers auto-generated for inspector audits.' },
      { title: 'Night Shift Allowances', body: 'Configurable night shift premiums, meal allowances, and transport reimbursements auto-computed.' },
    ],
    features: [
      { label: 'Biometric Hardware Sync', detail: 'Real-time integration with ZKTeco, eSSL, and Suprema fingerprint/face devices.' },
      { label: 'Shift Roster Automation', detail: 'Generate monthly shift rosters for hundreds of workers with auto-rotation logic.' },
      { label: 'Contract Labor Register', detail: 'CLRA Form XIII register, contractor-wise headcount, and ESI card generation.' },
      { label: 'Factories Act Registers', detail: 'Auto-generate Form B, C, D, and adult worker register for factory inspections.' },
      { label: 'Overtime Calculator', detail: 'Double-rate OT after 9 hours per Factories Act with real-time accrual tracking.' },
      { label: 'Bulk Payroll Processing', detail: 'Process payroll for 500+ workers in under 3 minutes with zero manual entries.' },
    ],
    stats: [
      { value: '500+', label: 'Workers Per Run' },
      { value: '< 3 min', label: 'Payroll Processing Time' },
      { value: '100%', label: 'Factories Act Compliance' },
      { value: '8+', label: 'Statutory Registers Auto-Generated' },
    ],
    useCases: [
      'Contract worker ESI card generation',
      'Late mark deduction calculations',
      'Factory overtime tracking',
      'Biometric device integration',
      'Statutory register auto-generation',
    ],
    compliancePoints: [
      'Factories Act overtime registers',
      'CLRA Form XIII contract labor register',
      'EPF & ESI challan generation',
      'Form B/C/D adult worker registers',
      'Night shift premium rules',
    ],
  },
  {
    slug: 'retail',
    code: 'RT',
    title: 'Retail & FMCG',
    accent: '#D69A2D',
    gradient: 'linear-gradient(135deg, #D69A2D 0%, #E2AD4A 40%, #FFF8EC 100%)',
    icon: '🛒',
    tagline: 'Multi-store payroll, sales commission ledgers, and part-time shift management.',
    overview:
      'Retail and FMCG companies manage large, geographically distributed workforces across stores and depots, with high attrition, part-time and contractual staff, and commission-linked pay structures. Saptta handles multi-branch HR, sales incentive calculations, and real-time store-level accounts — all from a single dashboard.',
    primarySolutionPath: '/accounts',
    primarySolutionLabel: 'Retail finance solution',
    relatedProductPath: '/hrms',
    challenges: [
      { title: 'Multi-Branch HR Sync', body: 'Centralized HR data across all store locations with branch-level payroll P&L visibility.' },
      { title: 'Sales Commission Calculation', body: 'Auto-calculate commissions on net sales, product categories, and individual targets.' },
      { title: 'Part-Time & Gig Workforce', body: 'Manage hourly workers, seasonal staff, and daily-wage employees alongside permanent staff.' },
      { title: 'High Attrition Handling', body: 'Fast onboarding, instant offer letter generation, and F&F settlement automation.' },
    ],
    features: [
      { label: 'Multi-Store Dashboard', detail: 'View headcount, attendance, and payroll spend per store in a single consolidated view.' },
      { label: 'Commission Ledger Engine', detail: 'Rule-based commission on gross/net sales, product mix, or individual targets with auto posting.' },
      { label: 'Part-Time Payroll Grid', detail: 'Configure hourly or daily-wage pay structures with pro-rata deduction of PF/ESI.' },
      { label: 'Fast Onboarding Portal', detail: 'Digital joining forms, offer letters, and document collection in under 10 minutes.' },
      { label: 'Inventory Asset Tracking', detail: 'Link store asset register to accounts module for auto depreciation and audit trail.' },
      { label: 'F&F Settlement Automation', detail: 'Instant full and final settlement with tax computation and bank payout initiation.' },
    ],
    stats: [
      { value: '50+', label: 'Stores Managed Centrally' },
      { value: '< 10 min', label: 'New Employee Onboarding' },
      { value: '100%', label: 'Commission Accuracy' },
      { value: '3x', label: 'Faster F&F Processing' },
    ],
    useCases: [
      'Multi-store personnel sync',
      'Sales commissions ledger',
      'Bulk payroll run automation',
      'Part-time shift management',
      'F&F settlement processing',
    ],
    compliancePoints: [
      'Shop & Establishment Act compliance',
      'Pro-rata PF/ESI for part-timers',
      'Gratuity and leave encashment calculations',
      'Minimum wages act monitoring',
      'Bonus Act compliance',
    ],
  },
  {
    slug: 'healthcare',
    code: 'HC',
    title: 'Healthcare',
    accent: '#2BB673',
    gradient: 'linear-gradient(135deg, #2BB673 0%, #34d399 42%, #ECFDF5 100%)',
    icon: '🏥',
    tagline: '24/7 duty rosters, rotating shift caps, and medical staff credential management.',
    overview:
      'Hospitals, clinics, and diagnostic chains run 24-hour operations with complex rotating rosters across departments, strict credentialing requirements, and compliance with Clinical Establishments Act norms. Saptta manages medical staff duty cycles, night shift allowances, and credential expiry tracking in one unified platform.',
    primarySolutionPath: '/hrms',
    primarySolutionLabel: 'Healthcare HRMS',
    relatedProductPath: '/mobile-app',
    challenges: [
      { title: '24/7 Roster Management', body: 'Auto-generate rotating duty rosters for doctors, nurses, and paramedics across all departments.' },
      { title: 'Credential & License Tracking', body: 'Track expiry of medical licenses, BLS/ACLS certifications, and auto-alert HR before lapse.' },
      { title: 'Night Shift Premium Calculation', body: 'Configure department-specific night shift allowances and statutory PF on enhanced wages.' },
      { title: 'Multi-Department Payroll', body: 'Separate pay grades per department with auto-allocation of department P&L in accounts.' },
    ],
    features: [
      { label: '24/7 Duty Roster Engine', detail: 'Rotating shift templates for ICU, OPD, emergency, and ward staff with gap-fill alerts.' },
      { label: 'Credential Expiry Tracker', detail: 'Dashboard view of expiring licenses, certifications, and training renewals per employee.' },
      { label: 'Night Shift Premium Rules', detail: 'Configurable premium rates per shift type with PF statutory computation on gross wages.' },
      { label: 'Department-Level P&L', detail: 'Cost centre payroll allocation across departments for granular accounts visibility.' },
      { label: 'Locum & Visiting Doctor Pay', detail: 'Sessional billing, visiting faculty payments, and TDS deduction on professional fees.' },
      { label: 'Compliance Documentation', detail: 'Clinical Establishments Act register, shift register, and overtime log for audit readiness.' },
    ],
    stats: [
      { value: '24/7', label: 'Roster Coverage' },
      { value: '100%', label: 'License Expiry Alerts' },
      { value: '< 5 min', label: 'Department Payroll Run' },
      { value: '0', label: 'Uncovered Shift Gaps' },
    ],
    useCases: [
      '24/7 duty roster management',
      'Night shift premium registers',
      'Compliance documentation audits',
      'Credential license tracking',
      'Locum doctor billing',
    ],
    compliancePoints: [
      'Clinical Establishments Act registers',
      'Overtime per Factories Act norms',
      'PF/ESI on enhanced night wages',
      'Professional tax for all states',
      'TDS on visiting doctor fees',
    ],
  },
  {
    slug: 'logistics',
    code: 'LG',
    title: 'Logistics',
    accent: '#2563EB',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #3b82f6 45%, #EAF1FF 100%)',
    icon: '🚚',
    tagline: 'Driver geofence attendance, route expense allowances, and fleet payroll automation.',
    overview:
      'Logistics and transport companies manage mobile workforces spread across routes and hubs with no fixed location. Attendance cannot rely on traditional punch machines, and pay structures mix fixed wages with route allowances, fuel reimbursements, and performance bonuses. Saptta solves this with GPS-based attendance and route-linked payroll.',
    primarySolutionPath: '/mobile-app',
    primarySolutionLabel: 'Mobile for fleet teams',
    relatedProductPath: '/hrms',
    challenges: [
      { title: 'GPS-Based Attendance', body: 'Geofenced punch-in for drivers and field staff verified against depot and route coordinates.' },
      { title: 'Route Allowance Automation', body: 'Pre-defined route-wise allowance tables auto-apply on each trip log for payroll.' },
      { title: 'Fleet Driver Compliance', body: 'Motor Transport Workers Act registers, license tracking, and working hours log.' },
      { title: 'Multi-Hub Payroll', body: 'Separate payroll runs per depot/hub with consolidated statutory filings at head office.' },
    ],
    features: [
      { label: 'GPS Geofence Punch', detail: 'Drivers punch in/out via mobile app verified against geofenced depot or route coordinates.' },
      { label: 'Route Allowance Engine', detail: 'Trip-wise allowance auto-calculation based on predefined route tables and trip logs.' },
      { label: 'Fleet Driver Register', detail: 'Motor Transport Workers Act compliant register with license expiry and working hours.' },
      { label: 'Multi-Hub Payroll', detail: 'Depot-wise payroll processing with consolidated PF/ESI filing at entity level.' },
      { label: 'Fuel & Expense Reimbursement', detail: 'Digital expense claims with approval workflow and auto-posting to accounts.' },
      { label: 'Performance Bonus Engine', detail: 'Trip completion, on-time delivery, and safety score-based incentive calculation.' },
    ],
    stats: [
      { value: '100%', label: 'GPS Punch Accuracy' },
      { value: '0', label: 'Manual Allowance Entries' },
      { value: '10+', label: 'Hubs Managed Centrally' },
      { value: '< 4 min', label: 'Fleet Payroll Processing' },
    ],
    useCases: [
      'Driver geolocation punch verification',
      'Route allowances ledger',
      'Fleet expense auditing',
      'Motor Transport Workers register',
      'Multi-hub payroll consolidation',
    ],
    compliancePoints: [
      'Motor Transport Workers Act registers',
      'Working hours and rest period log',
      'EPF & ESI for transport workers',
      'License and fitness certificate tracking',
      'Minimum wages for unskilled workers',
    ],
  },
  {
    slug: 'financial',
    code: 'FS',
    title: 'Financial Services',
    accent: '#4338CA',
    gradient: 'linear-gradient(135deg, #4338CA 0%, #6366f1 48%, #EEF2FF 100%)',
    icon: '📊',
    tagline: 'Commission payroll, multi-branch accounts, and regulatory compliance automation.',
    overview:
      'Banks, NBFCs, insurance agencies, and wealth management firms operate complex incentive structures, multi-branch hierarchies, and stringent compliance requirements. Saptta automates commission-linked payroll, integrates branch-level accounts, and generates audit-ready statutory reports.',
    primarySolutionPath: '/accounts',
    primarySolutionLabel: 'Finance for FS teams',
    relatedProductPath: '/hrms',
    challenges: [
      { title: 'Commission & Incentive Payroll', body: 'Multi-tier commission structures on products sold, policies renewed, and AUM managed.' },
      { title: 'Branch Accounts Integration', body: 'Real-time consolidation of branch P&L, suspense clearing, and inter-branch settlements.' },
      { title: 'Regulatory Audit Readiness', body: 'Auto-generated compliance reports for RBI, IRDA, and SEBI inspection requirements.' },
      { title: 'Target-Based Variable Pay', body: 'Monthly target tracking with automated variable pay release on achievement confirmation.' },
    ],
    features: [
      { label: 'Multi-Tier Commission Engine', detail: 'Configurable commission slabs per product, branch, role, and achievement band.' },
      { label: 'Branch P&L Consolidation', detail: 'Real-time branch-level accounts with automated inter-branch netting and consolidation.' },
      { label: 'Target Achievement Tracker', detail: 'Live MIS dashboard tracking individual and team targets with payroll trigger rules.' },
      { label: 'Regulatory Report Generator', detail: 'Pre-built RBI, IRDA, and MCA compliance report templates with one-click export.' },
      { label: 'TDS & Professional Tax Engine', detail: 'Accurate TDS computation on salary and commission with Form 16 generation.' },
      { label: 'Maker-Checker Payroll Workflow', detail: 'Dual-approval payroll processing compliant with internal financial controls.' },
    ],
    stats: [
      { value: '100%', label: 'Commission Calculation Accuracy' },
      { value: '< 5 min', label: 'Branch Payroll Consolidation' },
      { value: '20+', label: 'Regulatory Reports Pre-Built' },
      { value: '0', label: 'Audit Non-Compliance Flags' },
    ],
    useCases: [
      'Commission payroll systems',
      'Branch accounts integrations',
      'Compliance auditing files',
      'Target achievement tracking',
      'Maker-checker payroll workflow',
    ],
    compliancePoints: [
      'TDS on salary and commission income',
      'Professional Tax across states',
      'EPF & ESI statutory filing',
      'Form 16 and Form 24Q generation',
      'RBI and IRDA audit report templates',
    ],
  },
];

export default industries;
