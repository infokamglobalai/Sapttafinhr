import CTABanner from '../shared/CTABanner';
import MarketingHero from './MarketingHero';
import InteractiveShowcase from './InteractiveShowcase';
import ModuleGrid from './ModuleGrid';
import WorkflowStrip from './WorkflowStrip';
import ComplianceSection from './ComplianceSection';
import RelatedProducts from './RelatedProducts';
import FeatureAccordion from './FeatureAccordion';
import HighlightFeatureCard from './HighlightFeatureCard';
import type { ProductPageConfig } from '../../data/product-pages-data';
import type { MarketingImageKey } from '../../data/marketing-images';
import type { ImageFrameVariant } from './MarketingImageFrame';
import { HeroVisual } from './ProductVisuals';

const productHeroMedia: Record<string, { key: MarketingImageKey; variant: ImageFrameVariant }> = {
  hrms: { key: 'productHrms', variant: 'device' },
  accounts: { key: 'productAccounts', variant: 'glass' },
  'mobile-app': { key: 'productMobile', variant: 'tilt' },
  products: { key: 'featuresPlatform', variant: 'split' },
  features: { key: 'featuresPlatform', variant: 'gradient-border' },
};

interface ProductPageShellProps {
  config: ProductPageConfig;
  currentPath: string;
}

export default function ProductPageShell({ config, currentPath }: ProductPageShellProps) {
  return (
    <div className="marketing-page">
      <MarketingHero
        eyebrow={config.hero.eyebrow}
        title={config.hero.title}
        titleHighlight={config.hero.titleHighlight}
        subtitle={config.hero.subtitle}
        stats={config.hero.stats}
        theme={config.theme}
        gradient={config.heroGradient}
        primaryLabel={config.hero.primaryLabel}
        primaryTo={config.hero.primaryTo}
        secondaryLabel={config.hero.secondaryLabel}
        secondaryTo={config.hero.secondaryTo}
        heroImageKey={productHeroMedia[config.slug]?.key}
        heroImageVariant={productHeroMedia[config.slug]?.variant}
        visual={productHeroMedia[config.slug] ? undefined : <HeroVisual variant={config.slug} />}
      />
      <InteractiveShowcase
        eyebrow={config.showcase.eyebrow}
        title={config.showcase.title}
        titleHighlight={config.showcase.titleHighlight}
        subtitle={config.showcase.subtitle}
        variant={config.showcase.variant}
        theme={config.theme}
      />
      {config.workflow ? <WorkflowStrip title={config.workflow.title} steps={config.workflow.steps} /> : null}
      {config.highlightCard ? (
        <HighlightFeatureCard
          title={config.highlightCard.title}
          description={config.highlightCard.description}
          ctaLabel={config.highlightCard.ctaLabel}
          ctaTo={config.highlightCard.ctaTo}
        />
      ) : null}
      <ModuleGrid
        eyebrow={config.modules.eyebrow}
        title={config.modules.title}
        titleHighlight={config.modules.titleHighlight}
        subtitle={config.modules.subtitle}
        items={config.modules.items}
        theme={config.theme}
        featuredCode={config.featuredModuleCode}
      />
      {config.accordion ? (
        <FeatureAccordion
          eyebrow={config.accordion.eyebrow}
          title={config.accordion.title}
          titleHighlight={config.accordion.titleHighlight}
          subtitle={config.accordion.subtitle}
          items={config.accordion.items}
          theme={config.theme}
        />
      ) : null}
      <ComplianceSection
        eyebrow={config.compliance.eyebrow}
        title={config.compliance.title}
        titleHighlight={config.compliance.titleHighlight}
        subtitle={config.compliance.subtitle}
        badges={config.compliance.badges}
        theme={config.theme}
      />
      <RelatedProducts currentPath={currentPath} />
      <CTABanner title={config.cta.title} subtitle={config.cta.subtitle} />
    </div>
  );
}
