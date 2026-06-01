import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVisibility } from '@/hooks/useVisibility';

/**
 * On a hidden → visible transition, immediately refetch the **active + stale**
 * queries so polling surfaces (tasks, audit feed, case detail, chain…) are fresh
 * the instant the user returns — instead of waiting up to a full poll interval.
 *
 * Why this and not `refetchOnWindowFocus`: that fires on every window focus
 * (e.g. alt-tabbing back to an already-visible tab, clicking into devtools),
 * which is noisier and harder to budget. Gating on real tab-visibility +
 * `stale: true` keeps us well under the 100 req/60s gateway limit while still
 * feeling live. Background polling stays paused via each query's
 * `refetchIntervalInBackground: false`.
 */
export function VisibilityRefetcher() {
  const visible = useVisibility();
  const qc = useQueryClient();
  const wasVisible = useRef(visible);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      void qc.refetchQueries({ type: 'active', stale: true });
    }
    wasVisible.current = visible;
  }, [visible, qc]);

  return null;
}
