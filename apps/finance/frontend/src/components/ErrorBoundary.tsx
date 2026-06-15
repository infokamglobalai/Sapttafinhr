import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

/**
 * Catches render-time errors so a single bad component shows a recoverable
 * fallback instead of a blank screen. Logs (and forwards to Sentry if present)
 * for prod-readiness — see M2 in the audit plan.
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Something went wrong</h1>
        <p className="max-w-md text-sm text-slate-500">
          An unexpected error occurred. Please reload — if it persists, contact support.
        </p>
        <button onClick={() => window.location.reload()}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          Reload
        </button>
      </div>
    );
  }
}
