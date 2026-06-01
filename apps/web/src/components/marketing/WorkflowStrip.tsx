import ScrollReveal from '../shared/ScrollReveal';

interface WorkflowStripProps {
  title: string;
  steps: { label: string; desc: string }[];
}

export default function WorkflowStrip({ title, steps }: WorkflowStripProps) {
  return (
    <section className="marketing-section marketing-section--white marketing-workflow">
      <div className="marketing-section__inner">
        <ScrollReveal animation="fade-in-up">
          <h3 className="marketing-workflow__title">{title}</h3>
          <div className="marketing-workflow__steps">
            {steps.map((step, i) => (
              <div key={step.label} className="marketing-workflow__step">
                <div className="marketing-workflow__num">{i + 1}</div>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
