/** Animated SVG/CSS hero illustrations per product */

import MarketingImageFrame from './MarketingImageFrame';
import type { MarketingImageKey } from '../../data/marketing-images';

export function HeroVisual({ variant }: { variant: string }) {
  if (variant === 'hrms') return <HrmsHeroVisual />;
  if (variant === 'accounts') return <FinanceHeroVisual />;
  if (variant === 'mobile-app') return <MobileHeroVisual />;
  return <PlatformHeroVisual />;
}

function HrmsHeroVisual() {
  return (
    <div className="marketing-visual marketing-visual--hrms" aria-hidden>
      <div className="marketing-visual__card marketing-visual__card--float">
        <div className="marketing-visual__row"><span>Employees</span><strong>324</strong></div>
        <div className="marketing-visual__bar" style={{ width: '78%', background: '#1E2A78' }} />
      </div>
      <div className="marketing-visual__card marketing-visual__card--float-delay">
        <div className="marketing-visual__row"><span>Attendance today</span><strong>98%</strong></div>
        <div className="marketing-visual__bar" style={{ width: '92%', background: '#FF6D00' }} />
      </div>
      <div className="marketing-visual__card marketing-visual__card--accent">
        <div className="marketing-visual__pulse" />
        <span>Payroll run</span>
        <strong>Ready · PF & ESI ✓</strong>
      </div>
      <svg className="marketing-visual__svg" viewBox="0 0 320 200" fill="none">
        <circle cx="160" cy="100" r="70" stroke="rgba(30,42,120,0.12)" strokeWidth="2" className="marketing-visual__ring" />
        <circle cx="160" cy="100" r="48" stroke="rgba(255,109,0,0.20)" strokeWidth="2" strokeDasharray="8 6" className="marketing-visual__ring-slow" />
        <circle cx="160" cy="42" r="8" fill="#FF6D00" className="marketing-visual__orbit-dot" />
      </svg>
    </div>
  );
}

function FinanceHeroVisual() {
  return (
    <div className="marketing-visual marketing-visual--finance" aria-hidden>
      <div className="marketing-visual__card marketing-visual__card--float">
        <div className="marketing-visual__row"><span>Receivables</span><strong>₹ 12.4L</strong></div>
      </div>
      <div className="marketing-visual__card marketing-visual__card--float-delay">
        <div className="marketing-visual__row"><span>GST this month</span><strong>₹ 1.8L</strong></div>
      </div>
      <div className="marketing-visual__chart">
        {[65, 42, 78, 55, 88, 70].map((h, i) => (
          <div key={i} className="marketing-visual__chart-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div className="marketing-visual__card marketing-visual__card--accent marketing-visual__card--green">
        <span>Bank reco</span>
        <strong>Matched 100%</strong>
      </div>
    </div>
  );
}

function MobileHeroVisual() {
  return (
    <div className="marketing-visual marketing-visual--mobile" aria-hidden>
      <div className="marketing-phone marketing-phone--hero">
        <div className="marketing-phone__notch" />
        <div className="marketing-phone__screen">
          <div className="marketing-phone__map">
            <div className="marketing-phone__map-pin" />
            <div className="marketing-phone__map-ring" />
          </div>
          <div className="marketing-phone__punch-btn">Punch In</div>
          <div className="marketing-phone__mini">GPS verified · 09:02 AM</div>
        </div>
      </div>
    </div>
  );
}

export function PlatformHeroVisual() {
  return (
    <div className="marketing-visual marketing-visual--platform" aria-hidden>
      <div className="marketing-visual__hub">AI</div>
      {['HRMS', 'Payroll', 'Finance', 'GST', 'Mobile'].map((label, i) => (
        <div
          key={label}
          className="marketing-visual__satellite"
          style={{ transform: `rotate(${i * 72}deg) translateY(-90px)` }}
        >
          <span style={{ transform: `rotate(${-i * 72}deg)` }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function ProductCardVisual({ imageKey }: { imageKey: MarketingImageKey }) {
  return (
    <div className="marketing-card-visual marketing-card-visual--photo">
      <MarketingImageFrame imageKey={imageKey} variant="card" aspect="16/10" className="marketing-card-visual__frame" />
    </div>
  );
}
