import type { IndustryData } from '../../data/industries-data';
import { industryImageKey } from '../../data/marketing-images';
import type { ImageFrameVariant } from './MarketingImageFrame';
import MarketingImageFrame from './MarketingImageFrame';

const cardFrames: ImageFrameVariant[] = ['arch', 'tilt', 'split', 'glass', 'bento', 'gradient-border'];

export default function IndustryHeroVisual({
  industry,
  large = false,
  cardIndex = 0,
}: {
  industry: IndustryData;
  large?: boolean;
  cardIndex?: number;
}) {
  const imageKey = industryImageKey[industry.slug];
  const variant = large ? 'arch' : cardFrames[cardIndex % cardFrames.length];

  if (!imageKey) {
    return (
      <div className="industry-visual industry-visual--fallback" style={{ background: industry.gradient }}>
        <span className="industry-visual__icon">{industry.icon}</span>
      </div>
    );
  }

  return (
    <div className="industry-visual industry-visual--photo">
      <MarketingImageFrame
        imageKey={imageKey}
        variant={variant}
        aspect={large ? '21/9' : '16/10'}
        objectPosition="center"
      />
      <span className="industry-visual__badge" aria-hidden>
        {industry.icon}
      </span>
      {large ? (
        <div className="industry-visual__meta">
          <div className="industry-visual__meta-title">{industry.title}</div>
        </div>
      ) : null}
    </div>
  );
}
