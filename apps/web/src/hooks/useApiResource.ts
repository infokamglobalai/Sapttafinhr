import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Minimal GET hook for FIN tenant resources. Handles DRF's paginated
 * (`{count, results}`) and plain-array/object responses. Auth + token refresh
 * are handled inside the api client.
 */
export function useApiResource<T = unknown>(path: string | null): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!path, error: null });

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    api
      .get<T>(path)
      .then(data => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.status === 401
              ? 'Not signed in.'
              : err.message
            : 'Network error — is the backend running?';
        setState({ data: null, loading: false, error: msg });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

/** Pull `results` out of a DRF page, or pass through an array. */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as any).results as T[];
  }
  return [];
}

/** DRF page total if present, else array length. */
export function asCount(data: unknown): number {
  if (data && typeof data === 'object' && typeof (data as any).count === 'number') {
    return (data as any).count;
  }
  return asList(data).length;
}
