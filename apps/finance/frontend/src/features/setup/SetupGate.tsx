import { useState } from 'react';
import { useSetupStatus } from '@/features/masters/api';
import SetupWizard from './SetupWizard';

/**
 * Forced first-run gate. While the workspace's company is not setup_complete,
 * the admin sees ONLY the setup wizard; once complete the real app renders.
 * A local override lets the wizard's onComplete unlock immediately without a
 * refetch race.
 */
export default function SetupGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError, isFetching, refetch } = useSetupStatus();
  const [doneLocally, setDoneLocally] = useState(false);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-50 text-ink-400">Loading…</div>;
  }
  // Setup is compulsory, so fail CLOSED: if the status check fails we must not
  // let the product render (the server enforces this too — data calls 403 with
  // setup_required until setup is done). Offer a retry so a transient blip
  // doesn't permanently trap the user.
  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-50 text-ink-500">
        <p className="text-sm">Couldn't load your setup status.</p>
        <button className="btn-primary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  if (data && !data.setup_complete && !doneLocally) {
    return <SetupWizard onComplete={() => setDoneLocally(true)} />;
  }
  return <>{children}</>;
}
