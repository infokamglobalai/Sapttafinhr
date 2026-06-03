import { useNavigate } from 'react-router-dom';
import ScrollReveal from '../shared/ScrollReveal';

interface HighlightFeatureCardProps {
  badge?: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
}

export default function HighlightFeatureCard({ badge = 'Platform highlight', title, description, ctaLabel, ctaTo }: HighlightFeatureCardProps) {
  const navigate = useNavigate();
  return (
    <section className="marketing-section marketing-section--white" style={{ paddingTop: 0, paddingBottom: 48 }}>
      <div className="marketing-section__inner">
        <ScrollReveal animation="fade-in-up">
          <div className="marketing-highlight-card">
            <div className="marketing-highlight-card__content">
              <span className="marketing-highlight-card__badge">{badge}</span>
              <h3 className="marketing-highlight-card__title">{title}</h3>
              <p className="marketing-highlight-card__desc">{description}</p>
            </div>
            <button type="button" className="marketing-highlight-card__btn" onClick={() => navigate(ctaTo)}>
              {ctaLabel}
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
