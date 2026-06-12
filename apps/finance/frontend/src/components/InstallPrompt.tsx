import { useEffect, useState } from 'react';
import { X, Download, Monitor } from 'lucide-react';

interface Props {
  appName: string;
  color: string;
}

let _deferred: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferred = e;
});

export default function InstallPrompt({ appName, color }: Props) {
  const [ready, setReady] = useState(!!_deferred);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { (e as any).preventDefault(); _deferred = e; setReady(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setInstalled(true));
    // If already installed as PWA, don't show the prompt.
    if (window.matchMedia('(display-mode: standalone)').matches) setDismissed(true);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!_deferred) return;
    _deferred.prompt();
    const { outcome } = await _deferred.userChoice;
    if (outcome === 'accepted') { _deferred = null; setInstalled(true); }
  };

  if (dismissed || installed) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#fff',
      borderBottom: `3px solid ${color}`,
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
      }}>
        <Monitor size={20} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
          Install {appName} as a Desktop App
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          Works offline, opens instantly — no browser tab needed.
        </div>
      </div>

      {/* Actions */}
      {ready ? (
        <button
          onClick={install}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: color, color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Download size={14} /> Install
        </button>
      ) : (
        <div style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>
          Use the browser's <strong>Install</strong> button (⊕) in the address bar.
        </div>
      )}

      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, flexShrink: 0 }}
        title="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
