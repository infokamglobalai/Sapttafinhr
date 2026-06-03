import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import ScrollReveal from '../shared/ScrollReveal';
import HomeSectionHeader from '../shared/HomeSectionHeader';
import useBreakpoint from '../../hooks/useBreakpoint';

const ROWS = [
  { feature: 'HRMS', saptta: true, traditional: false },
  { feature: 'Finance', saptta: true, traditional: false },
  { feature: 'Payroll', saptta: true, traditional: false },
  { feature: 'Compliance', saptta: true, traditional: false },
  { feature: 'Single login', saptta: true, traditional: false },
  { feature: 'Unified reporting', saptta: true, traditional: false },
] as const;

const HIGHLIGHTS = [
  { label: 'Modules in one stack', value: '6' },
  { label: 'Indian compliance', value: 'Built-in' },
  { label: 'Go-live timeline', value: '< 1 week' },
] as const;

function StatusIcon({ ok, variant }: { ok: boolean; variant: 'saptta' | 'other' }) {
  const className = `home-compare__status home-compare__status--${ok ? 'yes' : 'no'} home-compare__status--${variant}`;
  return (
    <span className={className} aria-hidden>
      {ok ? <CheckOutlined /> : <CloseOutlined />}
    </span>
  );
}

export default function WhySapttaComparison() {
  const { isMobile } = useBreakpoint();

  return (
    <section className="home-compare" aria-label="Why businesses choose SAPTTA comparison">
      <div className="home-compare__inner">
        <div className="home-compare__layout">
          <div className="home-compare__intro">
            <ScrollReveal animation="fade-in-up">
              <HomeSectionHeader
                eyebrow="Why SAPTTA"
                title="Why Businesses Choose"
                titleHighlight="SAPTTA"
                titleHighlightSameLine
                subtitle="One platform replaces disconnected HR, payroll, and finance tools — with compliance built in from day one."
                theme="navy"
                align="left"
                isMobile={isMobile}
                className="home-compare__header"
              />
            </ScrollReveal>

            <ScrollReveal animation="fade-in-up" delay={40}>
              <div className="home-compare__metrics" role="list">
                {HIGHLIGHTS.map((item) => (
                  <div key={item.label} className="home-compare__metric" role="listitem">
                    <span className="home-compare__metric-value">{item.value}</span>
                    <span className="home-compare__metric-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-in-up" delay={80}>
            <div className="home-compare__board" role="table" aria-label="SAPTTA vs other tools">
            <div className="home-compare__board-head" role="row">
              <div className="home-compare__board-cell home-compare__board-cell--feature" role="columnheader">
                Capability
              </div>
              <div
                className="home-compare__board-cell home-compare__board-cell--saptta"
                role="columnheader"
              >
                <span className="home-compare__brand">SAPTTA</span>
                <span className="home-compare__badge">Recommended</span>
              </div>
              <div className="home-compare__board-cell home-compare__board-cell--other" role="columnheader">
                Others
              </div>
            </div>

            {ROWS.map((row) => (
              <div key={row.feature} className="home-compare__board-row" role="row">
                <div className="home-compare__board-cell home-compare__board-cell--feature" role="rowheader">
                  {row.feature}
                </div>
                <div className="home-compare__board-cell home-compare__board-cell--saptta" role="cell">
                  <StatusIcon ok={row.saptta} variant="saptta" />
                  <span className="sr-only">{row.saptta ? 'Included' : 'Not included'}</span>
                </div>
                <div className="home-compare__board-cell home-compare__board-cell--other" role="cell">
                  <StatusIcon ok={row.traditional} variant="other" />
                  <span className="sr-only">{row.traditional ? 'Included' : 'Not included'}</span>
                </div>
              </div>
            ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
