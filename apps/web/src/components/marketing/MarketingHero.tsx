import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import type { HomeSectionTheme } from '../shared/HomeSectionHeader';
import type { ProductStat } from '../../data/product-pages-data';
import type { MarketingImageKey } from '../../data/marketing-images';
import type { ImageAspect, ImageFrameVariant } from './MarketingImageFrame';
import MarketingImageFrame from './MarketingImageFrame';
import useBreakpoint from '../../hooks/useBreakpoint';

interface MarketingHeroProps {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  stats: ProductStat[];
  theme?: HomeSectionTheme;
  gradient: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel: string;
  secondaryTo: string;
  visual?: React.ReactNode;
  heroImageKey?: MarketingImageKey;
  heroImageVariant?: ImageFrameVariant;
  heroImageAspect?: ImageAspect;
  titleHighlightSameLine?: boolean;
}

export default function MarketingHero({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  stats,
  theme = 'navy',
  gradient,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
  visual,
  heroImageKey,
  heroImageVariant = 'device',
  heroImageAspect = '16/10',
  titleHighlightSameLine,
}: MarketingHeroProps) {
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useBreakpoint();

  const goTo = (to: string) => {
    if (to.startsWith('#')) {
      document.querySelector(to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(to);
  };
  const heroVisual =
    visual ??
    (heroImageKey ? (
      <MarketingImageFrame imageKey={heroImageKey} variant={heroImageVariant} aspect={heroImageAspect} priority />
    ) : null);

  return (
    <section className={`marketing-hero${!isDesktop && heroVisual ? ' marketing-hero--stacked' : ''}`} style={{ background: gradient }}>
      <div className="marketing-hero__orb marketing-hero__orb--1" />
      <div className="marketing-hero__orb marketing-hero__orb--2" />
      <div className={`marketing-hero__inner${heroVisual ? ' marketing-hero__inner--split' : ''}`}>

        <ScrollReveal animation="fade-in-left">
          <div className="marketing-hero__copy">
            <HomeSectionHeader
              eyebrow={eyebrow}
              title={title}
              titleHighlight={titleHighlight}
              titleHighlightSameLine={titleHighlightSameLine}
              subtitle={subtitle}
              align="left"
              theme={theme}
              isMobile={isMobile}
              maxWidth={titleHighlightSameLine ? 640 : 520}
            />
            <div className="marketing-hero__actions">
              <Button
                type="primary"
                size="large"
                className="marketing-btn marketing-btn--primary"
                onClick={() => goTo(primaryTo)}
              >
                {primaryLabel}
              </Button>
              <Button size="large" className="marketing-btn marketing-btn--ghost" onClick={() => goTo(secondaryTo)}>
                {secondaryLabel}
              </Button>
            </div>
            <div className="marketing-stats">
              {stats.map((s) => (
                <div key={s.label} className="marketing-stat">
                  <div className="marketing-stat__value">{s.value}</div>
                  <div className="marketing-stat__label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
        {heroVisual ? (
          <ScrollReveal animation="fade-in-right" delay={120}>
            <div
              className={`marketing-hero__visual${heroImageAspect === '3/4' || heroImageVariant === 'phone' || (heroImageVariant === 'plain' && heroImageAspect === 'auto') ? ' marketing-hero__visual--portrait' : ''}`}
            >
              {heroVisual}
            </div>
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  );
}
