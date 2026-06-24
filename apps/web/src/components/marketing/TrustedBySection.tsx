import { TRUSTED_LOGOS, type TrustedLogo } from '../../data/trusted-logos';

function TrustedLogoItem({ logo }: { logo: TrustedLogo }) {
  return (
    <div
      role="listitem"
      className="home-trusted-by__logo"
      style={{ ['--logo-brand' as string]: logo.color }}
    >
      <span className="home-trusted-by__mark" title={logo.name} aria-label={logo.name}>
        {logo.wordmark}
      </span>
    </div>
  );
}

export default function TrustedBySection() {
  const marqueeLogos = [...TRUSTED_LOGOS, ...TRUSTED_LOGOS];

  return (
    <section className="home-trusted-by" aria-labelledby="trusted-by-heading">
      <div className="home-trusted-by__inner">
        <p id="trusted-by-heading" className="home-trusted-by__label">
          Trusted by 1000+ growing SMBs across India · Rated <strong>4.9/5</strong> for HRMS &amp; Finance Software Bangalore
        </p>
        <div className="home-trusted-by__marquee" role="list" aria-label="Trusted partner logos">
          <div className="home-trusted-by__marquee-track">
            {marqueeLogos.map((logo, index) => (
              <TrustedLogoItem key={`${logo.id}-${index}`} logo={logo} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
