import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/auth/usePermissions';
import { useChangeCaseStatusMutation } from '@/services/cases/cases.queries';
import { CASE_STATUSES, type Case, type CaseStatus } from '@/services/cases/cases.types';
import { isNormalizedApiError } from '@/services/http/errors';

const LABEL: Record<CaseStatus, string> = {
  OPEN: 'Open',
  UNDER_INVESTIGATION: 'Under investigation',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
};

export function CaseStatusPicker({ caseItem }: { caseItem: Case }) {
  const { can, role } = usePermissions();
  const mutation = useChangeCaseStatusMutation(caseItem.id);

  // Only ADMIN/DETECTIVE may change status at all.
  if (!can('case.changeStatus')) {
    return null;
  }

  const isClosed = caseItem.status === 'CLOSED';
  const isAdmin = role === 'ADMIN';
  // A CLOSED case can only be moved by an ADMIN (reopen). Backend 403s as a
  // safety net; here we disable the control to keep the UI honest.
  const locked = caseItem.archived || (isClosed && !isAdmin);

  const onChange = async (next: string) => {
    if (next === caseItem.status) return;
    try {
      await mutation.mutateAsync({ status: next as CaseStatus });
      toast.success(`Status changed to ${LABEL[next as CaseStatus]}`);
    } catch (err) {
      if (isNormalizedApiError(err) && err.status !== 403) {
        // 403 is already surfaced by the axios interceptor toast.
        toast.error(err.message);
      }
    }
  };

  return (
    <div className="space-y-1">
      <Select value={caseItem.status} onValueChange={onChange} disabled={locked || mutation.isPending}>
        <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Change case status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CASE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isClosed && !isAdmin && !caseItem.archived && (
        <p className="text-xs text-muted-foreground">Only an admin can reopen a closed case.</p>
      )}
    </div>
  );
}
