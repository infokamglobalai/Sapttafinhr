import { useInViewMulti } from '../../hooks/useInView';
import ScrollReveal from '../shared/ScrollReveal';
import { TRUSTED_LOGOS } from '../../data/trusted-logos';

const DISPLAY_LOGOS = TRUSTED_LOGOS.slice(0, 6);

export default function ProductsTrustStrip() {
  const { ref, visibleItems } = useInViewMulti(DISPLAY_LOGOS.length, 0.2);

  return (
    <section className="products-trust-strip" aria-label="Trusted by growing teams">
      <div className="products-trust-strip__inner">
        <ScrollReveal animation="fade-in-up">
          <div className="products-trust-strip__rating" aria-label="4.9 out of 5 customer satisfaction">
            <span className="products-trust-strip__stars" aria-hidden>
              ★★★★★
            </span>
            <span className="products-trust-strip__score">4.9/5</span>
            <span className="products-trust-strip__score-label">Customer satisfaction</span>
          </div>
          <p className="products-trust-strip__title">Trusted by growing teams across India</p>
          <div ref={ref} className="products-trust-strip__logos" role="list">
            {DISPLAY_LOGOS.map((logo, index) => (
              <div
                key={logo.id}
                role="listitem"
                className={`products-trust-strip__logo${visibleItems.has(index) ? ' products-trust-strip__logo--visible' : ''}`}
                style={{
                  ['--logo-brand' as string]: logo.color,
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                <span className="products-trust-strip__mark" title={logo.name} aria-label={logo.name}>
                  {logo.wordmark}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
