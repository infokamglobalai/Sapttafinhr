import type { ReactNode } from 'react';

export type HomeSectionTheme = 'navy' | 'purple' | 'green' | 'amber' | 'indigo';

const themes: Record<
  HomeSectionTheme,
  { eyebrowColor: string; eyebrowBg: string; eyebrowBorder: string; accent: string }
> = {
  navy: {
    eyebrowColor: '#1E2A78',
    eyebrowBg: '#EEF2FF',
    eyebrowBorder: 'rgba(30, 42, 120, 0.12)',
    accent: 'linear-gradient(90deg, #1E2A78 0%, #4F5FD6 100%)',
  },
  purple: {
    eyebrowColor: '#6C3BFF',
    eyebrowBg: 'rgba(108, 59, 255, 0.1)',
    eyebrowBorder: 'rgba(108, 59, 255, 0.18)',
    accent: 'linear-gradient(90deg, #6C3BFF 0%, #9B5CF6 55%, #2BB673 100%)',
  },
  green: {
    eyebrowColor: '#15803D',
    eyebrowBg: '#ECFDF5',
    eyebrowBorder: 'rgba(21, 128, 61, 0.15)',
    accent: 'linear-gradient(90deg, #15803D 0%, #2BB673 100%)',
  },
  amber: {
    eyebrowColor: '#B45309',
    eyebrowBg: '#FFF8EC',
    eyebrowBorder: 'rgba(214, 154, 45, 0.25)',
    accent: 'linear-gradient(90deg, #C88A22 0%, #D69A2D 100%)',
  },
  indigo: {
    eyebrowColor: '#4338CA',
    eyebrowBg: '#EEF2FF',
    eyebrowBorder: 'rgba(79, 70, 229, 0.15)',
    accent: 'linear-gradient(90deg, #4338CA 0%, #6C3BFF 100%)',
  },
};

interface HomeSectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  titleHighlight?: ReactNode;
  subtitle?: string;
  align?: 'left' | 'center';
  theme?: HomeSectionTheme;
  isMobile?: boolean;
  className?: string;
  maxWidth?: number;
}

export default function HomeSectionHeader({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  align = 'center',
  theme = 'navy',
  isMobile = false,
  className = '',
  maxWidth = 640,
}: HomeSectionHeaderProps) {
  const t = themes[theme];
  const centered = align === 'center';

  return (
    <div
      className={`home-section-header${centered ? ' home-section-header--center' : ''} ${className}`.trim()}
      style={{ maxWidth: centered ? maxWidth : undefined, marginBottom: isMobile ? 28 : 40 }}
    >
      <span
        className="home-section-eyebrow"
        style={{
          color: t.eyebrowColor,
          background: t.eyebrowBg,
          borderColor: t.eyebrowBorder,
        }}
      >
        {eyebrow}
      </span>
      <h2 className="home-section-title" style={{ textAlign: centered ? 'center' : 'left' }}>
        {title}
        {titleHighlight ? (
          <>
            <br />
            <span className="home-section-title-highlight" style={{ backgroundImage: t.accent }}>
              {titleHighlight}
            </span>
          </>
        ) : null}
      </h2>
      {subtitle ? (
        <p
          className="home-section-subtitle scroll-text-glow"
          style={{
            textAlign: centered ? 'center' : 'left',
            marginLeft: centered ? 'auto' : 0,
            marginRight: centered ? 'auto' : 0,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
