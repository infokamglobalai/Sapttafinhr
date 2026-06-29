import type { LegalSection } from '../components/legal/LegalPageLayout';

export const LEGAL_LAST_UPDATED = '28 May 2026';

export const privacySections: LegalSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    paragraphs: [
      'Saptta Technologies Pvt. Ltd. ("Saptta", "we", "us") operates the Saptta website and cloud platform for HRMS, payroll, accounting, and compliance services in India.',
      'This Privacy Policy explains how we collect, use, store, and protect personal information when you visit our website, request a demo, subscribe to our products, or use our applications.',
      'By using Saptta, you agree to this policy. If you do not agree, please do not use our services.',
    ],
  },
  {
    id: 'information-we-collect',
    title: '2. Information we collect',
    subsections: [
      {
        title: 'Information you provide',
        list: [
          'Account details: name, work email, phone, company name, job role',
          'Billing and subscription information',
          'Employee and payroll data uploaded by your organisation (as a data processor)',
          'Support messages, demo requests, and feedback',
        ],
      },
      {
        title: 'Information collected automatically',
        list: [
          'Device and browser type, IP address, and general location (city/region)',
          'Pages visited, referral URLs, and interaction with our marketing site',
          'Log data from authenticated product sessions (timestamps, actions for security)',
          'Cookies and similar technologies (see Cookies section below)',
        ],
      },
    ],
  },
  {
    id: 'how-we-use',
    title: '3. How we use your information',
    list: [
      'Provide, maintain, and improve Saptta HRMS, Accounts, and Mobile products',
      'Process payroll, attendance, GST, and statutory compliance on your instructions',
      'Authenticate users, prevent fraud, and enforce security controls',
      'Send service announcements, billing notices, and support responses',
      'Analyse aggregated usage to improve performance and user experience',
      'Comply with legal obligations under Indian law',
    ],
  },
  {
    id: 'legal-basis',
    title: '4. Legal basis & your rights',
    paragraphs: [
      'We process data based on contract performance (delivering subscribed services), legitimate interests (security, product improvement), consent (marketing cookies and optional communications), and legal compliance.',
      'Depending on applicable law, you may have rights to access, correct, delete, restrict, or port your personal data, and to withdraw consent where processing is consent-based.',
      'Organisation admins control employee data in Saptta; employees should contact their employer first. You may also contact us at privacy@saptta.com.',
    ],
  },
  {
    id: 'sharing',
    title: '5. Sharing & subprocessors',
    paragraphs: [
      'We do not sell personal information. We share data only with trusted service providers who help us operate Saptta (hosting, email, payment gateways, analytics where permitted), under contractual confidentiality and security obligations.',
      'We may disclose information if required by law, court order, or to protect rights, safety, and integrity of our platform.',
    ],
    list: [
      'Cloud infrastructure providers (India or approved regions)',
      'Payment processors (e.g. Razorpay) for subscriptions',
      'Email and notification services',
      'Biometric device integrations (e.g. ZKTeco) when you enable them',
    ],
  },
  {
    id: 'retention',
    title: '6. Data retention',
    paragraphs: [
      'We retain account and billing records for as long as your subscription is active and for a reasonable period thereafter as required for tax, audit, and legal purposes.',
      'Customer-uploaded HR and finance data is retained per your organisation settings and applicable statutory requirements (e.g. payroll records under Indian labour laws).',
      'Marketing site analytics may be retained in aggregated form after identifiers are removed.',
    ],
  },
  {
    id: 'security',
    title: '7. Security',
    paragraphs: [
      'We implement technical and organisational measures including encryption in transit (TLS), role-based access control, audit logs, and regular security reviews.',
      'See our Security page for more detail. No method of transmission over the internet is 100% secure; we encourage strong passwords and MFA where available.',
    ],
  },
  {
    id: 'cookies',
    title: '8. Cookies & tracking',
    paragraphs: [
      'We use cookies and similar technologies to operate the website, remember preferences, and—only with your consent—understand how visitors use our marketing pages.',
    ],
    subsections: [
      {
        title: 'Types of cookies',
        list: [
          'Strictly necessary: session, authentication, security, cookie consent choice (cannot be disabled)',
          'Functional: language preference, UI settings',
          'Analytics: anonymised visit statistics (optional, requires consent)',
          'Marketing: campaign attribution (optional, requires consent)',
        ],
      },
      {
        title: 'Managing cookies',
        paragraphs: [
          'Use the cookie banner on first visit or clear cookies in your browser. Rejecting non-essential cookies does not block access to essential site features.',
          'Authenticated product areas may require necessary cookies to function.',
        ],
      },
    ],
  },
  {
    id: 'international',
    title: '9. International transfers',
    paragraphs: [
      'Saptta is built for Indian businesses. Primary data processing is intended within India. If we use infrastructure outside India, we apply appropriate safeguards consistent with applicable regulations.',
    ],
  },
  {
    id: 'children',
    title: '10. Children',
    paragraphs: [
      'Saptta is a business-to-business platform and is not directed at individuals under 18. We do not knowingly collect personal information from children.',
    ],
  },
  {
    id: 'changes',
    title: '11. Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will post the revised version on this page with an updated "Last updated" date. Material changes may be notified via email or in-product notice.',
    ],
  },
  {
    id: 'contact',
    title: '12. Contact us',
    paragraphs: [
      'Data protection enquiries: privacy@saptta.com',
      'General support: info@saptta.com',
      'Saptta Technologies Pvt. Ltd., India',
    ],
  },
];

export const termsSections: LegalSection[] = [
  {
    id: 'agreement',
    title: '1. Agreement to terms',
    paragraphs: [
      'These Terms of Service ("Terms") govern access to the Saptta website, applications, and subscription services provided by Saptta Technologies Pvt. Ltd. ("Saptta").',
      'By creating an account, clicking "I agree", or using our services, you accept these Terms on behalf of yourself or the organisation you represent.',
    ],
  },
  {
    id: 'services',
    title: '2. Our services',
    paragraphs: [
      'Saptta offers modular cloud software including HRMS (attendance, leave, payroll, recruitment), Accounts (invoicing, ledger, GST), and Mobile access. Features vary by plan as described on our Pricing page.',
      'We may update, add, or discontinue features with reasonable notice where practicable. Beta or AI-assisted features may be provided "as is" with additional limitations described in-product.',
    ],
  },
  {
    id: 'accounts',
    title: '3. Accounts & eligibility',
    list: [
      'You must provide accurate registration information and keep credentials confidential',
      'Organisation admins are responsible for users they invite and data they upload',
      'You must be at least 18 and authorised to bind your organisation',
      'One account may not be shared across unrelated entities without our consent',
    ],
  },
  {
    id: 'subscription',
    title: '4. Subscriptions & payment',
    paragraphs: [
      'Paid plans are billed monthly or annually in INR unless otherwise agreed. Fees are non-refundable except as required by law or stated in your order form.',
      'Access to paid features begins once your subscription is activated by payment; new workspaces remain pending until the first payment is received. You can cancel anytime to stop future renewals. We may change pricing with notice before renewal.',
      'Failure to pay may result in suspension of access after reasonable notice.',
    ],
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable use',
    list: [
      'Do not violate laws, infringe intellectual property, or upload malicious code',
      'Do not attempt unauthorised access, scraping, or disruption of our systems',
      'Do not use Saptta to store unlawful content or harass others',
      'Do not resell or sublicense the platform without written permission',
      'Comply with Indian statutory requirements when processing employee and tax data',
    ],
  },
  {
    id: 'customer-data',
    title: '6. Customer data',
    paragraphs: [
      'You retain ownership of data you submit. You grant Saptta a limited licence to host, process, and display that data solely to provide the services.',
      'You are responsible for obtaining necessary consents from employees and ensuring accuracy of payroll and tax information.',
      'Our Privacy Policy describes how we handle personal data.',
    ],
  },
  {
    id: 'ip',
    title: '7. Intellectual property',
    paragraphs: [
      'Saptta, its logos, software, documentation, and marketing content are owned by Saptta or its licensors. No rights are granted except as expressly stated in these Terms.',
      'Feedback you provide may be used to improve our products without obligation to you.',
    ],
  },
  {
    id: 'confidentiality',
    title: '8. Confidentiality',
    paragraphs: [
      'Each party will protect the other\'s confidential information with reasonable care and use it only for the purpose of the engagement. This does not apply to information that is public, independently developed, or rightfully received from a third party.',
    ],
  },
  {
    id: 'warranty',
    title: '9. Disclaimers',
    paragraphs: [
      'Services are provided on an "as is" and "as available" basis. While we strive for accuracy in payroll and compliance calculations, you are responsible for verifying statutory filings with qualified professionals.',
      'Saptta is not a law firm, CA firm, or licensed payroll bureau; our tools assist your processes but do not replace professional advice.',
    ],
  },
  {
    id: 'liability',
    title: '10. Limitation of liability',
    paragraphs: [
      'To the maximum extent permitted by law, Saptta shall not be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill.',
      'Our total liability for claims arising from these Terms or the services shall not exceed the fees paid by you in the twelve (12) months preceding the claim.',
    ],
  },
  {
    id: 'indemnity',
    title: '11. Indemnification',
    paragraphs: [
      'You agree to indemnify Saptta against claims arising from your misuse of the services, violation of these Terms, or infringement arising from your data or content.',
    ],
  },
  {
    id: 'termination',
    title: '12. Termination',
    paragraphs: [
      'Either party may terminate per the subscription agreement. You may export data before closure where export features are available.',
      'We may suspend or terminate access immediately for material breach, non-payment, or legal requirement. Provisions that by nature should survive will survive termination.',
    ],
  },
  {
    id: 'governing-law',
    title: '13. Governing law & disputes',
    paragraphs: [
      'These Terms are governed by the laws of India. Courts in Bengaluru, Karnataka shall have exclusive jurisdiction, subject to mandatory consumer protections where applicable.',
      'We encourage resolving disputes informally by contacting legal@saptta.com before formal proceedings.',
    ],
  },
  {
    id: 'misc',
    title: '14. General',
    list: [
      'These Terms constitute the entire agreement regarding the website and standard SaaS services',
      'If any provision is unenforceable, the remainder stays in effect',
      'Failure to enforce a right is not a waiver',
      'You may not assign these Terms without consent; Saptta may assign in connection with a merger or sale',
    ],
  },
];

export const securitySections: LegalSection[] = [
  {
    id: 'overview',
    title: 'Security at Saptta',
    paragraphs: [
      'Protecting HR, payroll, and financial data is central to Saptta. We combine infrastructure safeguards, application controls, and operational practices designed for Indian businesses handling sensitive employee and statutory information.',
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure & encryption',
    list: [
      'TLS 1.2+ encryption for data in transit across web and API connections',
      'Encryption at rest for databases and backups on cloud infrastructure',
      'Network segmentation and firewall controls on production environments',
      'Regular patching and vulnerability management on servers and dependencies',
      'Automated backups with tested restore procedures',
    ],
  },
  {
    id: 'access',
    title: 'Access control',
    list: [
      'Role-based access control (RBAC) with least-privilege defaults',
      'Organisation-level data isolation between customer tenants',
      'Strong password policies and support for secure session management',
      'Administrative actions logged for audit and investigation',
      'Employee self-service limited to own records and approved workflows',
    ],
  },
  {
    id: 'application',
    title: 'Application security',
    list: [
      'Secure development practices and code review for critical changes',
      'Protection against common web vulnerabilities (OWASP-aligned controls)',
      'Rate limiting and monitoring for abnormal authentication patterns',
      'Separation of production and non-production environments',
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance & statutory data',
    paragraphs: [
      'Saptta is designed to support Indian compliance workflows including PF, ESI, TDS, GST, and related registers. Compliance outcomes depend on correct configuration and data entered by your organisation.',
    ],
    list: [
      'Audit trails for payroll runs, approvals, and key configuration changes',
      'Configurable retention aligned with your policies and legal requirements',
      'Data export capabilities for migration and record-keeping',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & data handling',
    paragraphs: [
      'We process personal data as described in our Privacy Policy. Customer organisations act as controllers for employee data; Saptta acts as a processor when handling that data on your instructions.',
    ],
  },
  {
    id: 'incidents',
    title: 'Incident response',
    paragraphs: [
      'We maintain procedures to detect, contain, and remediate security incidents. Affected customers will be notified without undue delay when their data is likely impacted, in line with applicable law.',
      'Report security concerns to security@saptta.com. Please include steps to reproduce and avoid public disclosure until we have assessed the issue.',
    ],
  },
  {
    id: 'your-role',
    title: 'Your responsibilities',
    list: [
      'Use strong, unique passwords and revoke access for departing staff promptly',
      'Configure roles and approvals appropriate to your organisation size',
      'Keep integration credentials (payment, biometric devices) secure',
      'Review audit logs and access permissions periodically',
    ],
  },
];

export interface StatusComponent {
  name: string;
  status: 'operational' | 'degraded' | 'maintenance' | 'outage';
  description: string;
}

export const statusComponents: StatusComponent[] = [
  { name: 'Website & marketing', status: 'operational', description: 'saptta.com and public pages' },
  { name: 'Saptta HRMS', status: 'operational', description: 'Attendance, leave, payroll, HR modules' },
  { name: 'Saptta Accounts', status: 'operational', description: 'Invoicing, ledger, GST workflows' },
  { name: 'Mobile app services', status: 'operational', description: 'Geofence punch, ESS APIs' },
  { name: 'Authentication & API', status: 'operational', description: 'Login, sessions, integrations' },
  { name: 'Notifications & email', status: 'operational', description: 'Alerts, payslip delivery' },
];

export const statusIncidents: { date: string; title: string; status: 'resolved' | 'investigating'; summary: string }[] = [
  {
    date: '12 May 2026',
    title: 'Scheduled database maintenance',
    status: 'resolved',
    summary: 'Brief read-only window (4:00–4:30 AM IST). No data loss.',
  },
  {
    date: '3 Apr 2026',
    title: 'Elevated API latency',
    status: 'resolved',
    summary: 'Resolved within 47 minutes. Root cause: traffic spike during payroll window.',
  },
];
