import type { ReactNode } from 'react';

export type HomeSectionTheme = 'navy' | 'purple' | 'green' | 'amber' | 'indigo';

const themes: Record<
  HomeSectionTheme,
  { eyebrowColor: string; eyebrowBg: string; eyebrowBorder: string; accent: string }
> = {
  navy: {
    eyebrowColor: 'var(--color-secondary)',
    eyebrowBg: 'rgba(30, 42, 120, 0.08)',
    eyebrowBorder: 'rgba(30, 42, 120, 0.14)',
    accent: 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
  },
  purple: {
    eyebrowColor: 'var(--color-primary)',
    eyebrowBg: 'rgba(255, 109, 0, 0.10)',
    eyebrowBorder: 'rgba(255, 109, 0, 0.20)',
    accent: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
  },
  green: {
    eyebrowColor: 'var(--color-secondary)',
    eyebrowBg: 'rgba(30, 42, 120, 0.08)',
    eyebrowBorder: 'rgba(30, 42, 120, 0.14)',
    accent: 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
  },
  amber: {
    eyebrowColor: 'var(--color-primary)',
    eyebrowBg: 'rgba(255, 109, 0, 0.10)',
    eyebrowBorder: 'rgba(255, 109, 0, 0.20)',
    accent: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
  },
  indigo: {
    eyebrowColor: 'var(--color-secondary)',
    eyebrowBg: 'rgba(30, 42, 120, 0.08)',
    eyebrowBorder: 'rgba(30, 42, 120, 0.14)',
    accent: 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
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
  /** When true, title and titleHighlight render on one line (default: highlight on second line) */
  titleHighlightSameLine?: boolean;
  /** Optional id for the section heading (accessibility) */
  headingId?: string;
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
  titleHighlightSameLine = false,
  headingId,
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
      <h2
        id={headingId}
        className="home-section-title"
        style={{ textAlign: centered ? 'center' : 'left' }}
      >
        {title}
        {titleHighlight ? (
          titleHighlightSameLine ? (
            <>
              {' '}
              <span className="home-section-title-highlight" style={{ backgroundImage: t.accent }}>
                {titleHighlight}
              </span>
            </>
          ) : (
            <>
              <br />
              <span className="home-section-title-highlight" style={{ backgroundImage: t.accent }}>
                {titleHighlight}
              </span>
            </>
          )
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
