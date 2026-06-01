import ScrollReveal from '../shared/ScrollReveal';

interface Stat {
  value: string;
  label: string;
  icon?: string;
}

export default function MarketingStatsRow({ stats }: { stats: Stat[] }) {
  return (
    <section className="marketing-stats-row">
      <div className="marketing-section__inner">
        <ScrollReveal animation="fade-in-up">
          <div className="marketing-stats-row__grid">
            {stats.map((s) => (
              <div key={s.label} className="marketing-stats-row__item">
                {s.icon ? <span className="marketing-stats-row__icon">{s.icon}</span> : null}
                <div className="marketing-stat__value">{s.value}</div>
                <div className="marketing-stat__label">{s.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
