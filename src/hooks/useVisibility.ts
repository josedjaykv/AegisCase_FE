import { useEffect, useState } from 'react';

/**
 * Tracks whether the tab is currently visible (`document.visibilityState`).
 * SSR-safe (defaults to `true`). Polling queries already pause in the
 * background via `refetchIntervalInBackground: false`; this hook is the explicit
 * signal used to refresh active queries the moment the tab regains focus
 * (see <VisibilityRefetcher>), since `refetchOnWindowFocus` is disabled globally.
 */
export function useVisibility(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}
