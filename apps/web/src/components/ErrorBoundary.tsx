import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

/**
 * Catches render-time errors so a single bad component shows a recoverable
 * fallback instead of a blank white screen. Errors are logged (and forwarded to
 * Sentry if the SDK is present) for prod-readiness — see M2 in the audit plan.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
    (window as unknown as { Sentry?: { captureException: (e: unknown) => void } }).Sentry?.captureException(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#FAFAFC', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A1128' }}>Something went wrong</h1>
        <p style={{ color: 'rgba(10,17,40,0.55)', fontSize: 14, maxWidth: 420 }}>
          An unexpected error occurred. Please reload the page — if it keeps happening, contact support.
        </p>
        <button onClick={() => window.location.reload()}
          style={{ padding: '11px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#FF9800,#FF6D00)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
          Reload
        </button>
      </div>
    );
  }
}
