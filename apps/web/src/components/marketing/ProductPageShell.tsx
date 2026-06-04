import { useNavigate } from 'react-router-dom';
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
import type { ImageAspect, ImageFrameVariant } from './MarketingImageFrame';
import { HeroVisual } from './ProductVisuals';

const productHeroMedia: Record<string, { key: MarketingImageKey; variant: ImageFrameVariant; aspect?: ImageAspect }> = {
  hrms: { key: 'productHrms', variant: 'plain' },
  accounts: { key: 'productAccounts', variant: 'plain' },
  'mobile-app': { key: 'productMobile', variant: 'plain', aspect: 'auto' },
  products: { key: 'productSuite', variant: 'plain' },
  features: { key: 'featuresPlatform', variant: 'gradient-border' },
};

interface ProductPageShellProps {
  config: ProductPageConfig;
  currentPath: string;
}

export default function ProductPageShell({ config, currentPath }: ProductPageShellProps) {
  const navigate = useNavigate();

  return (
    <div className={`marketing-page marketing-page--${config.slug}`}>
      <div className="marketing-page__back-bar">
        <div className="marketing-section__inner">
          <button
            type="button"
            className="marketing-back-link"
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>
      </div>
      <MarketingHero
        eyebrow={config.hero.eyebrow}
        title={config.hero.title}
        titleHighlight={config.hero.titleHighlight}
        titleHighlightSameLine
        subtitle={config.hero.subtitle}
        stats={config.hero.stats}
        theme="navy"
        gradient={config.heroGradient}
        primaryLabel={config.hero.primaryLabel}
        primaryTo={config.hero.primaryTo}
        secondaryLabel={config.hero.secondaryLabel}
        secondaryTo={config.hero.secondaryTo}
        heroImageKey={productHeroMedia[config.slug]?.key}
        heroImageVariant={productHeroMedia[config.slug]?.variant}
        heroImageAspect={productHeroMedia[config.slug]?.aspect}
        visual={productHeroMedia[config.slug] ? undefined : <HeroVisual variant={config.slug} />}
      />
      <InteractiveShowcase
        eyebrow={config.showcase.eyebrow}
        title={config.showcase.title}
        titleHighlight={config.showcase.titleHighlight}
        subtitle={config.showcase.subtitle}
        variant={config.showcase.variant}
        theme="navy"
      />
      {config.workflow ? <WorkflowStrip title={config.workflow.title} steps={config.workflow.steps} /> : null}
      {config.highlightCard ? (
        <HighlightFeatureCard
          badge={config.highlightCard.badge}
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
        theme="navy"
        featuredCode={config.featuredModuleCode}
      />
      {config.accordion ? (
        <FeatureAccordion
          eyebrow={config.accordion.eyebrow}
          title={config.accordion.title}
          titleHighlight={config.accordion.titleHighlight}
          subtitle={config.accordion.subtitle}
          items={config.accordion.items}
          theme="navy"
        />
      ) : null}
      <ComplianceSection
        eyebrow={config.compliance.eyebrow}
        title={config.compliance.title}
        titleHighlight={config.compliance.titleHighlight}
        titleHighlightSameLine
        subtitle={config.compliance.subtitle}
        badges={config.compliance.badges}
        theme="navy"
      />
      <RelatedProducts currentPath={currentPath} />
    </div>
  );
}
