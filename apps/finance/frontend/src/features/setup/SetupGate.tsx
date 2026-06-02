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
  const { data, isLoading, isError } = useSetupStatus();
  const [doneLocally, setDoneLocally] = useState(false);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }
  // If the status check fails (e.g. transient), don't trap the user — let the app
  // render; the in-app profile banner still nudges them.
  if (isError) return <>{children}</>;

  if (data && !data.setup_complete && !doneLocally) {
    return <SetupWizard onComplete={() => setDoneLocally(true)} />;
  }
  return <>{children}</>;
}
