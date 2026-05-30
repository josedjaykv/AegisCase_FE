import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Task } from '@/services/tasks/tasks.types';

/**
 * Toasts when a task newly flips to OVERDUE between renders/polls. The OVERDUE
 * sweep happens server-side on every GET /tasks; this surfaces it to the user.
 */
export function useOverdueNotifier(tasks: Task[] | undefined) {
  const seen = useRef<Map<string, string>>(new Map());
  const primed = useRef(false);

  useEffect(() => {
    if (!tasks) return;
    const next = new Map<string, string>();
    const newlyOverdue: Task[] = [];
    for (const t of tasks) {
      const prev = seen.current.get(t.id);
      if (primed.current && t.status === 'OVERDUE' && prev && prev !== 'OVERDUE') {
        newlyOverdue.push(t);
      }
      next.set(t.id, t.status);
    }
    seen.current = next;

    if (!primed.current) {
      primed.current = true; // don't toast on first load, only on later flips
      return;
    }
    if (newlyOverdue.length === 1) {
      toast.warning(`Task overdue: ${newlyOverdue[0]!.title}`);
    } else if (newlyOverdue.length > 1) {
      toast.warning(`${newlyOverdue.length} tasks just became overdue`);
    }
  }, [tasks]);
}
