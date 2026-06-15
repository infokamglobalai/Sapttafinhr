import { Link } from 'react-router-dom';
import ScrollReveal from '../shared/ScrollReveal';
import { SAPTTA_PHONES } from '../../data/contact-info';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import useBreakpoint from '../../hooks/useBreakpoint';

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: { title: string; paragraphs?: string[]; list?: string[] }[];
}

interface LegalPageLayoutProps {
  eyebrow: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
  relatedLinks?: { label: string; to: string }[];
  /** Skip hero — use when page has its own header above */
  embedded?: boolean;
}

export default function LegalPageLayout({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  lastUpdated,
  sections,
  relatedLinks = [
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Security', to: '/security' },
    { label: 'Status', to: '/status' },
  ],
  embedded = false,
}: LegalPageLayoutProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div className={`legal-page${embedded ? ' legal-page--embedded' : ' marketing-page'}`}>
      {!embedded && (
        <section className="legal-page__hero">
          <div className="marketing-section__inner">
            <ScrollReveal animation="fade-in-down">
              <HomeSectionHeader
                eyebrow={eyebrow}
                title={title}
                titleHighlight={titleHighlight}
                subtitle={subtitle}
                theme="navy"
                align="left"
                isMobile={isMobile}
                maxWidth={720}
              />
              <p className="legal-page__meta">
                Last updated: <strong>{lastUpdated}</strong> · Saptta Technologies Pvt. Ltd., India
              </p>
            </ScrollReveal>
          </div>
        </section>
      )}

      <section className={`marketing-section marketing-section--white legal-page__body${embedded ? ' legal-page__body--embedded' : ''}`}>
        <div className="marketing-section__inner legal-page__grid">
          {!isMobile && (
            <aside className="legal-page__toc" aria-label="On this page">
              <p className="legal-page__toc-title">On this page</p>
              <nav>
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="legal-page__toc-link">
                    {s.title}
                  </a>
                ))}
              </nav>
            </aside>
          )}

          <article className="legal-page__content">
            {sections.map((section, idx) => (
              <ScrollReveal key={section.id} animation="fade-in-up" delay={idx * 40}>
                <section id={section.id} className="legal-section">
                  <h2 className="legal-section__title">{section.title}</h2>
                  {section.paragraphs?.map((p) => (
                    <p key={p.slice(0, 40)} className="legal-section__p">
                      {p}
                    </p>
                  ))}
                  {section.list ? (
                    <ul className="legal-section__list">
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.subsections?.map((sub) => (
                    <div key={sub.title} className="legal-section__sub">
                      <h3 className="legal-section__subtitle">{sub.title}</h3>
                      {sub.paragraphs?.map((p) => (
                        <p key={p.slice(0, 40)} className="legal-section__p">
                          {p}
                        </p>
                      ))}
                      {sub.list ? (
                        <ul className="legal-section__list">
                          {sub.list.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </section>
              </ScrollReveal>
            ))}

            <div className="legal-page__contact">
              <p>
                Questions? Contact{' '}
                <a href="mailto:legal@saptta.com">legal@saptta.com</a> or{' '}
                <a href="mailto:info@saptta.com">info@saptta.com</a>
                {' · WhatsApp '}
                {SAPTTA_PHONES.map((phone, i) => (
                  <span key={phone.tel}>
                    {i > 0 ? ' · ' : ''}
                    <a href={`https://wa.me/${phone.wa}`}>{phone.display}</a>
                  </span>
                ))}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="marketing-section marketing-section--muted legal-page__related">
        <div className="marketing-section__inner">
          <p className="legal-page__related-title">Related policies</p>
          <div className="legal-page__related-links">
            {relatedLinks.map((link) => (
              <Link key={link.to} to={link.to} className="home-section-badge legal-page__related-pill">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
