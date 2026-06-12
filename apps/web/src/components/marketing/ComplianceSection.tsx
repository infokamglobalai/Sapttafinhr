import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import type { HomeSectionTheme } from '../shared/HomeSectionHeader';

interface ComplianceSectionProps {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  badges: string[];
  theme?: HomeSectionTheme;
  titleHighlightSameLine?: boolean;
}

export default function ComplianceSection({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  badges,
  theme = 'navy',
  titleHighlightSameLine = false,
}: ComplianceSectionProps) {
  return (
    <section className="marketing-section marketing-section--white">
      <div className="marketing-section__inner marketing-section__inner--narrow">
        <ScrollReveal animation="fade-in-down">
          <HomeSectionHeader
            eyebrow={eyebrow}
            title={title}
            titleHighlight={titleHighlight}
            titleHighlightSameLine={titleHighlightSameLine}
            subtitle={subtitle}
            theme={theme}
            maxWidth={titleHighlightSameLine ? 720 : 640}
          />
          <div className="home-section-pills" style={{ justifyContent: 'center', marginTop: -8 }}>
            {badges.map((badge) => (
              <span key={badge} className="home-section-badge">
                {badge}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
