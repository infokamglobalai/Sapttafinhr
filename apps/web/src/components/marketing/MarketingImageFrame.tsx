import { useState } from 'react';
import {
  getMarketingImageAlt,
  getMarketingImageSrc,
  marketingImages,
  type MarketingImageKey,
} from '../../data/marketing-images';

export type ImageFrameVariant =
  | 'glass'
  | 'card'
  | 'arch'
  | 'tilt'
  | 'polaroid'
  | 'device'
  | 'fullbleed'
  | 'bento'
  | 'split'
  | 'float'
  | 'circle'
  | 'gradient-border';

export type ImageAspect = '16/10' | '4/3' | '1/1' | '21/9' | '3/4' | 'auto';

interface MarketingImageFrameProps {
  imageKey?: MarketingImageKey;
  src?: string;
  alt?: string;
  variant?: ImageFrameVariant;
  aspect?: ImageAspect;
  caption?: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
  className?: string;
  priority?: boolean;
  objectPosition?: string;
}

export default function MarketingImageFrame({
  imageKey,
  src: srcProp,
  alt: altProp,
  variant = 'card',
  aspect = '16/10',
  caption,
  overlayTitle,
  overlaySubtitle,
  className = '',
  priority = false,
  objectPosition = 'center',
}: MarketingImageFrameProps) {
  const asset = imageKey ? marketingImages[imageKey] : null;
  const primary = srcProp ?? asset?.local ?? (imageKey ? getMarketingImageSrc(imageKey) : '');
  const fallback = asset?.remote ?? primary;
  const alt = altProp ?? (imageKey ? getMarketingImageAlt(imageKey) : '');

  const [src, setSrc] = useState(primary);

  const handleError = () => {
    if (src !== fallback) setSrc(fallback);
  };

  const aspectClass = aspect !== 'auto' ? ` mkt-img--aspect-${aspect.replace('/', '-')}` : '';

  return (
    <figure
      className={`mkt-img mkt-img--${variant}${aspectClass}${className ? ` ${className}` : ''}`}
    >
      <div className="mkt-img__frame">
        {(overlayTitle || overlaySubtitle) && (
          <div className="mkt-img__overlay">
            {overlayTitle ? <span className="mkt-img__overlay-title">{overlayTitle}</span> : null}
            {overlaySubtitle ? <span className="mkt-img__overlay-sub">{overlaySubtitle}</span> : null}
          </div>
        )}
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={handleError}
          className="mkt-img__photo"
          style={{ objectPosition }}
        />
        {variant === 'device' && <div className="mkt-img__device-notch" aria-hidden />}
      </div>
      {caption ? <figcaption className="mkt-img__caption">{caption}</figcaption> : null}
    </figure>
  );
}
