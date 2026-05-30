import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useInView } from '../../hooks/useInView';

interface CTABannerProps {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export default function CTABanner({
  title = 'Ready to Transform Your Business?',
  subtitle = 'Join hundreds of companies using SAPTTA for smarter HR & Finance.',
  primaryLabel = 'Get Started Free',
  secondaryLabel = 'Book a Demo',
}: CTABannerProps) {
  const navigate = useNavigate();
  const { ref, inView } = useInView();

  return (
    <section style={{
      background: 'linear-gradient(135deg, rgba(255, 109, 0, 0.05) 0%, rgba(138, 43, 226, 0.02) 50%, #FFFFFF 100%)',
      padding: '80px 24px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      borderTop: '1px solid #EAECEF',
      borderBottom: '1px solid #EAECEF',
    }}>
      {/* Orbs */}
      <div className="orb-orange" style={{ width: 400, height: 400, top: -100, left: -80 }} />
      <div className="orb-purple" style={{ width: 300, height: 300, bottom: -80, right: -40 }} />
      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'radial-gradient(circle at 1px 1px, #FF6D00 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      <div ref={ref} style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{
          fontSize: '2rem', fontWeight: 800, color: '#0A1128', marginBottom: 14,
          opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(24px)',
          transition: 'all 0.6s ease',
        }}>
          {title}
        </h2>
        <p style={{
          fontSize: '1.05rem', color: 'rgba(10, 17, 40, 0.65)', marginBottom: 40,
          lineHeight: 1.7,
          opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(16px)',
          transition: 'all 0.6s 0.1s ease',
        }}>
          {subtitle}
        </p>
        <div style={{
          display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
          opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(16px)',
          transition: 'all 0.6s 0.2s ease',
        }}>
          <Button
            size="large"
            style={{
              background: 'linear-gradient(135deg, #FF9800, #FF6D00)',
              border: 'none', color: 'white', fontWeight: 700,
              height: 50, padding: '0 36px', borderRadius: 10, fontSize: 15,
              boxShadow: '0 8px 24px rgba(255, 109, 0, 0.25)',
            }}
            onClick={() => navigate('/contact')}
          >
            {primaryLabel}
          </Button>
          <Button
            size="large"
            style={{
              background: 'transparent', color: '#0A1128',
              border: '1.5px solid rgba(10, 17, 40, 0.25)',
              fontWeight: 600, height: 50, padding: '0 36px', borderRadius: 10, fontSize: 15,
            }}
            onClick={() => navigate('/contact')}
          >
            {secondaryLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
