import { Loader2 } from 'lucide-react';

/** Lightweight fallback shown while a lazily-loaded route chunk is fetched. */
export function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
