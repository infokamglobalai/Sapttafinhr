/**
 * Sahayak icon — Saptta logo "S" mark extracted from brand logo.
 */
interface SahayakIconProps {
  size?: number;
  className?: string;
}

const SAHAYAK_S_MARK = '/images/sahayak-s-mark.png';

export default function SahayakIcon({ size = 24, className }: SahayakIconProps) {
  return (
    <img
      src={SAHAYAK_S_MARK}
      alt=""
      width={size}
      height={size}
      className={className}
      draggable={false}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
      aria-hidden
    />
  );
}
