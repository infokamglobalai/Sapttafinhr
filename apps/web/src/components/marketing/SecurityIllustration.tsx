/** Isometric security visual for home page — Saptta brand */

const floatIcons = [
  { label: 'TLS', top: '8%', left: '6%', delay: '0s', color: '#6C3BFF' },
  { label: 'RBAC', top: '18%', right: '4%', delay: '0.6s', color: '#2563EB' },
  { label: 'Audit', bottom: '28%', left: '2%', delay: '1.2s', color: '#2BB673' },
  { label: 'PF/GST', bottom: '12%', right: '8%', delay: '0.9s', color: '#1E2A78' },
];

export default function SecurityIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`security-iso${compact ? ' security-iso--compact' : ''}`} aria-hidden>
      <div className="security-iso__grid" />
      <div className="security-iso__glow" />

      {floatIcons.map((icon) => (
        <div
          key={icon.label}
          className="security-iso__float"
          style={{
            top: icon.top,
            left: icon.left,
            right: icon.right,
            bottom: icon.bottom,
            animationDelay: icon.delay,
            borderColor: `${icon.color}33`,
            color: icon.color,
          }}
        >
          <span className="security-iso__float-dot" style={{ background: icon.color }} />
          {icon.label}
        </div>
      ))}

      <div className="security-iso__scene">
        <div className="security-iso__cloud">
          <div className="security-iso__cloud-inner">
            <div className="security-iso__shield">
              <svg viewBox="0 0 64 72" width="56" height="64" fill="none">
                <path
                  d="M32 4 L58 16 V38 C58 52 46 64 32 68 C18 64 6 52 6 38 V16 Z"
                  fill="url(#shieldGrad)"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                />
                <path d="M26 38 L22 34 L28 28 L32 32 L42 22 L46 26 Z" fill="#fff" />
                <defs>
                  <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="security-iso__lock-row">
              <span className="security-iso__lock-pill">Encrypted</span>
              <span className="security-iso__lock-pill">India data residency</span>
            </div>
          </div>
        </div>

        <div className="security-iso__person">
          <div className="security-iso__person-head" />
          <div className="security-iso__person-body" />
          <div className="security-iso__key" />
        </div>

        <div className="security-iso__base" />
      </div>

      <div className="security-iso__orbit security-iso__orbit--1" />
      <div className="security-iso__orbit security-iso__orbit--2" />
    </div>
  );
}
