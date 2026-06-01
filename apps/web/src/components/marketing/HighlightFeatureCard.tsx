import { useNavigate } from 'react-router-dom';
import ScrollReveal from '../shared/ScrollReveal';

interface HighlightFeatureCardProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
}

export default function HighlightFeatureCard({ title, description, ctaLabel, ctaTo }: HighlightFeatureCardProps) {
  const navigate = useNavigate();
  return (
    <section className="marketing-section marketing-section--white" style={{ paddingTop: 0, paddingBottom: 48 }}>
      <div className="marketing-section__inner">
        <ScrollReveal animation="fade-in-up">
          <div className="marketing-highlight-card">
            <div className="marketing-highlight-card__icon">◫</div>
            <div>
              <h3 className="marketing-highlight-card__title">{title}</h3>
              <p className="marketing-highlight-card__desc">{description}</p>
              <button type="button" className="marketing-highlight-card__btn" onClick={() => navigate(ctaTo)}>
                {ctaLabel} →
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
