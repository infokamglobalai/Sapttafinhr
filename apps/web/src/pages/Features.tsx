import { Table } from 'antd';
import CTABanner from '../components/shared/CTABanner';
import ScrollReveal from '../components/shared/ScrollReveal';
import HomeSectionHeader from '../components/shared/HomeSectionHeader';
import MarketingHero from '../components/marketing/MarketingHero';
import InteractiveShowcase from '../components/marketing/InteractiveShowcase';
import RelatedProducts from '../components/marketing/RelatedProducts';
import { featuresPageMeta } from '../data/product-pages-data';
import HighlightFeatureCard from '../components/marketing/HighlightFeatureCard';

const check = <span style={{ color: '#2BB673', fontWeight: 700, fontSize: 13 }}>✓</span>;
const cross = <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 13 }}>—</span>;

const featureCategories = [
  {
    category: 'HRMS — Employee & attendance',
    features: [
      { name: 'Employee master & org chart', s: true, p: true, e: true },
      { name: 'Mobile geofence attendance', s: true, p: true, e: true },
      { name: 'Biometric device integration', s: false, p: true, e: true },
      { name: 'Shift & roster management', s: false, p: true, e: true },
    ],
  },
  {
    category: 'HRMS — Payroll & compliance',
    features: [
      { name: 'Salary processing', s: true, p: true, e: true },
      { name: 'PF & ESI calculations', s: true, p: true, e: true },
      { name: 'TDS on salary', s: false, p: true, e: true },
      { name: 'Form 16 & statutory reports', s: false, p: true, e: true },
    ],
  },
  {
    category: 'Accounts — Billing & ledger',
    features: [
      { name: 'GST invoicing', s: true, p: true, e: true },
      { name: 'General ledger & journals', s: true, p: true, e: true },
      { name: 'Bank reconciliation', s: true, p: true, e: true },
      { name: 'Expense claims', s: false, p: true, e: true },
    ],
  },
  {
    category: 'Accounts — Tax & scale',
    features: [
      { name: 'GSTR-1 / GSTR-3B support', s: false, p: true, e: true },
      { name: 'Inventory & stock', s: false, p: true, e: true },
      { name: 'Multi-company accounts', s: false, p: false, e: true },
      { name: 'API & custom integrations', s: false, p: false, e: true },
    ],
  },
];

type TableRow = { key: string; name: React.ReactNode; s: React.ReactNode; p: React.ReactNode; e: React.ReactNode };

const columns = [
  { title: 'Capability', dataIndex: 'name', key: 'name', width: '45%' },
  { title: 'Starter', dataIndex: 's', key: 's', align: 'center' as const },
  { title: 'Professional', dataIndex: 'p', key: 'p', align: 'center' as const },
  { title: 'Enterprise', dataIndex: 'e', key: 'e', align: 'center' as const },
];

function buildRows(): TableRow[] {
  const rows: TableRow[] = [];
  featureCategories.forEach((cat) => {
    rows.push({
      key: cat.category,
      name: (
        <div className="marketing-table-category">{cat.category}</div>
      ),
      s: '',
      p: '',
      e: '',
    });
    cat.features.forEach((f) => {
      rows.push({
        key: f.name,
        name: <span className="marketing-table-feature">{f.name}</span>,
        s: f.s ? check : cross,
        p: f.p ? check : cross,
        e: f.e ? check : cross,
      });
    });
  });
  return rows;
}

export default function Features() {
  const { hero, showcase } = featuresPageMeta;

  return (
    <div className="marketing-page">
      <MarketingHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        titleHighlight={hero.titleHighlight}
        subtitle={hero.subtitle}
        stats={[
          { value: '50+', label: 'Core capabilities' },
          { value: '3', label: 'Plan tiers' },
          { value: 'AI', label: 'Built-in assistant' },
        ]}
        theme={hero.theme}
        gradient="linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FFFFFF 100%)"
        primaryLabel="View pricing"
        primaryTo="/pricing"
        secondaryLabel="Contact sales"
        secondaryTo="/contact"
        heroImageKey="featuresPlatform"
        heroImageVariant="device"
      />

      <InteractiveShowcase
        eyebrow={showcase.eyebrow}
        title={showcase.title}
        titleHighlight={showcase.titleHighlight}
        subtitle={showcase.subtitle}
        variant={showcase.variant}
        theme="indigo"
      />

      <HighlightFeatureCard
        title="Unified HR + Finance when you are ready"
        description="Start with one product and add the other — payroll posts to ledger, expenses flow to finance, one compliance core."
        ctaLabel="View pricing"
        ctaTo="/pricing"
      />

      <section className="marketing-section marketing-section--muted">
        <div className="marketing-section__inner marketing-section__inner--table">
          <ScrollReveal animation="fade-in-down">
            <HomeSectionHeader
              eyebrow="Comparison"
              title="Feature matrix"
              titleHighlight="by plan"
              subtitle="See what's included in Starter, Professional, and Enterprise deployments."
              theme="navy"
              maxWidth={560}
            />
          </ScrollReveal>
          <ScrollReveal animation="scale-in">
            <Table
              className="marketing-comparison-table"
              columns={columns}
              dataSource={buildRows()}
              pagination={false}
              size="middle"
              rowKey="key"
            />
          </ScrollReveal>
        </div>
      </section>

      <RelatedProducts currentPath="/features" />

      <CTABanner
        title="Find the right Saptta plan"
        subtitle="Talk to our team about HRMS, Accounts, or the complete bundle for your organization."
      />
    </div>
  );
}
