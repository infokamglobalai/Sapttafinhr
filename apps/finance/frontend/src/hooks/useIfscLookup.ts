import { useEffect, useRef, useState } from 'react';
import {
  type IfscDetails,
  lookupIfsc,
  sanitizeIfscInput,
  validateIfscFormat,
} from '@/lib/ifscLookup';

export type IfscLookupStatus = 'idle' | 'typing' | 'loading' | 'found' | 'invalid' | 'error';

export function useIfscLookup(ifscInput: string, debounceMs = 400) {
  const [status, setStatus] = useState<IfscLookupStatus>('idle');
  const [details, setDetails] = useState<IfscDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const code = sanitizeIfscInput(ifscInput);
    if (!code) {
      setStatus('idle');
      setDetails(null);
      setError(null);
      return;
    }

    const formatErr = validateIfscFormat(code);
    if (formatErr) {
      setStatus(code.length >= 11 ? 'invalid' : 'typing');
      setDetails(null);
      setError(code.length >= 11 ? formatErr : null);
      return;
    }

    setStatus('loading');
    setError(null);
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      lookupIfsc(code)
        .then((data) => {
          if (id !== requestId.current) return;
          setDetails(data);
          setStatus('found');
          setError(null);
        })
        .catch((e: any) => {
          if (id !== requestId.current) return;
          setDetails(null);
          setStatus('error');
          const msg =
            e?.response?.data?.ifsc ??
            (Array.isArray(e?.response?.data?.ifsc) ? e.response.data.ifsc[0] : null) ??
            e?.message ??
            'Could not verify IFSC.';
          setError(typeof msg === 'string' ? msg : 'Could not verify IFSC.');
        });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [ifscInput, debounceMs]);

  return { status, details, error };
}
